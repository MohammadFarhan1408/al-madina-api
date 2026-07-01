import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

export type DevicePlatform = 'ios' | 'android';

export interface IPushToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  token: string;
  platform: DevicePlatform;
  createdAt: Date;
  updatedAt: Date;
}

const pushTokenSchema = new Schema<IPushToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    platform: { type: String, enum: ['ios', 'android'], required: true },
  },
  baseSchemaOptions,
);

export const PushToken = model<IPushToken>('PushToken', pushTokenSchema);
