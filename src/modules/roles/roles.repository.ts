import { Types } from 'mongoose';
import { Role, Permission, type IRole, type IPermission } from '../../database/models';

export const rolesRepository = {
  findAll(): Promise<IRole[]> {
    return Role.find().sort({ isSystem: -1, name: 1 }).populate('permissionIds').lean<IRole[]>().exec();
  },

  findById(id: string): Promise<IRole | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Role.findById(id).populate('permissionIds').exec();
  },

  findByName(name: string): Promise<IRole | null> {
    return Role.findOne({ name }).exec();
  },

  create(data: Partial<IRole>): Promise<IRole> {
    return Role.create(data);
  },

  update(id: string, data: Partial<IRole>): Promise<IRole | null> {
    return Role.findByIdAndUpdate(id, { $set: data }, { new: true }).populate('permissionIds').exec();
  },

  remove(id: string): Promise<IRole | null> {
    return Role.findByIdAndDelete(id).exec();
  },
};

export const permissionsRepository = {
  findAll(): Promise<IPermission[]> {
    return Permission.find().sort({ module: 1, label: 1 }).lean<IPermission[]>().exec();
  },
};
