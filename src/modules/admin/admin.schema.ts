import { z } from 'zod';
import { Types } from 'mongoose';
import {
  SCENT_FAMILIES,
  PRODUCT_BADGES,
  COLLECTION_ACCENTS,
  ORDER_STATUSES,
  USER_TIERS,
  NOTIFICATION_KINDS,
  PAGINATION,
} from '../../constants/business';

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid id' });

// ─── Products ──────────────────────────────────────────────────────────────────
export const createProductSchema = z.object({
  name: z.string().trim().min(2),
  nameAr: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  categoryId: objectId,
  description: z.string().trim().min(5),
  notes: z.array(z.string()).default([]),
  scentFamily: z.enum(SCENT_FAMILIES),
  volumeMl: z.coerce.number().int().min(0),
  price: z.coerce.number().min(0),
  originalPrice: z.coerce.number().min(0).optional(),
  images: z.array(z.string().url()).default([]),
  inStock: z.boolean().optional(),
  badge: z.enum(PRODUCT_BADGES).optional(),
  isFeatured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isSignature: z.boolean().optional(),
  isSeasonal: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'No fields to update' },
);

// ─── Categories ────────────────────────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().trim().min(2),
  tagline: z.string().trim().optional(),
  image: z.string().url(),
  sortOrder: z.coerce.number().int().optional(),
});
export const updateCategorySchema = createCategorySchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'No fields to update' },
);

// ─── Collections ───────────────────────────────────────────────────────────────
export const createCollectionSchema = z.object({
  title: z.string().trim().min(2),
  subtitle: z.string().trim().min(2),
  image: z.string().url(),
  accent: z.enum(COLLECTION_ACCENTS),
  productIds: z.array(objectId).default([]),
  sortOrder: z.coerce.number().int().optional(),
});
export const updateCollectionSchema = createCollectionSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'No fields to update' },
);
export const collectionProductSchema = z.object({ productId: objectId });

const sortOrderSchema = z.enum(['asc', 'desc']).optional().default('desc');

// ─── Orders ────────────────────────────────────────────────────────────────────
export const updateOrderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) });
export const adminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
  status: z.enum(ORDER_STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(['reference', 'placedAt', 'total', 'status']).optional().default('placedAt'),
  sortOrder: sortOrderSchema,
});

// ─── Customers ─────────────────────────────────────────────────────────────────
export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
  tier: z.enum(USER_TIERS).optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(['fullName', 'email', 'tier', 'memberSince']).optional().default('memberSince'),
  sortOrder: sortOrderSchema,
});
export const updateTierSchema = z.object({ tier: z.enum(USER_TIERS) });

// ─── Notifications broadcast ─────────────────────────────────────────────────────
export const broadcastSchema = z.object({
  kind: z.enum(NOTIFICATION_KINDS).default('promo'),
  title: z.string().trim().min(2),
  body: z.string().trim().min(2),
  tier: z.enum(USER_TIERS).optional(), // segment target; omit = all users
});

export const notificationHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
});

// ─── Reviews ───────────────────────────────────────────────────────────────────
export const adminReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sortBy: z.enum(['rating', 'date']).optional().default('date'),
  sortOrder: sortOrderSchema,
});

// ─── Upload ────────────────────────────────────────────────────────────────────
export const uploadQuerySchema = z.object({
  type: z.enum(['product', 'avatar', 'category', 'collection']).default('product'),
});
