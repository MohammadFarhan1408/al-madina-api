/**
 * Business rules from the specification (§7 Business Logic, §1 Business Goals).
 * Centralised so pricing logic is never hard-coded in services.
 */

/** Subtotal (AED) at or above which shipping is free. */
export const FREE_SHIPPING_THRESHOLD = 250;

/** Flat shipping fee (AED) when below the free-shipping threshold. */
export const FLAT_SHIPPING_FEE = 20;

/** Additional fee (AED) charged on top of base shipping for express delivery. */
export const EXPRESS_DELIVERY_FEE = 30;

/** Default currency for all monetary values. */
export const DEFAULT_CURRENCY = 'AED';

/** Pagination defaults and ceiling (§16 Search Requirements). */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
} as const;

/** Password reset token validity window. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Trending search terms (hardcoded in v1, §16). */
export const TRENDING_SEARCH_TERMS = ['Oud', 'Rose', 'Amber', 'Saffron', 'Musk'] as const;

/** Loyalty tiers (§7 Loyalty Tiers). */
export const USER_TIERS = ['Member', 'Connoisseur', 'Maison Elite'] as const;
export type UserTier = (typeof USER_TIERS)[number];

/** Application roles (§12 Role-Based Access, §17 Roles & Permissions). */
export const USER_ROLES = ['user', 'manager', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Scent families (§9 Product data model). */
export const SCENT_FAMILIES = [
  'oud',
  'floral',
  'amber',
  'musk',
  'woody',
  'citrus',
  'spicy',
] as const;
export type ScentFamily = (typeof SCENT_FAMILIES)[number];

/** Product display badges (§7 Products). */
export const PRODUCT_BADGES = ['new', 'bestseller', 'limited', 'exclusive'] as const;
export type ProductBadge = (typeof PRODUCT_BADGES)[number];

/** Collection accent colours (§9 Collection). */
export const COLLECTION_ACCENTS = ['gold', 'emerald', 'burgundy'] as const;
export type CollectionAccent = (typeof COLLECTION_ACCENTS)[number];

/** Order status lifecycle (§7 Order Status Lifecycle). */
export const ORDER_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Delivery methods (§7 Checkout Flow). */
export const DELIVERY_METHODS = ['standard', 'express'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

/** Payment methods (§7 Checkout Flow). */
export const PAYMENT_METHODS = ['card', 'wallet', 'cod'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Notification kinds (§7 Notifications Kinds). */
export const NOTIFICATION_KINDS = ['order', 'promo', 'system', 'wishlist'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Theme modes for user preferences (§9 UserPreference). */
export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Product sort options (§16 Sorting). */
export const SORT_OPTIONS = [
  'featured',
  'price_asc',
  'price_desc',
  'rating',
  'newest',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** File upload limits (§13 File Upload Requirements). */
export const UPLOAD_LIMITS = {
  PRODUCT_MAX_BYTES: 10 * 1024 * 1024, // 10 MB
  AVATAR_MAX_BYTES: 5 * 1024 * 1024, // 5 MB
  CATEGORY_MAX_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

/** Standard bottle sizes (ml) offered as product variants. */
export const PRODUCT_VARIANT_SIZES_ML = [3, 6, 12, 30, 50, 100] as const;
export type ProductVariantSizeMl = (typeof PRODUCT_VARIANT_SIZES_ML)[number];

/** Coupon discount types. */
export const DISCOUNT_TYPES = ['percentage', 'fixed'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];
