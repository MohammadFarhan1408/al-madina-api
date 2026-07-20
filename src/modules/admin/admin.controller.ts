import type { Request, Response } from 'express';
import { adminService } from './admin.service';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import type { UploadType } from '../../storage/upload';

export const adminController = {
  // Products
  async createProduct(req: Request, res: Response) {
    sendCreated(res, await adminService.createProduct(req.body));
  },
  async updateProduct(req: Request, res: Response) {
    sendSuccess(res, await adminService.updateProduct(req.params.id, req.body));
  },
  async deleteProduct(req: Request, res: Response) {
    await adminService.deleteProduct(req.params.id);
    sendSuccess(res, null, 200, 'Product deleted');
  },
  async uploadProductImages(req: Request, res: Response) {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) throw ApiError.badRequest('No files uploaded', ERROR_CODES.UPLOAD_FAILED);
    sendCreated(res, await adminService.addProductImages(req.params.id, files));
  },

  // Categories
  async createCategory(req: Request, res: Response) {
    sendCreated(res, await adminService.createCategory(req.body));
  },
  async updateCategory(req: Request, res: Response) {
    sendSuccess(res, await adminService.updateCategory(req.params.id, req.body));
  },
  async deleteCategory(req: Request, res: Response) {
    await adminService.deleteCategory(req.params.id);
    sendSuccess(res, null, 200, 'Category deleted');
  },

  // Collections
  async createCollection(req: Request, res: Response) {
    sendCreated(res, await adminService.createCollection(req.body));
  },
  async updateCollection(req: Request, res: Response) {
    sendSuccess(res, await adminService.updateCollection(req.params.id, req.body));
  },
  async deleteCollection(req: Request, res: Response) {
    await adminService.deleteCollection(req.params.id);
    sendSuccess(res, null, 200, 'Collection deleted');
  },
  async addCollectionProduct(req: Request, res: Response) {
    sendSuccess(res, await adminService.addCollectionProduct(req.params.id, req.body.productId));
  },
  async removeCollectionProduct(req: Request, res: Response) {
    sendSuccess(res, await adminService.removeCollectionProduct(req.params.id, req.params.productId));
  },

  // Orders
  async listOrders(req: Request, res: Response) {
    sendSuccess(res, await adminService.listOrders(req.query as never));
  },
  async updateOrderStatus(req: Request, res: Response) {
    sendSuccess(res, await adminService.updateOrderStatus(req.params.id, req.body.status));
  },
  async orderStats(_req: Request, res: Response) {
    sendSuccess(res, await adminService.orderStats());
  },
  async orderTransactions(req: Request, res: Response) {
    sendSuccess(res, await adminService.orderTransactions(req.params.id));
  },
  async refundPayment(req: Request, res: Response) {
    sendSuccess(res, await adminService.refundPayment(req.body.transactionId));
  },

  // Customers
  async listUsers(req: Request, res: Response) {
    const { page, limit, tier, sortBy, sortOrder, q } = req.query as never as {
      page: number;
      limit: number;
      tier?: never;
      sortBy?: 'fullName' | 'email' | 'tier' | 'memberSince';
      sortOrder?: 'asc' | 'desc';
      q?: string;
    };
    sendSuccess(res, await adminService.listUsers(page, limit, tier, sortBy, sortOrder, q));
  },
  async getUser(req: Request, res: Response) {
    sendSuccess(res, await adminService.getUser(req.params.id));
  },
  async updateUserTier(req: Request, res: Response) {
    sendSuccess(res, await adminService.updateUserTier(req.params.id, req.body.tier));
  },
  async deactivateUser(req: Request, res: Response) {
    await adminService.deactivateUser(req.params.id);
    sendSuccess(res, null, 200, 'User deactivated');
  },

  // Notifications
  async broadcast(req: Request, res: Response) {
    sendCreated(res, await adminService.broadcast(req.body));
  },
  async notificationHistory(req: Request, res: Response) {
    const { page, limit } = req.query as never as { page: number; limit: number };
    sendSuccess(res, await adminService.notificationHistory(page, limit));
  },

  // Upload
  async upload(req: Request, res: Response) {
    if (!req.file) throw ApiError.badRequest('No file uploaded', ERROR_CODES.UPLOAD_FAILED);
    const type = (req.query as { type: UploadType }).type;
    sendCreated(res, await adminService.uploadImage(req.file, type));
  },

  // Dashboard
  async dashboard(_req: Request, res: Response) {
    sendSuccess(res, await adminService.dashboard());
  },
};
