import { couponsRepository } from './coupons.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import type { ICoupon } from '../../database/models';

export const couponsService = {
  listAll(page: number, limit: number, isActive?: boolean) {
    return couponsRepository.listAll(page, limit, isActive);
  },

  async getById(id: string): Promise<ICoupon> {
    const coupon = await couponsRepository.findById(id);
    if (!coupon) throw ApiError.notFound('Coupon not found', ERROR_CODES.COUPON_NOT_FOUND);
    return coupon;
  },

  async create(data: Partial<ICoupon>): Promise<ICoupon> {
    if (data.code && (await couponsRepository.findByCode(data.code))) {
      throw ApiError.conflict('Coupon code already exists', ERROR_CODES.COUPON_CODE_TAKEN);
    }
    return couponsRepository.create(data);
  },

  async update(id: string, data: Partial<ICoupon>): Promise<ICoupon> {
    if (data.code) {
      const existing = await couponsRepository.findByCode(data.code);
      if (existing && existing._id.toString() !== id) {
        throw ApiError.conflict('Coupon code already exists', ERROR_CODES.COUPON_CODE_TAKEN);
      }
    }
    const coupon = await couponsRepository.update(id, data);
    if (!coupon) throw ApiError.notFound('Coupon not found', ERROR_CODES.COUPON_NOT_FOUND);
    return coupon;
  },

  async remove(id: string): Promise<void> {
    const coupon = await couponsRepository.remove(id);
    if (!coupon) throw ApiError.notFound('Coupon not found', ERROR_CODES.COUPON_NOT_FOUND);
  },

  /**
   * Validate a coupon for redemption against a subtotal. Used by seed data
   * and available for future checkout-time integration (not wired into
   * orders.service yet — see AGENTS.md / plan scope).
   */
  async validateForSubtotal(code: string, subtotal: number): Promise<ICoupon> {
    const coupon = await couponsRepository.findByCode(code);
    if (!coupon) throw ApiError.notFound('Coupon not found', ERROR_CODES.COUPON_NOT_FOUND);
    if (!coupon.isActive) throw ApiError.badRequest('Coupon is inactive', ERROR_CODES.COUPON_INACTIVE);
    if (coupon.expiresAt < new Date()) throw ApiError.badRequest('Coupon has expired', ERROR_CODES.COUPON_EXPIRED);
    if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
      throw ApiError.badRequest('Coupon usage limit reached', ERROR_CODES.COUPON_USAGE_LIMIT_REACHED);
    }
    if (subtotal < coupon.minPurchase) {
      throw ApiError.badRequest('Subtotal below coupon minimum purchase', ERROR_CODES.COUPON_MIN_PURCHASE_NOT_MET);
    }
    return coupon;
  },

  computeDiscount(coupon: ICoupon, subtotal: number): number {
    const raw = coupon.discountType === 'percentage' ? (subtotal * coupon.value) / 100 : coupon.value;
    const capped = coupon.maxDiscount !== undefined ? Math.min(raw, coupon.maxDiscount) : raw;
    return Math.min(capped, subtotal);
  },
};
