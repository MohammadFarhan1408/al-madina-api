import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

/**
 * Records admin/manager mutations for accountability (§18 Audit Logs).
 * Written by the audit middleware on protected admin routes.
 */
export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actorId?: Types.ObjectId | null;
  actorEmail?: string;
  action: string; // e.g. "POST /admin/products"
  method: string;
  path: string;
  ip?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorEmail: { type: String },
    action: { type: String, required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    ip: { type: String },
    statusCode: { type: Number },
    metadata: { type: Schema.Types.Mixed },
  },
  baseSchemaOptions,
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
