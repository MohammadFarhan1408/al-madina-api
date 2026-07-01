import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

export interface IReview extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  author: string;
  avatar?: string;
  rating: number;
  title: string;
  body: string;
  date: Date;
  verified: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    // Nullable: preserved (SET NULL) when a user is removed (§11 Cascade Rules).
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    author: { type: String, required: true, trim: true },
    avatar: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    date: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null, index: true },
  },
  baseSchemaOptions,
);

export const Review = model<IReview>('Review', reviewSchema);
