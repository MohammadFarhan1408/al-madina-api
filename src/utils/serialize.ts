/**
 * Recursively normalise a value for the API response envelope so the output
 * always matches the spec's contracts regardless of how it was produced:
 *
 * - Mongoose documents are converted via their `toJSON` (applies schema
 *   transforms, e.g. stripping passwordHash).
 * - Lean objects and aggregation results — which bypass schema transforms — get
 *   `_id` renamed to a string `id`, and `__v` removed.
 * - ObjectId values are stringified; Dates are left intact (Express serialises
 *   them to ISO strings).
 */
export function serialize<T>(value: T): unknown {
  return normalize(value);
}

function isObjectId(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  // bson has used both 'ObjectID' and 'ObjectId' as the discriminator.
  const tag = (v as { _bsontype?: string })._bsontype;
  return tag === 'ObjectID' || tag === 'ObjectId';
}

function hasToJSON(v: unknown): v is { toJSON: () => unknown } {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { toJSON?: unknown }).toJSON === 'function' &&
    // Exclude Date, whose toJSON we want to leave to Express.
    !(v instanceof Date)
  );
}

function normalize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (isObjectId(value)) return String(value);
  if (Array.isArray(value)) return value.map(normalize);

  // Mongoose documents / subdocuments — apply their schema transform first.
  if (hasToJSON(value)) {
    return normalize(value.toJSON());
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key === '__v') continue;
      if (key === '_id') {
        out.id = isObjectId(val) ? String(val) : normalize(val);
        continue;
      }
      out[key] = normalize(val);
    }
    return out;
  }

  return value;
}
