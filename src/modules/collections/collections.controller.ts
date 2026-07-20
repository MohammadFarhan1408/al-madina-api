import type { Request, Response } from 'express';
import { collectionsService } from './collections.service';
import { sendSuccess } from '../../utils/api-response';

export const collectionsController = {
  async list(_req: Request, res: Response): Promise<void> {
    const collections = await collectionsService.list();
    sendSuccess(res, collections);
  },

  async products(req: Request, res: Response): Promise<void> {
    const products = await collectionsService.products(req.params.id);
    sendSuccess(res, products);
  },

  async detail(req: Request, res: Response): Promise<void> {
    const collection = await collectionsService.getById(req.params.id);
    sendSuccess(res, collection);
  },
};
