import { Router } from 'express';
import { ordersController } from './orders.controller';
import { createOrderSchema, listOrdersQuerySchema } from './orders.schema';
import { retryPaymentSchema } from '../payments/payments.schema';
import { objectIdParam } from '../../utils/common.schema';
import { validate, requireAuth, authOptional } from '../../middlewares';
import { ordersLimiter } from '../../middlewares/rate-limit.middleware';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

// Guest checkout allowed — authOptional attaches user if a token is present so
// the per-user rate limit and order ownership work for authenticated callers.
router.post(
  '/',
  authOptional,
  ordersLimiter,
  validate({ body: createOrderSchema }),
  asyncHandler(ordersController.create),
);

router.get('/', requireAuth, validate({ query: listOrdersQuerySchema }), asyncHandler(ordersController.list));

router.get(
  '/:id',
  authOptional,
  validate({ params: objectIdParam() }),
  asyncHandler(ordersController.getById),
);

router.get(
  '/:id/payments',
  authOptional,
  validate({ params: objectIdParam() }),
  asyncHandler(ordersController.listPayments),
);

router.post(
  '/:id/payments/retry',
  authOptional,
  validate({ params: objectIdParam(), body: retryPaymentSchema }),
  asyncHandler(ordersController.retryPayment),
);

export const ordersRoutes = router;
