import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';
import {
  DEFAULT_CURRENCY,
  PAYMENT_PROVIDERS,
  TRANSACTION_STATUSES,
  type PaymentProviderName,
  type TransactionStatus,
} from '../../constants/business';

/** One payment attempt against an Order. Retries create a new document rather
 * than mutating a failed one, so attempt history is preserved. */
export interface ITransaction extends Document {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  provider: PaymentProviderName;
  status: TransactionStatus;
  amount: number;
  currency: string;
  idempotencyKey: string;
  providerReference?: string;
  metadata?: Record<string, unknown>;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    provider: { type: String, enum: PAYMENT_PROVIDERS, required: true },
    status: { type: String, enum: TRANSACTION_STATUSES, default: 'pending', index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: DEFAULT_CURRENCY, maxlength: 3 },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    providerReference: { type: String },
    metadata: { type: Schema.Types.Mixed },
    failureReason: { type: String },
  },
  baseSchemaOptions,
);

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
