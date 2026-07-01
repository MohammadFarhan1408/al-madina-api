import { hashPassword, comparePassword, generateOpaqueToken, hashToken } from '../../src/utils/hash';
import { signAccessToken, verifyAccessToken } from '../../src/utils/jwt';
import { normalizePagination } from '../../src/utils/paginate';
import { stripHtml } from '../../src/utils/sanitize';
import { serialize } from '../../src/utils/serialize';
import { ApiError } from '../../src/utils/api-error';

describe('hash utils', () => {
  it('round-trips a password and rejects a wrong one', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).not.toBe('secret123');
    await expect(comparePassword('secret123', hash)).resolves.toBe(true);
    await expect(comparePassword('wrong', hash)).resolves.toBe(false);
  });

  it('produces a stable SHA-256 hash for opaque tokens', () => {
    const { token, hash } = generateOpaqueToken();
    expect(token).toHaveLength(64);
    expect(hashToken(token)).toBe(hash);
  });
});

describe('jwt utils', () => {
  it('signs and verifies an access token', () => {
    const token = signAccessToken({ sub: 'u1', email: 'a@b.com', tier: 'Member', role: 'user' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('user');
    expect(payload.exp).toBeDefined();
  });

  it('throws ApiError for a tampered token', () => {
    expect(() => verifyAccessToken('not-a-jwt')).toThrow(ApiError);
  });
});

describe('pagination clamp (§16)', () => {
  it('applies defaults', () => {
    expect(normalizePagination()).toEqual({ page: 1, limit: 20 });
  });
  it('caps the limit at 50 and floors page at 1', () => {
    expect(normalizePagination(0, 999)).toEqual({ page: 1, limit: 50 });
  });
});

describe('sanitize', () => {
  it('strips all HTML tags', () => {
    expect(stripHtml('<script>alert(1)</script>Hello <b>World</b>')).toBe('Hello World');
  });
});

describe('serialize', () => {
  it('renames _id to a string id and drops __v', () => {
    const input = { _id: { _bsontype: 'ObjectId', toString: () => 'abc123' }, name: 'X', __v: 0 };
    const out = serialize(input) as Record<string, unknown>;
    expect(out.id).toBe('abc123');
    expect(out).not.toHaveProperty('_id');
    expect(out).not.toHaveProperty('__v');
    expect(out.name).toBe('X');
  });

  it('handles nested arrays of documents', () => {
    const out = serialize({ items: [{ _id: { _bsontype: 'ObjectId', toString: () => 'i1' }, q: 2 }] }) as {
      items: Record<string, unknown>[];
    };
    expect(out.items[0].id).toBe('i1');
    expect(out.items[0]).not.toHaveProperty('_id');
  });
});
