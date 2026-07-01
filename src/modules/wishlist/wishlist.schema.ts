import { z } from 'zod';
import { Types } from 'mongoose';

export const addWishlistSchema = z.object({
  productId: z.string().refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid productId' }),
});

export type AddWishlistInput = z.infer<typeof addWishlistSchema>;
