import { Types } from 'mongoose';
import { Category, Product, type ICategory } from '../../database/models';

/**
 * Live (non-deleted) product counts per category. Category.productCount is a
 * stored field nothing ever maintained, so it is overridden at read time.
 */
async function liveCounts(): Promise<Map<string, number>> {
  const rows = await Product.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { deletedAt: null } },
    { $group: { _id: '$categoryId', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

export const categoriesRepository = {
  async findAll(): Promise<ICategory[]> {
    const [categories, counts] = await Promise.all([
      Category.find().sort({ sortOrder: 1, name: 1 }).lean<ICategory[]>().exec(),
      liveCounts(),
    ]);
    return categories.map((c) => ({ ...c, productCount: counts.get(String(c._id)) ?? 0 }) as ICategory);
  },

  async findById(id: string): Promise<ICategory | null> {
    const category = await Category.findById(id).lean<ICategory>().exec();
    if (!category) return null;
    const n = await Product.countDocuments({ categoryId: category._id, deletedAt: null });
    return { ...category, productCount: n } as ICategory;
  },

  exists(id: string): Promise<boolean> {
    return Category.exists({ _id: id }).then((doc) => Boolean(doc));
  },

  // ─── Admin writes ────────────────────────────────────────────────────────────

  create(data: Partial<ICategory>): Promise<ICategory> {
    return Category.create(data);
  },

  update(id: string, data: Partial<ICategory>): Promise<ICategory | null> {
    return Category.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  },

  remove(id: string): Promise<ICategory | null> {
    return Category.findByIdAndDelete(id).exec();
  },
};
