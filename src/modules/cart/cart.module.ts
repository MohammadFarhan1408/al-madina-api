import { z } from 'zod';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { productsRepository } from '../products/products.repository';
import { resolveLinePricing } from '../products/products.service';
import { Cart, type ICart } from '../../database/models';
import {
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING_FEE,
} from '../../constants/business';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { validate, requireAuth } from '../../middlewares';
import { asyncHandler } from '../../utils/async-handler';
import { objectIdParam } from '../../utils/common.schema';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';

/**
 * Cart — persisted per user (one `Cart` document each) plus the original
 * client-reconciliation sync endpoint. The cart itself is still primarily
 * client-side (Zustand) for responsiveness; these endpoints let it survive
 * across devices/sessions instead of living only in local storage.
 */

const cartItemInput = z.object({
  productId: z.string().refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid productId' }),
  quantity: z.coerce.number().int().min(1),
  volumeMl: z.coerce.number().int().min(0).optional(),
});

export const cartSyncSchema = z.object({ items: z.array(cartItemInput).default([]) });
export const addCartItemSchema = cartItemInput;
export const updateCartItemSchema = z.object({ quantity: z.coerce.number().int().min(1) });

function userId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Authentication required', ERROR_CODES.UNAUTHORIZED);
  return req.user.id;
}

async function reconcile(items: z.infer<typeof cartItemInput>[]) {
  const products = await productsRepository.findByIds(items.map((i) => i.productId));
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const reconciled = items
    .map((line) => {
      const product = byId.get(line.productId);
      if (!product) return null;
      const { price, inStock } = resolveLinePricing(product, line.volumeMl);
      if (!inStock) return null;
      return {
        productId: line.productId,
        quantity: line.quantity,
        volumeMl: line.volumeMl ?? product.volumeMl,
        price,
        name: product.name,
        image: product.images[0] ?? '',
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = reconciled.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;

  return { items: reconciled, subtotal, shipping, total: subtotal + shipping };
}

async function sync(req: Request, res: Response): Promise<void> {
  const { items } = req.body as z.infer<typeof cartSyncSchema>;
  const result = await reconcile(items);

  await Cart.findOneAndUpdate(
    { userId: new Types.ObjectId(userId(req)) },
    {
      $set: {
        items: result.items.map((i) => ({
          productId: new Types.ObjectId(i.productId),
          quantity: i.quantity,
          volumeMl: i.volumeMl,
        })),
      },
    },
    { upsert: true },
  ).exec();

  sendSuccess(res, result);
}

async function getCart(req: Request, res: Response): Promise<void> {
  const cart = await Cart.findOne({ userId: new Types.ObjectId(userId(req)) }).lean<ICart | null>().exec();
  const result = await reconcile(
    (cart?.items ?? []).map((i) => ({ productId: i.productId.toString(), quantity: i.quantity, volumeMl: i.volumeMl })),
  );
  sendSuccess(res, result);
}

async function addItem(req: Request, res: Response): Promise<void> {
  const { productId, quantity, volumeMl } = req.body as z.infer<typeof addCartItemSchema>;
  const uid = new Types.ObjectId(userId(req));
  const existing = await Cart.findOne({ userId: uid, 'items.productId': new Types.ObjectId(productId) }).exec();

  if (existing) {
    await Cart.updateOne(
      { userId: uid, 'items.productId': new Types.ObjectId(productId) },
      { $inc: { 'items.$.quantity': quantity } },
    ).exec();
  } else {
    const product = await productsRepository.findById(productId);
    if (!product) throw ApiError.notFound('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
    await Cart.findOneAndUpdate(
      { userId: uid },
      {
        $push: {
          items: {
            productId: new Types.ObjectId(productId),
            quantity,
            volumeMl: volumeMl ?? product.volumeMl,
            addedAt: new Date(),
          },
        },
      },
      { upsert: true },
    ).exec();
  }

  const cart = await Cart.findOne({ userId: uid }).lean<ICart | null>().exec();
  const result = await reconcile(
    (cart?.items ?? []).map((i) => ({ productId: i.productId.toString(), quantity: i.quantity, volumeMl: i.volumeMl })),
  );
  sendCreated(res, result);
}

async function updateItem(req: Request, res: Response): Promise<void> {
  const { quantity } = req.body as z.infer<typeof updateCartItemSchema>;
  const uid = new Types.ObjectId(userId(req));
  await Cart.updateOne(
    { userId: uid, 'items.productId': new Types.ObjectId(req.params.productId) },
    { $set: { 'items.$.quantity': quantity } },
  ).exec();
  const cart = await Cart.findOne({ userId: uid }).lean<ICart | null>().exec();
  const result = await reconcile(
    (cart?.items ?? []).map((i) => ({ productId: i.productId.toString(), quantity: i.quantity, volumeMl: i.volumeMl })),
  );
  sendSuccess(res, result);
}

async function removeItem(req: Request, res: Response): Promise<void> {
  const uid = new Types.ObjectId(userId(req));
  await Cart.updateOne(
    { userId: uid },
    { $pull: { items: { productId: new Types.ObjectId(req.params.productId) } } },
  ).exec();
  const cart = await Cart.findOne({ userId: uid }).lean<ICart | null>().exec();
  const result = await reconcile(
    (cart?.items ?? []).map((i) => ({ productId: i.productId.toString(), quantity: i.quantity, volumeMl: i.volumeMl })),
  );
  sendSuccess(res, result);
}

const router = Router();
router.post('/sync', requireAuth, validate({ body: cartSyncSchema }), asyncHandler(sync));
router.get('/', requireAuth, asyncHandler(getCart));
router.post('/items', requireAuth, validate({ body: addCartItemSchema }), asyncHandler(addItem));
router.patch(
  '/items/:productId',
  requireAuth,
  validate({ params: objectIdParam('productId'), body: updateCartItemSchema }),
  asyncHandler(updateItem),
);
router.delete(
  '/items/:productId',
  requireAuth,
  validate({ params: objectIdParam('productId') }),
  asyncHandler(removeItem),
);

export const cartRoutes = router;
