/**
 * Whether a given object has a given key.
 */
export function hasKey<K extends string>(
  object: object,
  key: K
): object is { [key in K]: unknown } {
  return object !== undefined && object !== null && typeof object === 'object' && key in object;
}
