import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

export interface IRole extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  permissionIds: Types.ObjectId[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    permissionIds: { type: [Schema.Types.ObjectId], ref: 'Permission', default: [] },
    isSystem: { type: Boolean, default: false, index: true },
  },
  baseSchemaOptions,
);

export const Role = model<IRole>('Role', roleSchema);
