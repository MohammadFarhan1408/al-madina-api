import type { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';

export const authController = {
  async signUp(req: Request, res: Response): Promise<void> {
    const result = await authService.signUp(req.body);
    sendCreated(res, result);
  },

  async signIn(req: Request, res: Response): Promise<void> {
    const result = await authService.signIn(req.body);
    sendSuccess(res, result);
  },

  async signOut(req: Request, res: Response): Promise<void> {
    await authService.signOut(req.body.refreshToken);
    sendSuccess(res, null, 200, 'Signed out');
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const tokens = await authService.refresh(req.body.refreshToken);
    sendSuccess(res, tokens);
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required', ERROR_CODES.UNAUTHORIZED);
    }
    const user = await authService.me(req.user.id);
    sendSuccess(res, user);
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, null, 200, 'Reset email sent if account exists');
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    await authService.resetPassword(req.body);
    sendSuccess(res, null, 200, 'Password updated');
  },
};
