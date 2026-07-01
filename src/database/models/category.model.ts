import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  tagline?: string;
  image: string;
  productCount: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    tagline: { type: String, trim: true },
    image: { type: String, required: true },
    productCount: { type: Number, default: 0, min: 0 },
    sortOrder: { type: Number, default: 0, index: true },
  },
  baseSchemaOptions,
);

export const Category = model<ICategory>('Category', categorySchema);
