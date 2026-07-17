import type { Request, Response } from 'express';
import { rolesService } from './roles.service';
import { sendSuccess, sendCreated } from '../../utils/api-response';

export const rolesController = {
  async list(_req: Request, res: Response) {
    sendSuccess(res, await rolesService.listRoles());
  },
  async listPermissions(_req: Request, res: Response) {
    sendSuccess(res, await rolesService.listPermissions());
  },
  async create(req: Request, res: Response) {
    sendCreated(res, await rolesService.create(req.body));
  },
  async update(req: Request, res: Response) {
    sendSuccess(res, await rolesService.update(req.params.id, req.body));
  },
  async remove(req: Request, res: Response) {
    await rolesService.remove(req.params.id);
    sendSuccess(res, null, 200, 'Role deleted');
  },
};
