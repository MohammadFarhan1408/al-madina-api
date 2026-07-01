import { Types, type FilterQuery, type SortOrder } from 'mongoose';
import { Product, type IProduct } from '../../database/models';
import { paginate } from '../../utils/paginate';
import { escapeRegex } from '../../utils/sanitize';
import type { Paginated } from '../../types/api.types';
import type { SortOption } from '../../constants/business';

export interface ProductListParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  family?: string;
  q?: string;
  sort?: SortOption;
  badge?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isSeasonal?: boolean;
}

/** Map a sort option to a Mongoose sort spec (§16 Sorting). */
function sortSpec(sort: SortOption = 'featured'): Record<string, SortOrder> {
  switch (sort) {
    case 'price_asc':
      return { price: 1 };
    case 'price_desc':
      return { price: -1 };
    case 'rating':
      return { rating: -1, reviewCount: -1 };
    case 'newest':
      return { createdAt: -1 };
    case 'featured':
    default:
      return { isFeatured: -1, rating: -1 };
  }
}

/** Base filter excluding soft-deleted products (§11 Soft Delete). */
function baseFilter(): FilterQuery<IProduct> {
  return { deletedAt: null };
}

export const productsRepository = {
  /** Paginated, filtered, sorted product list. */
  list(params: ProductListParams): Promise<Paginated<IProduct>> {
    const filter: FilterQuery<IProduct> = baseFilter();

    if (params.categoryId && Types.ObjectId.isValid(params.categoryId)) {
      filter.categoryId = new Types.ObjectId(params.categoryId);
    }
    if (params.family) filter.scentFamily = params.family;
    if (params.badge) filter.badge = params.badge;
    if (typeof params.inStock === 'boolean') filter.inStock = params.inStock;
    if (params.isFeatured) filter.isFeatured = true;
    if (params.isNewArrival) filter.isNewArrival = true;
    if (params.isBestSeller) filter.isBestSeller = true;
    if (params.isSignature) filter.isSignature = true;
    if (params.isSeasonal) filter.isSeasonal = true;

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      filter.price = {};
      if (params.minPrice !== undefined) filter.price.$gte = params.minPrice;
      if (params.maxPrice !== undefined) filter.price.$lte = params.maxPrice;
    }

    if (params.q) {
      filter.$text = { $search: params.q };
    }

    return paginate<IProduct>(Product, filter, {
      page: params.page,
      limit: params.limit,
      sort: sortSpec(params.sort),
    });
  },

  findById(id: string): Promise<IProduct | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Product.findOne({ _id: id, deletedAt: null }).lean<IProduct>().exec();
  },

  /** Fetch many products by id (order not guaranteed) for wishlist hydration. */
  findByIds(ids: string[]): Promise<IProduct[]> {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    return Product.find({ _id: { $in: valid }, deletedAt: null }).lean<IProduct[]>().exec();
  },

  /** Home rails — products flagged for a given section, capped. */
  findByFlag(flag: keyof IProduct, limit = 12): Promise<IProduct[]> {
    return Product.find({ [flag]: true, deletedAt: null })
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit)
      .lean<IProduct[]>()
      .exec();
  },

  /** Full-text search with regex fallback for very short queries. */
  search(q: string, page: number, limit: number): Promise<Paginated<IProduct>> {
    const safe = escapeRegex(q);
    const filter: FilterQuery<IProduct> =
      q.length >= 3
        ? { deletedAt: null, $text: { $search: q } }
        : {
            deletedAt: null,
            $or: [
              { name: { $regex: safe, $options: 'i' } },
              { brand: { $regex: safe, $options: 'i' } },
              { notes: { $regex: safe, $options: 'i' } },
            ],
          };

    return paginate<IProduct>(Product, filter, { page, limit, sort: { rating: -1 } });
  },

  /** Prefix autocomplete returning product names. */
  async suggest(q: string, limit: number): Promise<string[]> {
    const docs = await Product.find({
      deletedAt: null,
      name: { $regex: `^${escapeRegex(q)}`, $options: 'i' },
    })
      .select('name')
      .limit(limit)
      .lean<Pick<IProduct, 'name'>[]>()
      .exec();
    return docs.map((d) => d.name);
  },

  exists(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(false);
    return Product.exists({ _id: id, deletedAt: null }).then((doc) => Boolean(doc));
  },

  // ─── Admin writes ────────────────────────────────────────────────────────────

  create(data: Partial<IProduct>): Promise<IProduct> {
    return Product.create(data);
  },

  update(id: string, data: Partial<IProduct>): Promise<IProduct | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Product.findOneAndUpdate({ _id: id, deletedAt: null }, { $set: data }, { new: true }).exec();
  },

  softDelete(id: string): Promise<IProduct | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Product.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    ).exec();
  },

  pushImages(id: string, urls: string[]): Promise<IProduct | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Product.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $push: { images: { $each: urls } } },
      { new: true },
    ).exec();
  },

  countAll(): Promise<number> {
    return Product.countDocuments({ deletedAt: null }).exec();
  },

  countOutOfStock(): Promise<number> {
    return Product.countDocuments({ deletedAt: null, inStock: false }).exec();
  },
};
