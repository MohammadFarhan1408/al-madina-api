import { z } from 'zod';
import { DISCOUNT_TYPES, PAGINATION } from '../../constants/business';

export const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(24),
  description: z.string().trim().min(2),
  discountType: z.enum(DISCOUNT_TYPES),
  value: z.coerce.number().min(0),
  minPurchase: z.coerce.number().min(0).optional(),
  maxDiscount: z.coerce.number().min(0).optional(),
  usageLimit: z.coerce.number().int().min(0).optional(),
  expiresAt: z.coerce.date(),
  isActive: z.boolean().optional(),
});

export const updateCouponSchema = createCouponSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'No fields to update' },
);

export const adminCouponsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
  isActive: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
});
