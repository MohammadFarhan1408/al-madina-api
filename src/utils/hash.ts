import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { config } from '../config';

/** Hash a plaintext password with bcrypt (cost from config, §12 rounds 12). */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.bcrypt.rounds);
}

/** Constant-time compare of a plaintext password against a bcrypt hash. */
export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Generate a cryptographically random opaque token (returned to the client)
 * together with its SHA-256 hash (stored in the DB). The plaintext is never
 * persisted — refresh and password-reset tokens are looked up by hash.
 */
export function generateOpaqueToken(bytes = 32): { token: string; hash: string } {
  const token = randomBytes(bytes).toString('hex');
  return { token, hash: hashToken(token) };
}

/** Deterministic SHA-256 hash used to store/look up opaque tokens. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
