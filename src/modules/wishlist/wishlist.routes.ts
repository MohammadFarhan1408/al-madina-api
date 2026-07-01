import { Router } from 'express';
import { wishlistController } from './wishlist.controller';
import { addWishlistSchema } from './wishlist.schema';
import { objectIdParam } from '../../utils/common.schema';
import { validate, requireAuth } from '../../middlewares';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

router.use(requireAuth); // All wishlist routes are protected (§ Wishlist).

router.get('/', asyncHandler(wishlistController.list));
router.post('/', validate({ body: addWishlistSchema }), asyncHandler(wishlistController.add));
router.delete(
  '/:productId',
  validate({ params: objectIdParam('productId') }),
  asyncHandler(wishlistController.remove),
);

export const wishlistRoutes = router;
