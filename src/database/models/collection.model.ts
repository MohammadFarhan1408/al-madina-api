import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';
import { COLLECTION_ACCENTS, type CollectionAccent } from '../../constants/business';

/**
 * The spec's `collection_products` junction table is modelled as an ordered
 * array of product references, which is idiomatic in MongoDB and avoids a
 * separate join collection. `sortOrder` of each membership is preserved by
 * array position.
 */
export interface ICollection extends Document {
  _id: Types.ObjectId;
  title: string;
  subtitle: string;
  image: string;
  accent: CollectionAccent;
  productIds: Types.ObjectId[];
  productCount: number;
  sortOrder: number;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    accent: { type: String, enum: COLLECTION_ACCENTS, required: true },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product', index: true }],
    productCount: { type: Number, default: 0, min: 0 },
    sortOrder: { type: Number, default: 0, index: true },
    slug: { type: String, unique: true, sparse: true, trim: true, index: true },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    metaKeywords: { type: [String], default: undefined },
  },
  baseSchemaOptions,
);

// Keep the denormalised count in sync on save.
collectionSchema.pre('save', function syncProductCount(next) {
  this.productCount = this.productIds.length;
  next();
});

export const Collection = model<ICollection>('Collection', collectionSchema);
