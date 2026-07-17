import { Types } from 'mongoose';
import { Address, type IAddress } from '../../database/models';

export const addressesRepository = {
  listForUser(userId: string): Promise<IAddress[]> {
    return Address.find({ userId: new Types.ObjectId(userId) }).sort({ isDefault: -1, createdAt: -1 }).exec();
  },

  findOwned(id: string, userId: string): Promise<IAddress | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Address.findOne({ _id: id, userId: new Types.ObjectId(userId) }).exec();
  },

  create(userId: string, data: Partial<IAddress>): Promise<IAddress> {
    return Address.create({ ...data, userId: new Types.ObjectId(userId) });
  },

  update(id: string, userId: string, data: Partial<IAddress>): Promise<IAddress | null> {
    return Address.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set: data },
      { new: true },
    ).exec();
  },

  remove(id: string, userId: string): Promise<IAddress | null> {
    return Address.findOneAndDelete({ _id: id, userId: new Types.ObjectId(userId) }).exec();
  },

  async clearDefault(userId: string): Promise<void> {
    await Address.updateMany({ userId: new Types.ObjectId(userId) }, { $set: { isDefault: false } }).exec();
  },

  listForUserAdmin(userId: string): Promise<IAddress[]> {
    if (!Types.ObjectId.isValid(userId)) return Promise.resolve([]);
    return Address.find({ userId: new Types.ObjectId(userId) }).sort({ isDefault: -1, createdAt: -1 }).exec();
  },
};
