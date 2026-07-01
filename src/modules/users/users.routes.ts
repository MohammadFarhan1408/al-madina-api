import { Router } from 'express';
import { usersController } from './users.controller';
import {
  updateProfileSchema,
  updatePreferencesSchema,
  pushTokenSchema,
} from './users.schema';
import { validate, requireAuth } from '../../middlewares';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

router.use(requireAuth); // All /users/me routes are protected.

router.patch('/me', validate({ body: updateProfileSchema }), asyncHandler(usersController.updateProfile));
router.patch(
  '/me/preferences',
  validate({ body: updatePreferencesSchema }),
  asyncHandler(usersController.updatePreferences),
);
router.post(
  '/me/push-token',
  validate({ body: pushTokenSchema }),
  asyncHandler(usersController.registerPushToken),
);

export const usersRoutes = router;
