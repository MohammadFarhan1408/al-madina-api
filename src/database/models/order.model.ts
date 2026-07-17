import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';
import {
  ORDER_STATUSES,
  DELIVERY_METHODS,
  PAYMENT_METHODS,
  DEFAULT_CURRENCY,
  type OrderStatus,
  type DeliveryMethod,
  type PaymentMethod,
} from '../../constants/business';

/** Order line item — embedded as a sub-document with purchase-time snapshots. */
export interface IOrderItem {
  productId: Types.ObjectId;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  volumeMl: number;
}

/** Shipping address snapshot (the spec stores this as jsonb). */
export interface IShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  reference: string;
  userId?: Types.ObjectId | null;
  guestEmail?: string;
  status: OrderStatus;
  shippingAddress: IShippingAddress;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  items: IOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  couponCode?: string;
  discountAmount: number;
  placedAt: Date;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productImage: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    volumeMl: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    reference: { type: String, required: true, unique: true, index: true },
    // Nullable: guest orders preserved (SET NULL) if a user is removed (§11).
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    guestEmail: { type: String, lowercase: true, trim: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'processing', index: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    deliveryMethod: { type: String, enum: DELIVERY_METHODS, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    items: { type: [orderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: DEFAULT_CURRENCY, maxlength: 3 },
    couponCode: { type: String, uppercase: true, trim: true },
    discountAmount: { type: Number, default: 0, min: 0 },
    placedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null, index: true },
  },
  baseSchemaOptions,
);

export const Order = model<IOrder>('Order', orderSchema);
