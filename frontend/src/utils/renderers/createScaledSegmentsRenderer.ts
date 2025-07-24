import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer.js';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol.js';
import { withOpacity } from '../withOpacity';

/**
 * Create the renderer for scaled segments based on the frequency bucket.
 *
 * This function expected the field to only contain integers from 1 to 10.
 *
 * @param field The name of the field to use for the renderer. Defaults to `'frequency_bucket'`.
 * @param color The color to use for the segments. Defaults to `'rgb(0, 102, 255)'` (vibrant blue).
 * @returns A `ClassBreaksRenderer` configured with the specified field and color.
 */
export function createScaledSegmentsRenderer(
  field = 'frequency_bucket',
  color = 'rgb(0, 102, 255)'
) {
  return new ClassBreaksRenderer({
    field,
    classBreakInfos: [
      {
        minValue: 1,
        maxValue: 2,
        symbol: new SimpleLineSymbol({
          color: withOpacity(color, 0.2),
          width: 0.1,
        }),
      },
      {
        minValue: 3,
        maxValue: 4,
        symbol: new SimpleLineSymbol({
          color: withOpacity(color, 0.4),
          width: 1,
        }),
      },
      {
        minValue: 5,
        maxValue: 6,
        symbol: new SimpleLineSymbol({
          color: withOpacity(color, 0.6),
          width: 2,
        }),
      },
      {
        minValue: 7,
        maxValue: 8,
        symbol: new SimpleLineSymbol({
          color: withOpacity(color, 0.8),
          width: 3,
        }),
      },
      {
        minValue: 9,
        maxValue: 10,
        symbol: new SimpleLineSymbol({
          color,
          width: 4,
        }),
      },
    ],
  });
}
