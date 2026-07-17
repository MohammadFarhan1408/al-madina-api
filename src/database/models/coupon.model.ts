import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';
import { DEFAULT_CURRENCY, type DiscountType } from '../../constants/business';

export interface ICoupon extends Document {
  _id: Types.ObjectId;
  code: string;
  description: string;
  discountType: DiscountType;
  value: number;
  currency: string;
  minPurchase: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, required: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    currency: { type: String, default: DEFAULT_CURRENCY, maxlength: 3 },
    minPurchase: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    usageLimit: { type: Number, min: 0 },
    usageCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

export const Coupon = model<ICoupon>('Coupon', couponSchema);
