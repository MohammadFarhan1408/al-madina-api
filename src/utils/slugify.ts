/** Lowercase, hyphenated slug from a display name (e.g. "Royal Oud" -> "royal-oud"). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
