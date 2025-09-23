/**
 * Parses a string into an integer.
 *
 * Unlike `parseInt`, this function returns `null` for invalid inputs instead of `NaN`.
 */
export function tryParseInt(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}
