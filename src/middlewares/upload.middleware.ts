import multer, { type FileFilterCallback } from 'multer';
import type { Request, RequestHandler } from 'express';
import { ApiError } from '../utils/api-error';
import { ERROR_CODES } from '../constants/error-codes';
import { UPLOAD_LIMITS } from '../constants/business';

/**
 * Multer in-memory storage — files are held as buffers and streamed straight to
 * Cloudinary (§13 "No direct filesystem storage"). The largest per-type limit
 * (10 MB) is enforced here; per-type byte limits are checked again in the
 * upload service based on the `?type` query.
 */
function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if ((UPLOAD_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      ApiError.badRequest(
        `Unsupported file type: ${file.mimetype}. Allowed: ${UPLOAD_LIMITS.ALLOWED_MIME_TYPES.join(', ')}`,
        ERROR_CODES.INVALID_FILE_TYPE,
      ),
    );
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: UPLOAD_LIMITS.PRODUCT_MAX_BYTES },
});

/** Single file under the given field (default `file`). */
export function uploadSingle(field = 'file'): RequestHandler {
  return upload.single(field);
}

/** Multiple files under the given field (e.g. product gallery). */
export function uploadMultiple(field = 'files', maxCount = 8): RequestHandler {
  return upload.array(field, maxCount);
}
