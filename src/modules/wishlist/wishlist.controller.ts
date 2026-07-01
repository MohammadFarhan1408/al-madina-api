import type { Request, Response } from 'express';
import { wishlistService } from './wishlist.service';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';

function userId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Authentication required', ERROR_CODES.UNAUTHORIZED);
  return req.user.id;
}

export const wishlistController = {
  async list(req: Request, res: Response): Promise<void> {
    const result = await wishlistService.list(userId(req));
    sendSuccess(res, result);
  },

  async add(req: Request, res: Response): Promise<void> {
    const result = await wishlistService.add(userId(req), req.body.productId);
    sendCreated(res, result);
  },

  async remove(req: Request, res: Response): Promise<void> {
    await wishlistService.remove(userId(req), req.params.productId);
    sendSuccess(res, null, 200, 'Removed from wishlist');
  },
};
