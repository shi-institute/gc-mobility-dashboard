export function requireKey<T, K extends keyof T>(
  key: K
): (data: T) => data is T & {
  [P in K]: NonNullable<T[P]>;
} {
  return (data): data is T & { [P in K]: NonNullable<T[P]> } => data[key] !== null;
}
