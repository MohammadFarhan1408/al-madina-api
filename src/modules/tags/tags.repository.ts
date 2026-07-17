import { Types } from 'mongoose';
import { Tag, type ITag } from '../../database/models';

export const tagsRepository = {
  findAll(): Promise<ITag[]> {
    return Tag.find().sort({ name: 1 }).lean<ITag[]>().exec();
  },

  findByName(name: string): Promise<ITag | null> {
    return Tag.findOne({ name }).exec();
  },

  exists(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(false);
    return Tag.exists({ _id: id }).then((doc) => Boolean(doc));
  },

  create(data: Partial<ITag>): Promise<ITag> {
    return Tag.create(data);
  },

  update(id: string, data: Partial<ITag>): Promise<ITag | null> {
    return Tag.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  },

  remove(id: string): Promise<ITag | null> {
    return Tag.findByIdAndDelete(id).exec();
  },
};
