import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

export interface ICartItem {
  productId: Types.ObjectId;
  quantity: number;
  volumeMl: number;
  addedAt: Date;
}

export interface ICart extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    volumeMl: { type: Number, required: true, min: 0 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
  },
  baseSchemaOptions,
);

export const Cart = model<ICart>('Cart', cartSchema);
