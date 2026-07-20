import { z } from 'zod';
import { Types } from 'mongoose';
import {
  DELIVERY_METHODS,
  PAYMENT_METHODS,
  ORDER_STATUSES,
  PAGINATION,
} from '../../constants/business';

const orderItemSchema = z.object({
  productId: z.string().refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid productId' }),
  quantity: z.coerce.number().int().min(1),
  // Optional — matches cartItemSchema (cart.module.ts). Not every checkout
  // flow captures a size selection; falls back to the product's own volumeMl.
  volumeMl: z.coerce.number().int().min(0).optional(),
});

const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(5),
  address: z.string().trim().min(5),
  city: z.string().trim().min(2),
});

/** POST /orders (§10 — guest allowed via guestEmail). */
export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: shippingAddressSchema,
  deliveryMethod: z.enum(DELIVERY_METHODS),
  paymentMethod: z.enum(PAYMENT_METHODS),
  guestEmail: z.string().trim().toLowerCase().email().optional(),
  couponCode: z.string().trim().toUpperCase().optional(),
  // Client-generated, resent unchanged on retry — dedupes a double-submit
  // into a single order instead of creating two.
  idempotencyKey: z.string().uuid().optional(),
});

/** GET /orders query. */
export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
  status: z.enum(ORDER_STATUSES).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
