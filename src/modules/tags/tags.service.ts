import { tagsRepository } from './tags.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { slugify } from '../../utils/slugify';
import type { ITag } from '../../database/models';

export const tagsService = {
  list() {
    return tagsRepository.findAll();
  },

  async create(name: string): Promise<ITag> {
    if (await tagsRepository.findByName(name)) {
      throw ApiError.conflict('Tag already exists', ERROR_CODES.TAG_NAME_TAKEN);
    }
    return tagsRepository.create({ name, slug: slugify(name) });
  },

  async update(id: string, name: string): Promise<ITag> {
    const existing = await tagsRepository.findByName(name);
    if (existing && existing._id.toString() !== id) {
      throw ApiError.conflict('Tag already exists', ERROR_CODES.TAG_NAME_TAKEN);
    }
    const tag = await tagsRepository.update(id, { name, slug: slugify(name) });
    if (!tag) throw ApiError.notFound('Tag not found', ERROR_CODES.TAG_NOT_FOUND);
    return tag;
  },

  async remove(id: string): Promise<void> {
    const tag = await tagsRepository.remove(id);
    if (!tag) throw ApiError.notFound('Tag not found', ERROR_CODES.TAG_NOT_FOUND);
  },
};
