import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

export interface ITag extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
  },
  baseSchemaOptions,
);

export const Tag = model<ITag>('Tag', tagSchema);
