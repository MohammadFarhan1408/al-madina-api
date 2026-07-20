import type { Request, Response } from 'express';
import { tagsService } from './tags.service';
import { sendSuccess, sendCreated } from '../../utils/api-response';

export const tagsController = {
  async list(_req: Request, res: Response) {
    sendSuccess(res, await tagsService.list());
  },
  async detail(req: Request, res: Response) {
    sendSuccess(res, await tagsService.getById(req.params.id));
  },
  async create(req: Request, res: Response) {
    sendCreated(res, await tagsService.create(req.body.name));
  },
  async update(req: Request, res: Response) {
    sendSuccess(res, await tagsService.update(req.params.id, req.body.name));
  },
  async remove(req: Request, res: Response) {
    await tagsService.remove(req.params.id);
    sendSuccess(res, null, 200, 'Tag deleted');
  },
};
