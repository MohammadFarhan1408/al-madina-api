import type { Request, Response } from 'express';
import { couponsService } from './coupons.service';
import { sendSuccess, sendCreated } from '../../utils/api-response';

export const couponsController = {
  async list(req: Request, res: Response) {
    const { page, limit, isActive } = req.query as never as { page: number; limit: number; isActive?: boolean };
    sendSuccess(res, await couponsService.listAll(page, limit, isActive));
  },
  async create(req: Request, res: Response) {
    sendCreated(res, await couponsService.create(req.body));
  },
  async update(req: Request, res: Response) {
    sendSuccess(res, await couponsService.update(req.params.id, req.body));
  },
  async remove(req: Request, res: Response) {
    await couponsService.remove(req.params.id);
    sendSuccess(res, null, 200, 'Coupon deleted');
  },
};
