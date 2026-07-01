import type { Request, Response } from 'express';
import { productsService, type RailName } from './products.service';
import { searchService } from '../search/search.service';
import { sendSuccess } from '../../utils/api-response';

export const productsController = {
  async list(req: Request, res: Response): Promise<void> {
    const result = await productsService.list(req.query as never);
    sendSuccess(res, result);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const product = await productsService.getById(req.params.id);
    sendSuccess(res, product);
  },

  async reviews(req: Request, res: Response): Promise<void> {
    const result = await productsService.reviews(req.params.id, req.query as never);
    sendSuccess(res, result);
  },

  rail(name: RailName) {
    return async (_req: Request, res: Response): Promise<void> => {
      const products = await productsService.rail(name);
      sendSuccess(res, products);
    };
  },

  async search(req: Request, res: Response): Promise<void> {
    const result = await searchService.search(req.query as never);
    sendSuccess(res, result);
  },

  async suggest(req: Request, res: Response): Promise<void> {
    const result = await searchService.suggest(req.query as never);
    sendSuccess(res, result);
  },
};
