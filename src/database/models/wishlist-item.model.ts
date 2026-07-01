import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

export interface IWishlistItem extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const wishlistItemSchema = new Schema<IWishlistItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  baseSchemaOptions,
);

// One row per (user, product) — prevents duplicate wishlist entries (§11).
wishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const WishlistItem = model<IWishlistItem>('WishlistItem', wishlistItemSchema);
