import { Types } from 'mongoose';
import { Collection, Product, type ICollection, type IProduct } from '../../database/models';

export const collectionsRepository = {
  findAll(): Promise<ICollection[]> {
    return Collection.find().sort({ sortOrder: 1, title: 1 }).lean<ICollection[]>().exec();
  },

  findById(id: string): Promise<ICollection | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Collection.findById(id).lean<ICollection>().exec();
  },

  /** Resolve a collection's member products (non-deleted), preserving order. */
  async productsFor(collection: ICollection): Promise<IProduct[]> {
    const products = await Product.find({
      _id: { $in: collection.productIds },
      deletedAt: null,
    })
      .lean<IProduct[]>()
      .exec();
    // Preserve the curated order defined by productIds.
    const byId = new Map(products.map((p) => [p._id.toString(), p]));
    return collection.productIds
      .map((id) => byId.get(id.toString()))
      .filter((p): p is IProduct => Boolean(p));
  },

  exists(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(false);
    return Collection.exists({ _id: id }).then((doc) => Boolean(doc));
  },

  // ─── Admin writes ────────────────────────────────────────────────────────────

  create(data: Partial<ICollection>): Promise<ICollection> {
    return Collection.create(data);
  },

  update(id: string, data: Partial<ICollection>): Promise<ICollection | null> {
    return Collection.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  },

  remove(id: string): Promise<ICollection | null> {
    return Collection.findByIdAndDelete(id).exec();
  },

  /** Add a product to a collection and resync productCount. */
  async addProduct(id: string, productId: string): Promise<ICollection | null> {
    const collection = await Collection.findByIdAndUpdate(
      id,
      { $addToSet: { productIds: new Types.ObjectId(productId) } },
      { new: true },
    ).exec();
    if (collection) {
      collection.productCount = collection.productIds.length;
      await collection.save();
    }
    return collection;
  },

  /** Remove a product from a collection and resync productCount. */
  async removeProduct(id: string, productId: string): Promise<ICollection | null> {
    const collection = await Collection.findByIdAndUpdate(
      id,
      { $pull: { productIds: new Types.ObjectId(productId) } },
      { new: true },
    ).exec();
    if (collection) {
      collection.productCount = collection.productIds.length;
      await collection.save();
    }
    return collection;
  },
};
