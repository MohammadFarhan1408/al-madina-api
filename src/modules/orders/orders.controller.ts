import type { Request, Response } from 'express';
import { ordersService } from './orders.service';
import { sendCreated, sendSuccess } from '../../utils/api-response';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';

export const ordersController = {
  /** POST /orders — auth optional (guest checkout via guestEmail). */
  async create(req: Request, res: Response): Promise<void> {
    const order = await ordersService.create(req.body, req.user);
    sendCreated(res, order);
  },

  /** GET /orders — authenticated history. */
  async list(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required', ERROR_CODES.UNAUTHORIZED);
    }
    const result = await ordersService.list(req.user.id, req.query as never);
    sendSuccess(res, result);
  },

  /** GET /orders/:id — owner or guest (reference+email via ?email=). */
  async getById(req: Request, res: Response): Promise<void> {
    const guestEmail = typeof req.query.email === 'string' ? req.query.email : undefined;
    const order = await ordersService.getById(req.params.id, req.user, guestEmail);
    sendSuccess(res, order);
  },
};
