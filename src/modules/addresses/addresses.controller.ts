import type { Request, Response } from 'express';
import { addressesService } from './addresses.service';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';

function userId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Authentication required', ERROR_CODES.UNAUTHORIZED);
  return req.user.id;
}

export const addressesController = {
  async list(req: Request, res: Response) {
    sendSuccess(res, await addressesService.list(userId(req)));
  },
  async create(req: Request, res: Response) {
    sendCreated(res, await addressesService.create(userId(req), req.body));
  },
  async update(req: Request, res: Response) {
    sendSuccess(res, await addressesService.update(req.params.id, userId(req), req.body));
  },
  async remove(req: Request, res: Response) {
    await addressesService.remove(req.params.id, userId(req));
    sendSuccess(res, null, 200, 'Address removed');
  },
};
