import sanitizeHtml from 'sanitize-html';

/**
 * Strip all HTML/markup from user-generated text (reviews, contact messages),
 * preventing stored XSS (§18 Input Sanitization). No tags or attributes are
 * allowed — output is plain text with entities decoded back to characters.
 */
export function stripHtml(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  }).trim();
}

/**
 * Escape regex metacharacters so user-supplied search terms can be safely used
 * in a MongoDB `$regex` query without altering the pattern or enabling ReDoS
 * via crafted input (§18 Input Sanitization).
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
