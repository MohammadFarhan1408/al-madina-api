import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

export interface IPermission extends Document {
  _id: Types.ObjectId;
  key: string;
  module: string;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    module: { type: String, required: true, trim: true, index: true },
    label: { type: String, required: true, trim: true },
  },
  baseSchemaOptions,
);

export const Permission = model<IPermission>('Permission', permissionSchema);
