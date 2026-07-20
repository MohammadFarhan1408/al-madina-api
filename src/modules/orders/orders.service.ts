import { ordersRepository } from './orders.repository';
import { productsRepository } from '../products/products.repository';
import { resolveLinePricing } from '../products/products.service';
import { couponsService } from '../coupons/coupons.service';
import { paymentsService } from '../payments/payments.service';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { generateOrderReference } from '../../utils/order-reference';
import {
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING_FEE,
  EXPRESS_DELIVERY_FEE,
} from '../../constants/business';
import { logger } from '../../config/logger';
import { queueEmail } from '../../jobs/queues/email.queue';
import { queueNotification } from '../../jobs/queues/notification.queue';
import { queuePush } from '../../jobs/queues/push.queue';
import type { CreateOrderInput, ListOrdersQuery } from './orders.schema';
import type { AuthUser } from '../../types/api.types';
import type { IOrder, IOrderItem } from '../../database/models';
import type { DeliveryMethod, OrderStatus } from '../../constants/business';

/**
 * Compute base shipping (§7 Shipping): free when subtotal ≥ 250 AED (or 0),
 * else 20 AED flat; express adds 30 AED on top.
 */
export function computeShipping(subtotal: number, deliveryMethod: DeliveryMethod): number {
  const base = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
  const express = deliveryMethod === 'express' ? EXPRESS_DELIVERY_FEE : 0;
  return base + express;
}

export const ordersService = {
  /**
   * Place an order (§ POST /orders). Validates each product exists and is in
   * stock, snapshots price/name/image at purchase time, computes totals
   * server-side (never trusting client prices), and persists.
   */
  async create(input: CreateOrderInput, user?: AuthUser): Promise<IOrder> {
    if (!user && !input.guestEmail) {
      throw ApiError.badRequest('guestEmail is required for guest checkout', ERROR_CODES.VALIDATION_ERROR);
    }

    // Idempotent replay: a retried POST /orders with the same key returns the
    // order already created by the first attempt instead of duplicating it.
    if (input.idempotencyKey) {
      const existing = await ordersRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return existing;
    }

    // Resolve products and build snapshotted line items.
    const productIds = input.items.map((i) => i.productId);
    const products = await productsRepository.findByIds(productIds);
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const items: IOrderItem[] = [];
    let subtotal = 0;

    for (const line of input.items) {
      const product = productMap.get(line.productId);
      if (!product) {
        throw ApiError.notFound(`Product ${line.productId} not found`, ERROR_CODES.PRODUCT_NOT_FOUND);
      }
      const { price, inStock } = resolveLinePricing(product, line.volumeMl);
      if (!inStock) {
        throw ApiError.conflict(
          `Product "${product.name}" is out of stock`,
          ERROR_CODES.PRODUCT_OUT_OF_STOCK,
        );
      }
      const lineTotal = price * line.quantity;
      subtotal += lineTotal;
      items.push({
        productId: product._id,
        productName: product.name,
        productImage: product.images[0] ?? '',
        price,
        quantity: line.quantity,
        volumeMl: line.volumeMl ?? product.volumeMl,
      });
    }

    const shipping = computeShipping(subtotal, input.deliveryMethod);

    // Coupon discount — validated and computed server-side against the
    // just-resolved subtotal; never trust a client-supplied discount amount.
    let discountAmount = 0;
    let couponCode: string | undefined;
    if (input.couponCode) {
      const coupon = await couponsService.validateForSubtotal(input.couponCode, subtotal);
      discountAmount = couponsService.computeDiscount(coupon, subtotal);
      couponCode = coupon.code;
    }

    const total = subtotal + shipping - discountAmount;
    const reference = await generateOrderReference();

    const order = await ordersRepository.create({
      reference,
      userId: user?.id ?? null,
      guestEmail: user ? undefined : input.guestEmail,
      shippingAddress: input.shippingAddress,
      deliveryMethod: input.deliveryMethod,
      paymentMethod: input.paymentMethod,
      items,
      subtotal,
      shipping,
      total,
      couponCode,
      discountAmount,
      idempotencyKey: input.idempotencyKey,
    });

    // First payment attempt — COD stays 'pending' until delivery is confirmed,
    // card/wallet go 'processing' until the (simulated) gateway calls back.
    // Reuses the order's own idempotencyKey so a retried POST /orders can't
    // create a second transaction either.
    await paymentsService.initiateForOrder(order, input.idempotencyKey ?? order._id.toString());
    // initiateForOrder updates paymentStatus via a separate write — reload so
    // the response reflects it (e.g. card/wallet -> 'processing').
    const settledOrder = (await ordersRepository.findById(order._id.toString())) ?? order;

    logger.info({ reference, total, userId: user?.id ?? 'guest' }, 'Order placed');

    // Order confirmation email (to user or guest) + in-app notification.
    const email = user?.email ?? input.guestEmail;
    if (email) {
      void queueEmail({ type: 'order-confirmation', to: email, reference, total, currency: order.currency });
    }
    if (user) {
      void queueNotification({
        userId: user.id,
        kind: 'order',
        title: 'Order confirmed',
        body: `Your order ${reference} is being processed.`,
        metadata: { orderId: order._id.toString(), reference },
      });
    }
    return settledOrder;
  },

  /** GET /orders — authenticated user's order history. */
  list(userId: string, query: ListOrdersQuery) {
    return ordersRepository.listByUser(userId, query.page, query.limit, query.status);
  },

  /**
   * GET /orders/:id — owner (by userId) or guest (by reference + email).
   */
  async getById(id: string, user?: AuthUser, guestEmail?: string): Promise<IOrder> {
    const order = await ordersRepository.findById(id);
    if (!order) {
      throw ApiError.notFound('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    const isOwner = user && order.userId?.toString() === user.id;
    const isGuestMatch =
      !order.userId && guestEmail && order.guestEmail === guestEmail.toLowerCase();

    if (!isOwner && !isGuestMatch && user?.role !== 'admin') {
      throw ApiError.forbidden('You do not have access to this order', ERROR_CODES.FORBIDDEN);
    }
    return order;
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────

  listAll(query: ListOrdersQuery & { from?: Date; to?: Date }) {
    return ordersRepository.listAll(query.page, query.limit, {
      status: query.status,
      from: query.from,
      to: query.to,
    });
  },

  async updateStatus(id: string, status: OrderStatus): Promise<IOrder> {
    let order = await ordersRepository.updateStatus(id, status);
    if (!order) {
      throw ApiError.notFound('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }
    logger.info({ orderId: id, status }, 'Order status updated');

    // COD has no gateway callback — delivery confirmation is the only signal
    // that cash actually changed hands, so that's when payment settles.
    if (status === 'delivered') {
      await paymentsService.confirmCodDelivery(id);
      order = (await ordersRepository.findById(id)) ?? order;
    }

    // Notify the order owner of the status change.
    const recipientEmail = order.guestEmail;
    if (status === 'shipped' && recipientEmail) {
      void queueEmail({ type: 'shipping-update', to: recipientEmail, reference: order.reference, status });
    }
    if (order.userId) {
      void queueNotification({
        userId: order.userId.toString(),
        kind: 'order',
        title: `Order ${order.reference} ${status}`,
        body: `Your order is now ${status}.`,
        metadata: { orderId: id, reference: order.reference },
      });
      void queuePush({ type: 'order-update', userId: order.userId.toString(), reference: order.reference, status });
    }
    return order;
  },
};
