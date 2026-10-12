import { Router } from 'express';
import { authController } from './auth.controller';
import {
  signUpSchema,
  signInSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema';
import { validate, requireAuth } from '../../middlewares';
import {
  signInLimiter,
  signUpLimiter,
  forgotPasswordLimiter,
  refreshLimiter,
  resetPasswordLimiter,
} from '../../middlewares/rate-limit.middleware';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

router.post(
  '/sign-up',
  signUpLimiter,
  validate({ body: signUpSchema }),
  asyncHandler(authController.signUp),
);

router.post(
  '/sign-in',
  signInLimiter,
  validate({ body: signInSchema }),
  asyncHandler(authController.signIn),
);

router.post(
  '/sign-out',
  validate({ body: refreshTokenSchema }),
  asyncHandler(authController.signOut),
);

router.post(
  '/refresh',
  refreshLimiter,
  validate({ body: refreshTokenSchema }),
  asyncHandler(authController.refresh),
);

router.get('/me', requireAuth, asyncHandler(authController.me));

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword),
);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword),
);

export const authRoutes = router;
