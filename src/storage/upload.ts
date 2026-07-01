import { cloudinary } from '../config/cloudinary';
import { config } from '../config';
import { ApiError } from '../utils/api-error';
import { ERROR_CODES } from '../constants/error-codes';
import { UPLOAD_LIMITS } from '../constants/business';

export type UploadType = 'product' | 'avatar' | 'category' | 'collection';

export interface UploadResult {
  url: string;
  publicId: string;
}

/** Folder + transformation presets per upload type (§13 File Upload). */
const PRESETS: Record<UploadType, { folder: string; transformation: Record<string, unknown>[]; maxBytes: number }> = {
  product: {
    folder: 'almadina/products',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    maxBytes: UPLOAD_LIMITS.PRODUCT_MAX_BYTES,
  },
  avatar: {
    folder: 'almadina/users',
    transformation: [{ width: 300, height: 300, crop: 'thumb', gravity: 'face', quality: 'auto' }],
    maxBytes: UPLOAD_LIMITS.AVATAR_MAX_BYTES,
  },
  category: {
    folder: 'almadina/categories',
    transformation: [{ width: 800, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
    maxBytes: UPLOAD_LIMITS.CATEGORY_MAX_BYTES,
  },
  collection: {
    folder: 'almadina/collections',
    transformation: [{ width: 800, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
    maxBytes: UPLOAD_LIMITS.CATEGORY_MAX_BYTES,
  },
};

/**
 * Stream an in-memory file buffer to Cloudinary with the preset for its type.
 * Per-type byte limits are enforced here (the Multer cap is the global max).
 */
export function uploadToCloudinary(
  file: Express.Multer.File,
  type: UploadType,
): Promise<UploadResult> {
  if (!config.cloudinary.enabled) {
    throw ApiError.internal('Image uploads are not configured');
  }

  const preset = PRESETS[type];
  if (file.size > preset.maxBytes) {
    throw new ApiError(
      400,
      `File exceeds the ${Math.round(preset.maxBytes / (1024 * 1024))}MB limit for ${type} uploads`,
      ERROR_CODES.FILE_TOO_LARGE,
    );
  }

  return new Promise<UploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: preset.folder, transformation: preset.transformation, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          reject(ApiError.internal('Image upload failed'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(file.buffer);
  });
}
