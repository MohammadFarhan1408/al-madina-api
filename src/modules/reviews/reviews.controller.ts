import type { Request, Response } from 'express';
import { reviewsService } from './reviews.service';
import { sendCreated, sendSuccess } from '../../utils/api-response';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';

export const reviewsController = {
  async create(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required', ERROR_CODES.UNAUTHORIZED);
    }
    const review = await reviewsService.create(req.params.id, req.user, req.body);
    sendCreated(res, review);
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async listAll(req: Request, res: Response): Promise<void> {
    const { page, limit, rating, sortBy, sortOrder } = req.query as unknown as {
      page: number;
      limit: number;
      rating?: number;
      sortBy?: 'rating' | 'date';
      sortOrder?: 'asc' | 'desc';
    };
    const result = await reviewsService.listAll(page, limit, rating, sortBy, sortOrder);
    sendSuccess(res, result);
  },

  async remove(req: Request, res: Response): Promise<void> {
    await reviewsService.remove(req.params.id);
    sendSuccess(res, null, 200, 'Review removed');
  },
};
