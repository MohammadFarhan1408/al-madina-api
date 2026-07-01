import { Router } from 'express';
import { productsController } from './products.controller';
import { reviewsController } from '../reviews/reviews.controller';
import {
  listProductsQuerySchema,
  searchProductsQuerySchema,
  suggestQuerySchema,
} from './products.schema';
import { createReviewSchema } from '../reviews/reviews.schema';
import { paginationQuerySchema, objectIdParam } from '../../utils/common.schema';
import { validate, requireAuth } from '../../middlewares';
import { searchLimiter } from '../../middlewares/rate-limit.middleware';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

// ─── Static / rail routes (must precede "/:id") ──────────────────────────────
router.get('/search', searchLimiter, validate({ query: searchProductsQuerySchema }), asyncHandler(productsController.search));
router.get('/suggest', searchLimiter, validate({ query: suggestQuerySchema }), asyncHandler(productsController.suggest));
router.get('/featured', asyncHandler(productsController.rail('featured')));
router.get('/new-arrivals', asyncHandler(productsController.rail('new-arrivals')));
router.get('/best-sellers', asyncHandler(productsController.rail('best-sellers')));
router.get('/signature', asyncHandler(productsController.rail('signature')));
router.get('/seasonal', asyncHandler(productsController.rail('seasonal')));

// ─── List + by-ids ───────────────────────────────────────────────────────────
router.get('/', validate({ query: listProductsQuerySchema }), asyncHandler(productsController.list));

// ─── Single product ──────────────────────────────────────────────────────────
router.get('/:id', validate({ params: objectIdParam() }), asyncHandler(productsController.getById));
router.get(
  '/:id/reviews',
  validate({ params: objectIdParam(), query: paginationQuerySchema }),
  asyncHandler(productsController.reviews),
);
router.post(
  '/:id/reviews',
  requireAuth,
  validate({ params: objectIdParam(), body: createReviewSchema }),
  asyncHandler(reviewsController.create),
);

export const productsRoutes = router;
