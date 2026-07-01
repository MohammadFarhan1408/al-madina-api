import { Types } from 'mongoose';
import { WishlistItem, type IWishlistItem } from '../../database/models';

export const wishlistRepository = {
  async productIdsForUser(userId: string): Promise<string[]> {
    const items = await WishlistItem.find({ userId: new Types.ObjectId(userId) })
      .select('productId')
      .sort({ createdAt: -1 })
      .lean<Pick<IWishlistItem, 'productId'>[]>()
      .exec();
    return items.map((i) => i.productId.toString());
  },

  exists(userId: string, productId: string): Promise<boolean> {
    return WishlistItem.exists({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    }).then((doc) => Boolean(doc));
  },

  add(userId: string, productId: string): Promise<IWishlistItem> {
    return WishlistItem.create({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });
  },

  async remove(userId: string, productId: string): Promise<boolean> {
    const res = await WishlistItem.deleteOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    }).exec();
    return res.deletedCount > 0;
  },
};
