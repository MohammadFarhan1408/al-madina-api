/** Escape user text so it can sit inside a RegExp as a literal. */
export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
