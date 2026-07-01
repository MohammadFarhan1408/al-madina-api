import type { UserRole, UserTier } from '../constants/business';

/** Standard success envelope (§10 Response Envelope). */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** Standard error envelope (§10 Error Envelope). */
export interface ApiErrorResponse {
  status: number;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

/** Paginated list payload (§16 Pagination). */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/** Decoded JWT access-token payload (§12 Token Payload). */
export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  tier: UserTier;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/** Shape attached to `req.user` by the auth middleware. */
export interface AuthUser {
  id: string;
  email: string;
  tier: UserTier;
  role: UserRole;
}
