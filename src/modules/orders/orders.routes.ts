import { Router } from 'express';
import { ordersController } from './orders.controller';
import { createOrderSchema, guestLookupQuerySchema, listOrdersQuerySchema } from './orders.schema';
import { retryPaymentSchema } from '../payments/payments.schema';
import { objectIdParam } from '../../utils/common.schema';
import { validate, requireAuth, authOptional } from '../../middlewares';
import { ordersLimiter, orderLookupLimiter } from '../../middlewares/rate-limit.middleware';
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
  orderLookupLimiter,
  validate({ params: objectIdParam(), query: guestLookupQuerySchema }),
  asyncHandler(ordersController.getById),
);

router.get(
  '/:id/payments',
  authOptional,
  orderLookupLimiter,
  validate({ params: objectIdParam(), query: guestLookupQuerySchema }),
  asyncHandler(ordersController.listPayments),
);

router.post(
  '/:id/payments/retry',
  authOptional,
  orderLookupLimiter,
  validate({ params: objectIdParam(), query: guestLookupQuerySchema, body: retryPaymentSchema }),
  asyncHandler(ordersController.retryPayment),
);

export const ordersRoutes = router;
