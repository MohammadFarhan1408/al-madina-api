import { Router } from 'express';
import { collectionsController } from './collections.controller';
import { objectIdParam } from '../../utils/common.schema';
import { validate } from '../../middlewares';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

router.get('/', asyncHandler(collectionsController.list));
router.get('/:id', validate({ params: objectIdParam() }), asyncHandler(collectionsController.detail));
router.get(
  '/:id/products',
  validate({ params: objectIdParam() }),
  asyncHandler(collectionsController.products),
);

export const collectionsRoutes = router;
