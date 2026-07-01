import type { AuthUser } from './api.types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by auth middleware when a valid Bearer token is present. */
      user?: AuthUser;
    }
  }
}

export {};
