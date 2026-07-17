import { Router } from 'express';
import { adminController } from './admin.controller';
import { reviewsController } from '../reviews/reviews.controller';
import { couponsController } from '../coupons/coupons.controller';
import { createCouponSchema, updateCouponSchema, adminCouponsQuerySchema } from '../coupons/coupons.schema';
import { rolesController } from '../roles/roles.controller';
import { createRoleSchema, updateRoleSchema } from '../roles/roles.schema';
import { tagsController } from '../tags/tags.controller';
import { createTagSchema, updateTagSchema } from '../tags/tags.schema';
import {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
  createCollectionSchema,
  updateCollectionSchema,
  collectionProductSchema,
  updateOrderStatusSchema,
  adminOrdersQuerySchema,
  adminUsersQuerySchema,
  updateTierSchema,
  broadcastSchema,
  notificationHistoryQuerySchema,
  adminReviewsQuerySchema,
  uploadQuerySchema,
} from './admin.schema';
import { objectIdParam } from '../../utils/common.schema';
import { validate, requireAuth, requireRole, auditLog } from '../../middlewares';
import { uploadSingle, uploadMultiple } from '../../middlewares/upload.middleware';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

// All admin routes require auth + admin/manager role, and are audited.
router.use(requireAuth, requireRole('admin', 'manager'), auditLog);

// ─── Dashboard & stats ───────────────────────────────────────────────────────
router.get('/dashboard', asyncHandler(adminController.dashboard));

// ─── Products ──────────────────────────────────────────────────────────────────
router.post('/products', validate({ body: createProductSchema }), asyncHandler(adminController.createProduct));
router.patch('/products/:id', validate({ params: objectIdParam(), body: updateProductSchema }), asyncHandler(adminController.updateProduct));
router.delete('/products/:id', validate({ params: objectIdParam() }), asyncHandler(adminController.deleteProduct));
router.post('/products/:id/images', validate({ params: objectIdParam() }), uploadMultiple('files'), asyncHandler(adminController.uploadProductImages));

// ─── Categories ────────────────────────────────────────────────────────────────
router.post('/categories', validate({ body: createCategorySchema }), asyncHandler(adminController.createCategory));
router.patch('/categories/:id', validate({ params: objectIdParam(), body: updateCategorySchema }), asyncHandler(adminController.updateCategory));
router.delete('/categories/:id', validate({ params: objectIdParam() }), asyncHandler(adminController.deleteCategory));

// ─── Collections ───────────────────────────────────────────────────────────────
router.post('/collections', validate({ body: createCollectionSchema }), asyncHandler(adminController.createCollection));
router.patch('/collections/:id', validate({ params: objectIdParam(), body: updateCollectionSchema }), asyncHandler(adminController.updateCollection));
router.delete('/collections/:id', validate({ params: objectIdParam() }), asyncHandler(adminController.deleteCollection));
router.post('/collections/:id/products', validate({ params: objectIdParam(), body: collectionProductSchema }), asyncHandler(adminController.addCollectionProduct));
router.delete('/collections/:id/products/:productId', validate({ params: objectIdParam() }), asyncHandler(adminController.removeCollectionProduct));

// ─── Orders ────────────────────────────────────────────────────────────────────
router.get('/orders', validate({ query: adminOrdersQuerySchema }), asyncHandler(adminController.listOrders));
router.get('/orders/stats', asyncHandler(adminController.orderStats));
router.patch('/orders/:id/status', validate({ params: objectIdParam(), body: updateOrderStatusSchema }), asyncHandler(adminController.updateOrderStatus));

// ─── Customers ───────────────────────────────────────────────────────────────────
router.get('/users', validate({ query: adminUsersQuerySchema }), asyncHandler(adminController.listUsers));
router.get('/users/:id', validate({ params: objectIdParam() }), asyncHandler(adminController.getUser));
router.patch('/users/:id/tier', validate({ params: objectIdParam(), body: updateTierSchema }), asyncHandler(adminController.updateUserTier));
router.delete('/users/:id', validate({ params: objectIdParam() }), asyncHandler(adminController.deactivateUser));

// ─── Notifications broadcast ─────────────────────────────────────────────────────
router.get('/notifications', validate({ query: notificationHistoryQuerySchema }), asyncHandler(adminController.notificationHistory));
router.post('/notifications', validate({ body: broadcastSchema }), asyncHandler(adminController.broadcast));

// ─── Reviews ───────────────────────────────────────────────────────────────────
router.get('/reviews', validate({ query: adminReviewsQuerySchema }), asyncHandler(reviewsController.listAll));
router.delete('/reviews/:id', validate({ params: objectIdParam() }), asyncHandler(reviewsController.remove));

// ─── Upload ────────────────────────────────────────────────────────────────────
router.post('/upload', validate({ query: uploadQuerySchema }), uploadSingle('file'), asyncHandler(adminController.upload));

// ─── Coupons ───────────────────────────────────────────────────────────────────
router.get('/coupons', validate({ query: adminCouponsQuerySchema }), asyncHandler(couponsController.list));
router.post('/coupons', validate({ body: createCouponSchema }), asyncHandler(couponsController.create));
router.patch('/coupons/:id', validate({ params: objectIdParam(), body: updateCouponSchema }), asyncHandler(couponsController.update));
router.delete('/coupons/:id', validate({ params: objectIdParam() }), asyncHandler(couponsController.remove));

// ─── Roles & Permissions ─────────────────────────────────────────────────────────
router.get('/roles', asyncHandler(rolesController.list));
router.post('/roles', validate({ body: createRoleSchema }), asyncHandler(rolesController.create));
router.patch('/roles/:id', validate({ params: objectIdParam(), body: updateRoleSchema }), asyncHandler(rolesController.update));
router.delete('/roles/:id', validate({ params: objectIdParam() }), asyncHandler(rolesController.remove));
router.get('/permissions', asyncHandler(rolesController.listPermissions));

// ─── Tags ──────────────────────────────────────────────────────────────────────
router.post('/tags', validate({ body: createTagSchema }), asyncHandler(tagsController.create));
router.patch('/tags/:id', validate({ params: objectIdParam(), body: updateTagSchema }), asyncHandler(tagsController.update));
router.delete('/tags/:id', validate({ params: objectIdParam() }), asyncHandler(tagsController.remove));

export const adminRoutes = router;
