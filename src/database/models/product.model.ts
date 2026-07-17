import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';
import {
  SCENT_FAMILIES,
  PRODUCT_BADGES,
  DEFAULT_CURRENCY,
  PRODUCT_VARIANT_SIZES_ML,
  type ScentFamily,
  type ProductBadge,
} from '../../constants/business';

export interface IProductVariant {
  volumeMl: number;
  price: number;
  sku: string;
  barcode?: string;
  stock: number;
  inStock: boolean;
}

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  nameAr?: string;
  brand: string;
  categoryId: Types.ObjectId;
  description: string;
  notes: string[];
  scentFamily: ScentFamily;
  volumeMl: number;
  price: number;
  originalPrice?: number;
  currency: string;
  images: string[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  badge?: ProductBadge;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isSignature: boolean;
  isSeasonal: boolean;
  variants: IProductVariant[];
  tagIds: Types.ObjectId[];
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const productVariantSchema = new Schema<IProductVariant>(
  {
    volumeMl: { type: Number, required: true, enum: PRODUCT_VARIANT_SIZES_ML },
    price: { type: Number, required: true, min: 0 },
    // Not `unique: true` — that builds a single collection-wide index on
    // `variants.sku` that collides once two products both have an empty
    // `variants` array (both index as null). SKU uniqueness within a
    // product's own variants is enforced at the application layer instead.
    sku: { type: String, required: true, trim: true, uppercase: true },
    barcode: { type: String, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    inStock: { type: Boolean, default: true },
  },
  { _id: false },
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    brand: { type: String, required: true, trim: true, default: 'Al Madina' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    description: { type: String, required: true },
    notes: { type: [String], default: [] },
    scentFamily: { type: String, enum: SCENT_FAMILIES, required: true, index: true },
    volumeMl: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    currency: { type: String, default: DEFAULT_CURRENCY, maxlength: 3 },
    images: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    inStock: { type: Boolean, default: true, index: true },
    badge: { type: String, enum: PRODUCT_BADGES },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isSignature: { type: Boolean, default: false },
    isSeasonal: { type: Boolean, default: false },
    variants: { type: [productVariantSchema], default: [] },
    tagIds: { type: [Schema.Types.ObjectId], ref: 'Tag', default: [] },
    slug: { type: String, unique: true, sparse: true, trim: true, index: true },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    metaKeywords: { type: [String], default: undefined },
    deletedAt: { type: Date, default: null, index: true },
  },
  baseSchemaOptions,
);

// Compound index covering the home-rail flag queries (§19 Database indexes).
productSchema.index({
  isFeatured: 1,
  isNewArrival: 1,
  isBestSeller: 1,
  isSignature: 1,
  isSeasonal: 1,
});

// Full-text search index replacing PostgreSQL GIN (§16 Full-Text Search).
// Weighted so name matches rank above brand/notes/description.
productSchema.index(
  { name: 'text', brand: 'text', notes: 'text', description: 'text' },
  { weights: { name: 10, brand: 5, notes: 3, description: 1 }, name: 'product_text_search' },
);

export const Product = model<IProduct>('Product', productSchema);
