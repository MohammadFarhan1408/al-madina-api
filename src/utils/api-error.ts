import { ERROR_CODES, type ErrorCode } from '../constants/error-codes';

/**
 * Operational error carrying an HTTP status, a machine-readable code, and
 * optional structured details. Thrown anywhere in the request lifecycle and
 * translated into the standard error envelope by the global error handler.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational = true;

  constructor(
    status: number,
    message: string,
    code: ErrorCode = ERROR_CODES.INTERNAL_ERROR,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', code: ErrorCode = ERROR_CODES.BAD_REQUEST, details?: Record<string, unknown>) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'Unauthorized', code: ErrorCode = ERROR_CODES.UNAUTHORIZED) {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'Forbidden', code: ErrorCode = ERROR_CODES.FORBIDDEN) {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Resource not found', code: ErrorCode = ERROR_CODES.NOT_FOUND) {
    return new ApiError(404, message, code);
  }

  static conflict(message = 'Conflict', code: ErrorCode, details?: Record<string, unknown>) {
    return new ApiError(409, message, code, details);
  }

  static unprocessable(message = 'Validation failed', details?: Record<string, unknown>) {
    return new ApiError(422, message, ERROR_CODES.VALIDATION_ERROR, details);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, ERROR_CODES.INTERNAL_ERROR);
  }
}
