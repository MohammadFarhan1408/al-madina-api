import { Types } from 'mongoose';
import { Coupon, type ICoupon } from '../../database/models';
import { paginate } from '../../utils/paginate';
import type { Paginated } from '../../types/api.types';

export const couponsRepository = {
  listAll(page: number, limit: number, isActive?: boolean): Promise<Paginated<ICoupon>> {
    const filter: Record<string, unknown> = {};
    if (isActive !== undefined) filter.isActive = isActive;
    return paginate<ICoupon>(Coupon, filter, { page, limit, sort: { createdAt: -1 } });
  },

  findById(id: string): Promise<ICoupon | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Coupon.findById(id).exec();
  },

  findByCode(code: string): Promise<ICoupon | null> {
    return Coupon.findOne({ code: code.toUpperCase() }).exec();
  },

  create(data: Partial<ICoupon>): Promise<ICoupon> {
    return Coupon.create(data);
  },

  update(id: string, data: Partial<ICoupon>): Promise<ICoupon | null> {
    return Coupon.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  },

  remove(id: string): Promise<ICoupon | null> {
    return Coupon.findByIdAndDelete(id).exec();
  },
};
