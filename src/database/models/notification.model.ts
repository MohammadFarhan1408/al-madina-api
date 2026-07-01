import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';
import { NOTIFICATION_KINDS, type NotificationKind } from '../../constants/business';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  date: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: NOTIFICATION_KINDS, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
  },
  baseSchemaOptions,
);

// Supports "unread count" and per-user read filtering (§19 indexes).
notificationSchema.index({ userId: 1, read: 1 });

export const Notification = model<INotification>('Notification', notificationSchema);
