import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { productsRoutes } from '../modules/products/products.routes';
import { categoriesRoutes } from '../modules/categories/categories.routes';
import { collectionsRoutes } from '../modules/collections/collections.routes';
import { wishlistRoutes } from '../modules/wishlist/wishlist.routes';
import { ordersRoutes } from '../modules/orders/orders.routes';
import { notificationsRoutes } from '../modules/notifications/notifications.routes';
import { usersRoutes } from '../modules/users/users.routes';
import { searchRoutes } from '../modules/search/search.routes';
import { contactRoutes } from '../modules/contact/contact.module';
import { cartRoutes } from '../modules/cart/cart.module';
import { tagsRoutes } from '../modules/tags/tags.routes';
import { addressesRoutes } from '../modules/addresses/addresses.routes';
import { adminRoutes } from '../modules/admin/admin.routes';
import { paymentsRoutes } from '../modules/payments/payments.routes';
import { couponsRoutes } from '../modules/coupons/coupons.routes';

/**
 * Root API router mounted at /v1. Feature module routers are registered here.
 */
const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/collections', collectionsRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', ordersRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/users', usersRoutes);
router.use('/search', searchRoutes);
router.use('/contact', contactRoutes);
router.use('/cart', cartRoutes);
router.use('/tags', tagsRoutes);
router.use('/addresses', addressesRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentsRoutes);
router.use('/coupons', couponsRoutes);

export const apiRouter = router;
