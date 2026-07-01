import { Router } from 'express';
import { categoriesController } from './categories.controller';
import { objectIdParam, paginationQuerySchema } from '../../utils/common.schema';
import { validate } from '../../middlewares';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

router.get('/', asyncHandler(categoriesController.list));
router.get(
  '/:id/products',
  validate({ params: objectIdParam(), query: paginationQuerySchema }),
  asyncHandler(categoriesController.products),
);

export const categoriesRoutes = router;
