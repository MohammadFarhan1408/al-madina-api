import { z } from 'zod';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { productsRepository } from '../products/products.repository';
import {
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING_FEE,
} from '../../constants/business';
import { sendSuccess } from '../../utils/api-response';
import { validate, requireAuth } from '../../middlewares';
import { asyncHandler } from '../../utils/async-handler';

/**
 * Optional server-side cart sync (§ Cart — "POST /cart/sync (merge on login)").
 * The cart itself is client-side (Zustand); this endpoint validates a posted
 * cart, drops items that no longer exist or are out of stock, recomputes
 * server-trusted totals, and returns the reconciled cart for multi-device use.
 */
export const cartSyncSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid productId' }),
        quantity: z.coerce.number().int().min(1),
        volumeMl: z.coerce.number().int().min(0).optional(),
      }),
    )
    .default([]),
});

async function sync(req: Request, res: Response): Promise<void> {
  const { items } = req.body as z.infer<typeof cartSyncSchema>;
  const products = await productsRepository.findByIds(items.map((i) => i.productId));
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const reconciled = items
    .map((line) => {
      const product = byId.get(line.productId);
      if (!product || !product.inStock) return null;
      return {
        productId: line.productId,
        quantity: line.quantity,
        volumeMl: line.volumeMl ?? product.volumeMl,
        price: product.price,
        name: product.name,
        image: product.images[0] ?? '',
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = reconciled.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;

  sendSuccess(res, {
    items: reconciled,
    subtotal,
    shipping,
    total: subtotal + shipping,
  });
}

const router = Router();
router.post('/sync', requireAuth, validate({ body: cartSyncSchema }), asyncHandler(sync));

export const cartRoutes = router;
