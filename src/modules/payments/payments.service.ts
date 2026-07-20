import { paymentsRepository } from './payments.repository';
import { ordersRepository } from '../orders/orders.repository';
import { couponsRepository } from '../coupons/coupons.repository';
import { paymentProviders, providerForMethod } from './providers';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { queueNotification } from '../../jobs/queues/notification.queue';
import type { IOrder, ITransaction } from '../../database/models';
import type { PaymentStatus, TransactionStatus } from '../../constants/business';

/** Maps a transaction's per-attempt status to the order-level paymentStatus. */
function toPaymentStatus(status: TransactionStatus): PaymentStatus {
  if (status === 'succeeded') return 'paid';
  return status;
}

/** Coupon usage is only burned once payment actually settles, so a failed or
 * never-paid COD order doesn't consume a single-use coupon. */
async function settleOrderPaid(order: IOrder): Promise<void> {
  if (order.couponCode) {
    await couponsRepository.incrementUsage(order.couponCode);
  }
}

export const paymentsService = {
  /** Creates the first transaction for a freshly-created order. Idempotent on
   * `idempotencyKey` — a retried request with the same key returns the
   * existing transaction instead of charging twice. */
  async initiateForOrder(order: IOrder, idempotencyKey: string): Promise<ITransaction> {
    const existing = await paymentsRepository.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const provider = providerForMethod(order.paymentMethod);
    const result = await paymentProviders[provider].initiate({
      orderId: order._id.toString(),
      amount: order.total,
      currency: order.currency,
      idempotencyKey,
    });

    const transaction = await paymentsRepository.create({
      orderId: order._id.toString(),
      provider,
      status: result.status,
      amount: order.total,
      currency: order.currency,
      idempotencyKey,
      providerReference: result.providerReference,
      metadata: result.metadata,
    });

    await ordersRepository.updatePaymentStatus(order._id.toString(), toPaymentStatus(result.status));
    return transaction;
  },

  /** POST /orders/:id/payments/retry — only when the latest attempt failed or
   * was cancelled; creates a new Transaction, preserving attempt history. */
  async retryPayment(orderId: string, idempotencyKey: string): Promise<ITransaction> {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw ApiError.notFound('Order not found', ERROR_CODES.ORDER_NOT_FOUND);

    const existing = await paymentsRepository.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const latest = await paymentsRepository.findLatestByOrder(orderId);
    if (!latest || (latest.status !== 'failed' && latest.status !== 'cancelled')) {
      throw ApiError.conflict(
        'Payment can only be retried after it has failed or been cancelled',
        ERROR_CODES.PAYMENT_RETRY_NOT_ALLOWED,
      );
    }

    const provider = providerForMethod(order.paymentMethod);
    const result = await paymentProviders[provider].initiate({
      orderId,
      amount: order.total,
      currency: order.currency,
      idempotencyKey,
    });

    const transaction = await paymentsRepository.create({
      orderId,
      provider,
      status: result.status,
      amount: order.total,
      currency: order.currency,
      idempotencyKey,
      providerReference: result.providerReference,
      metadata: result.metadata,
    });

    await ordersRepository.updatePaymentStatus(orderId, toPaymentStatus(result.status));
    return transaction;
  },

  /** POST /payments/callback — the simulated gateway's webhook stand-in.
   * Rejects replays against an already-settled transaction, which is also
   * what keeps coupon usageCount from double-incrementing. */
  async handleSimulatedCallback(
    transactionId: string,
    status: 'succeeded' | 'failed',
    providerReference?: string,
  ): Promise<ITransaction> {
    const transaction = await paymentsRepository.findById(transactionId);
    if (!transaction) {
      throw ApiError.notFound('Transaction not found', ERROR_CODES.TRANSACTION_NOT_FOUND);
    }
    if (transaction.status !== 'pending' && transaction.status !== 'processing') {
      throw ApiError.conflict('Transaction already settled', ERROR_CODES.PAYMENT_ALREADY_SETTLED);
    }

    const updated = await paymentsRepository.updateStatus(transactionId, status, {
      providerReference: providerReference ?? transaction.providerReference,
      failureReason: status === 'failed' ? 'Payment declined by gateway' : undefined,
    });
    if (!updated) throw ApiError.notFound('Transaction not found', ERROR_CODES.TRANSACTION_NOT_FOUND);

    const order = await ordersRepository.findById(transaction.orderId.toString());
    if (order) {
      await ordersRepository.updatePaymentStatus(order._id.toString(), toPaymentStatus(status));
      if (status === 'succeeded') {
        await settleOrderPaid(order);
        if (order.userId) {
          void queueNotification({
            userId: order.userId.toString(),
            kind: 'order',
            title: 'Payment received',
            body: `Payment for order ${order.reference} was successful.`,
            metadata: { orderId: order._id.toString(), reference: order.reference },
          });
        }
      }
    }
    return updated;
  },

  /** Called from orders.service.updateStatus when an admin marks a COD order
   * 'delivered' — that's the only confirmation COD ever gets (no gateway). */
  async confirmCodDelivery(orderId: string): Promise<void> {
    const transaction = await paymentsRepository.findLatestByOrder(orderId);
    if (!transaction || transaction.provider !== 'cod' || transaction.status !== 'pending') return;

    await paymentsRepository.updateStatus(transaction._id.toString(), 'succeeded');
    await ordersRepository.updatePaymentStatus(orderId, 'paid');
    const order = await ordersRepository.findById(orderId);
    if (order) await settleOrderPaid(order);
  },

  /** Admin-triggered refund — only a settled ('succeeded') transaction can be refunded. */
  async refund(transactionId: string): Promise<ITransaction> {
    const transaction = await paymentsRepository.findById(transactionId);
    if (!transaction) throw ApiError.notFound('Transaction not found', ERROR_CODES.TRANSACTION_NOT_FOUND);
    if (transaction.status !== 'succeeded') {
      throw ApiError.conflict('Only a succeeded payment can be refunded', ERROR_CODES.PAYMENT_NOT_REFUNDABLE);
    }

    const result = await paymentProviders[transaction.provider].refund(transaction);
    const updated = await paymentsRepository.updateStatus(transactionId, result.status);
    if (!updated) throw ApiError.notFound('Transaction not found', ERROR_CODES.TRANSACTION_NOT_FOUND);

    await ordersRepository.updatePaymentStatus(transaction.orderId.toString(), toPaymentStatus(result.status));
    return updated;
  },

  listForOrder(orderId: string): Promise<ITransaction[]> {
    return paymentsRepository.listByOrder(orderId);
  },
};
