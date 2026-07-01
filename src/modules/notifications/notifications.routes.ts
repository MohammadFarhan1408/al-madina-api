import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { paginationQuerySchema, objectIdParam } from '../../utils/common.schema';
import { validate, requireAuth } from '../../middlewares';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

router.use(requireAuth); // All notification routes are protected.

router.get('/', validate({ query: paginationQuerySchema }), asyncHandler(notificationsController.list));
router.patch('/read-all', asyncHandler(notificationsController.markAllRead));
router.patch(
  '/:id/read',
  validate({ params: objectIdParam() }),
  asyncHandler(notificationsController.markRead),
);

export const notificationsRoutes = router;
