import { Category, type ICategory } from '../../database/models';

export const categoriesRepository = {
  findAll(): Promise<ICategory[]> {
    return Category.find().sort({ sortOrder: 1, name: 1 }).lean<ICategory[]>().exec();
  },

  findById(id: string): Promise<ICategory | null> {
    return Category.findById(id).lean<ICategory>().exec();
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
