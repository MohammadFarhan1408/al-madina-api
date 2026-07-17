import { rolesRepository, permissionsRepository } from './roles.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import type { IRole } from '../../database/models';

export const rolesService = {
  listRoles() {
    return rolesRepository.findAll();
  },

  listPermissions() {
    return permissionsRepository.findAll();
  },

  async create(data: Partial<IRole>): Promise<IRole> {
    if (data.name && (await rolesRepository.findByName(data.name))) {
      throw ApiError.conflict('Role name already exists', ERROR_CODES.ROLE_NAME_TAKEN);
    }
    return rolesRepository.create(data);
  },

  async update(id: string, data: Partial<IRole>): Promise<IRole> {
    if (data.name) {
      const existing = await rolesRepository.findByName(data.name);
      if (existing && existing._id.toString() !== id) {
        throw ApiError.conflict('Role name already exists', ERROR_CODES.ROLE_NAME_TAKEN);
      }
    }
    const role = await rolesRepository.update(id, data);
    if (!role) throw ApiError.notFound('Role not found', ERROR_CODES.ROLE_NOT_FOUND);
    return role;
  },

  async remove(id: string): Promise<void> {
    const role = await rolesRepository.findById(id);
    if (!role) throw ApiError.notFound('Role not found', ERROR_CODES.ROLE_NOT_FOUND);
    if (role.isSystem) throw ApiError.badRequest('System roles cannot be deleted', ERROR_CODES.ROLE_IS_SYSTEM);
    await rolesRepository.remove(id);
  },
};
