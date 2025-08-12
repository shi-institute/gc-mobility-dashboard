/**
 * Creates a function that transforms untidy data into tidy format for nominal data visualization.
 *
 * @param domainMap - A mapping object that translates data keys to display group names
 * @param labelKey - The property name in the data objects to use as the label identifier
 *
 * @returns A function that accepts untidy data and returns tidy data with the following structure:
 * - `label`: The identifier from the original data object
 * - `group`: The mapped group name from domainMap (or original key if not mapped)
 * - `value`: The numerical value from the original data
 * - `fraction`: The value as a fraction of the total numerical values in that data object
 *
 * @example
 * ```typescript
 * const domainMap = { sales: 'Sales Revenue', profit: 'Net Profit' };
 * const transformer = toTidyNominal(domainMap, 'quarter');
 * const untidyData = [{ quarter: 'Q1', sales: 1000, profit: 200 }];
 * const tidyData = transformer(untidyData);
 * // Returns: [
 * //   { label: 'Q1', group: 'Sales Revenue', value: 1000, fraction: 0.833 },
 * //   { label: 'Q1', group: 'Net Profit', value: 200, fraction: 0.167 }
 * // ]
 * ```
 */
export function toTidyNominal(domainMap: Record<string, string>, labelKey?: string) {
  // return a function that transforms untidy data into tidy format
  return (untidyData: Record<string, unknown>[]) => {
    // interate over each object in the untidy data
    return untidyData.flatMap((d) => {
      const numericalEntries = Object.entries(d).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number'
      );

      // calculate the total so we can calculate the fraction
      const total =
        numericalEntries.map(([, val]) => val).reduce((sum, value) => sum + (value || 0), 0) || 0;

      const tidyData = numericalEntries.map(([key, value]) => ({
        label: labelKey ? (d[labelKey] as string) : undefined,
        group: domainMap[key] || key,
        value,
        fraction: (value || 0) / total,
      }));

      return tidyData;
    });
  };
}
