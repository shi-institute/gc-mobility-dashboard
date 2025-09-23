/**
 * Parses a string, but only allows specific values.
 */
export function strictParseString<T extends string>(
  value: string | null,
  allowedValues: T[],
  defaultValue: T
): T {
  if (value === null) {
    return defaultValue;
  }
  if (allowedValues.includes(value as T)) {
    return value as T;
  }
  return defaultValue;
}
