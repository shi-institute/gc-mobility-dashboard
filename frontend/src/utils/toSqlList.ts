/**
 * Converts an array of primitive values (strings or numbers) into a
 * SQL-formatted string list.
 *
 * - String items will be escaped for single quotes and wrapped in single quotes.
 * - Number items will be converted directly to their string representation.
 *
 * The resulting values are joined by a comma and space.
 *
 * @param items The array of strings or numbers to convert.
 * @returns A SQL-formatted string list suitable for use with SQL IN clauses.
 *
 * @example
 * ```typescript
 * const fruits = ['apple', 'banana', 'orange'];
 * const sqlString = toSqlList(fruits);
 * // Expected output: "'apple', 'banana', 'orange'"
 *
 * const itemsWithQuotes = ["john's", "mary's book"];
 * const sqlStringWithQuotes = toSqlList(itemsWithQuotes);
 * // Expected output: "'john''s', 'mary''s book'"
 *
 * const productIds = [101, 205, 310];
 * const sqlIds = toSqlList(productIds);
 * // Expected output: "101, 205, 310"
 *
 * const mixedItems = ['test', 42, "another's"];
 * const sqlMixed = toSqlList(mixedItems);
 * // Expected output: "'test', 42, 'another''s'"
 * ```
 */
export function toSqlList(items: Array<string | number>): string {
  return items
    .map((item) => {
      if (typeof item === 'string') {
        return `'${item.replace(/'/g, "''")}'`;
      }
      return item; // numbers don't need quotes or escaping
    })
    .join(', ');
}
