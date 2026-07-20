import { Router } from 'express';
import { couponsController } from './coupons.controller';
import { validateCouponSchema } from './coupons.schema';
import { validate, authOptional } from '../../middlewares';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

// Public discount preview — guests can see a coupon's effect before checkout.
router.post(
  '/validate',
  authOptional,
  validate({ body: validateCouponSchema }),
  asyncHandler(couponsController.validate),
);

export const couponsRoutes = router;
