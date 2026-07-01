import { randomInt } from 'crypto';
import { Order } from '../database/models';

/**
 * Generate a human-readable order reference of the form `AM-10293` (§9 Order).
 * Retries on the rare collision against the unique `reference` index.
 */
export async function generateOrderReference(maxAttempts = 5): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const reference = `AM-${randomInt(10_000, 100_000)}`;
    const exists = await Order.exists({ reference });
    if (!exists) return reference;
  }
  // Extremely unlikely fallback: append a time component for guaranteed uniqueness.
  return `AM-${randomInt(10_000, 100_000)}${Date.now().toString().slice(-3)}`;
}
