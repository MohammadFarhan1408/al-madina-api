import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

export interface IAddress extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  label?: string;
  fullName: string;
  phone: string;
  addressLine: string;
  country: string;
  state?: string;
  city: string;
  postalCode?: string;
  landmark?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, trim: true },
    landmark: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

export const Address = model<IAddress>('Address', addressSchema);
