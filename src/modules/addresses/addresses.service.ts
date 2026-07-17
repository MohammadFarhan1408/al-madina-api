import { addressesRepository } from './addresses.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import type { IAddress } from '../../database/models';

export const addressesService = {
  list(userId: string) {
    return addressesRepository.listForUser(userId);
  },

  async create(userId: string, data: Partial<IAddress>): Promise<IAddress> {
    if (data.isDefault) await addressesRepository.clearDefault(userId);
    return addressesRepository.create(userId, data);
  },

  async update(id: string, userId: string, data: Partial<IAddress>): Promise<IAddress> {
    if (data.isDefault) await addressesRepository.clearDefault(userId);
    const address = await addressesRepository.update(id, userId, data);
    if (!address) throw ApiError.notFound('Address not found', ERROR_CODES.ADDRESS_NOT_FOUND);
    return address;
  },

  async remove(id: string, userId: string): Promise<void> {
    const address = await addressesRepository.remove(id, userId);
    if (!address) throw ApiError.notFound('Address not found', ERROR_CODES.ADDRESS_NOT_FOUND);
  },
};
