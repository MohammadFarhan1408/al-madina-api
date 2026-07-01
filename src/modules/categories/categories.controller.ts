import type { Request, Response } from 'express';
import { categoriesService } from './categories.service';
import { sendSuccess } from '../../utils/api-response';

export const categoriesController = {
  async list(_req: Request, res: Response): Promise<void> {
    const categories = await categoriesService.list();
    sendSuccess(res, categories);
  },

  async products(req: Request, res: Response): Promise<void> {
    const result = await categoriesService.products(req.params.id, req.query as never);
    sendSuccess(res, result);
  },
};
