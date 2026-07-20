import { Types } from 'mongoose';
import { Transaction, type ITransaction } from '../../database/models';
import type { PaymentProviderName, TransactionStatus } from '../../constants/business';

export interface CreateTransactionData {
  orderId: string;
  provider: PaymentProviderName;
  status: TransactionStatus;
  amount: number;
  currency: string;
  idempotencyKey: string;
  providerReference?: string;
  metadata?: Record<string, unknown>;
}

export const paymentsRepository = {
  create(data: CreateTransactionData): Promise<ITransaction> {
    return Transaction.create({ ...data, orderId: new Types.ObjectId(data.orderId) });
  },

  findByIdempotencyKey(idempotencyKey: string): Promise<ITransaction | null> {
    return Transaction.findOne({ idempotencyKey }).exec();
  },

  findById(id: string): Promise<ITransaction | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Transaction.findById(id).exec();
  },

  findLatestByOrder(orderId: string): Promise<ITransaction | null> {
    return Transaction.findOne({ orderId: new Types.ObjectId(orderId) }).sort({ createdAt: -1, _id: -1 }).exec();
  },

  listByOrder(orderId: string): Promise<ITransaction[]> {
    return Transaction.find({ orderId: new Types.ObjectId(orderId) }).sort({ createdAt: -1, _id: -1 }).exec();
  },

  updateStatus(
    id: string,
    status: TransactionStatus,
    extra: Partial<Pick<ITransaction, 'providerReference' | 'failureReason' | 'metadata'>> = {},
  ): Promise<ITransaction | null> {
    return Transaction.findByIdAndUpdate(id, { $set: { status, ...extra } }, { new: true }).exec();
  },
};
