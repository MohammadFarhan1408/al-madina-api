import { Router } from 'express';
import { addressesController } from './addresses.controller';
import { createAddressSchema, updateAddressSchema } from './addresses.schema';
import { objectIdParam } from '../../utils/common.schema';
import { validate, requireAuth } from '../../middlewares';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(addressesController.list));
router.post('/', validate({ body: createAddressSchema }), asyncHandler(addressesController.create));
router.patch(
  '/:id',
  validate({ params: objectIdParam(), body: updateAddressSchema }),
  asyncHandler(addressesController.update),
);
router.delete('/:id', validate({ params: objectIdParam() }), asyncHandler(addressesController.remove));

export const addressesRoutes = router;
