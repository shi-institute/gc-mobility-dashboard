import { SimpleRenderer } from '@arcgis/core/renderers.js';
import { CIMSymbol } from '@arcgis/core/symbols.js';

export function createInterestAreaRenderer() {
  return new SimpleRenderer({
    symbol: new CIMSymbol({
      data: {
        type: 'CIMSymbolReference',
        symbol: {
          type: 'CIMPolygonSymbol',
          symbolLayers: [
            {
              type: 'CIMSolidStroke',
              effects: [
                {
                  type: 'CIMGeometricEffectOffset',
                  method: 'Square',
                  offset: 0,
                  option: 'Fast',
                },
                {
                  type: 'CIMGeometricEffectDashes',
                  dashTemplate: [16, 8, 2, 8],
                  lineDashEnding: 'NoConstraint',
                  customEndingOffset: 0,
                  offsetAlongLine: 0,
                },
              ],
              enable: true,
              capStyle: 'Square',
              joinStyle: 'Miter',
              miterLimit: 10,
              width: 1.5,
              color: [0, 0, 0, 255],
            },
            {
              type: 'CIMSolidStroke',
              effects: [
                {
                  type: 'CIMGeometricEffectOffset',
                  method: 'Square',
                  offset: -1.5,
                  option: 'Fast',
                },
              ],
              enable: true,
              capStyle: 'Square',
              joinStyle: 'Miter',
              miterLimit: 10,
              width: 4,
              color: [0, 0, 0, 40],
            },
          ],
        },
      },
    }),
  });
}
