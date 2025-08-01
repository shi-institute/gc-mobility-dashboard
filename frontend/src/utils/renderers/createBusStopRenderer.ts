import { SimpleRenderer } from '@arcgis/core/renderers.js';
import SizeVariable from '@arcgis/core/renderers/visualVariables/SizeVariable';
import { CIMSymbol } from '@arcgis/core/symbols';

export function createBusStopRenderer() {
  return new SimpleRenderer({
    symbol: new CIMSymbol({
      data: {
        type: 'CIMSymbolReference',
        symbol: {
          type: 'CIMPointSymbol',
          symbolLayers: [
            {
              type: 'CIMVectorMarker',
              enable: true,
              anchorPointUnits: 'Relative',
              size: 40,
              frame: {
                xmin: 0,
                ymin: 0,
                xmax: 21,
                ymax: 21,
              },
              markerGraphics: [
                {
                  type: 'CIMMarkerGraphic',
                  geometry: {
                    rings: [
                      [
                        [10.5, 18],
                        [11.74, 17.94],
                        [12.98, 17.75],
                        [14.14, 17.46],
                        [15.15, 17.08],
                        [15.95, 16.63],
                        [16.53, 16.13],
                        [16.88, 15.58],
                        [17, 15],
                        [17, 5],
                        [16, 5],
                        [16, 3.5],
                        [15.85, 3.15],
                        [15.5, 3],
                        [14.5, 3],
                        [14.15, 3.15],
                        [14, 3.5],
                        [14, 5],
                        [7, 5],
                        [7, 3.5],
                        [6.85, 3.15],
                        [6.5, 3],
                        [5.5, 3],
                        [5.15, 3.15],
                        [5, 3.5],
                        [5, 5],
                        [4, 5],
                        [4, 15],
                        [4.12, 15.58],
                        [4.47, 16.13],
                        [5.05, 16.63],
                        [5.85, 17.08],
                        [6.86, 17.46],
                        [8.02, 17.75],
                        [9.26, 17.94],
                        [10.5, 18],
                      ],
                      [
                        [7, 16],
                        [7, 15],
                        [14, 15],
                        [14, 16],
                        [7, 16],
                      ],
                      [
                        [7, 6.5],
                        [7, 7.5],
                        [6.86, 7.86],
                        [6.5, 8],
                        [5.5, 8],
                        [5.14, 7.86],
                        [5, 7.5],
                        [5, 6.5],
                        [5.15, 6.15],
                        [5.5, 6],
                        [6.5, 6],
                        [6.85, 6.15],
                        [7, 6.5],
                      ],
                      [
                        [16, 6.5],
                        [16, 7.5],
                        [15.86, 7.86],
                        [15.5, 8],
                        [14.5, 8],
                        [14.15, 7.86],
                        [14, 7.5],
                        [14, 6.5],
                        [14.15, 6.15],
                        [14.5, 6],
                        [15.5, 6],
                        [15.85, 6.15],
                        [16, 6.5],
                      ],
                      [
                        [16, 9],
                        [16, 14],
                        [5, 14],
                        [5, 9],
                        [16, 9],
                      ],
                    ],
                  },
                  symbol: {
                    type: 'CIMPolygonSymbol',
                    symbolLayers: [
                      {
                        type: 'CIMSolidStroke',
                        enable: true,
                        capStyle: 'Round',
                        joinStyle: 'Round',
                        miterLimit: 10,
                        width: 0,
                        color: [0, 0, 0, 255],
                      },
                      {
                        type: 'CIMSolidFill',
                        enable: true,
                        color: [255, 255, 255, 255],
                      },
                    ],
                  },
                },
              ],
              scaleSymbolsProportionally: true,
              respectFrame: true,
              colorLocked: true,
            },
            {
              type: 'CIMVectorMarker',
              enable: true,
              anchorPointUnits: 'Relative',
              size: 40,
              frame: {
                xmin: 0,
                ymin: 0,
                xmax: 17,
                ymax: 17,
              },
              markerGraphics: [
                {
                  type: 'CIMMarkerGraphic',
                  geometry: {
                    rings: [
                      [
                        [11.77, 0],
                        [5.23, 0],
                        [4.21, 0.1],
                        [3.24, 0.4],
                        [2.33, 0.88],
                        [1.54, 1.54],
                        [0.88, 2.33],
                        [0.4, 3.24],
                        [0.1, 4.21],
                        [0, 5.23],
                        [0, 11.77],
                        [0.1, 12.79],
                        [0.4, 13.77],
                        [0.88, 14.67],
                        [1.54, 15.46],
                        [2.33, 16.12],
                        [3.23, 16.6],
                        [4.21, 16.9],
                        [5.23, 17],
                        [11.77, 17],
                        [12.79, 16.9],
                        [13.77, 16.6],
                        [14.67, 16.12],
                        [15.46, 15.46],
                        [16.12, 14.67],
                        [16.6, 13.77],
                        [16.9, 12.79],
                        [17, 11.77],
                        [17, 5.23],
                        [16.9, 4.21],
                        [16.6, 3.24],
                        [16.12, 2.33],
                        [15.46, 1.54],
                        [14.67, 0.88],
                        [13.76, 0.4],
                        [12.79, 0.1],
                        [11.77, 0],
                      ],
                    ],
                  },
                  symbol: {
                    type: 'CIMPolygonSymbol',
                    symbolLayers: [
                      {
                        type: 'CIMSolidStroke',
                        enable: true,
                        capStyle: 'Round',
                        joinStyle: 'Round',
                        miterLimit: 10,
                        width: 0,
                        color: [0, 0, 0, 255],
                      },
                      {
                        type: 'CIMSolidFill',
                        enable: true,
                        color: [51, 51, 51, 255],
                      },
                    ],
                  },
                },
              ],
              scaleSymbolsProportionally: true,
              respectFrame: true,
            },
          ],
          animations: [],
        },
      },
    }),
    visualVariables: [
      new SizeVariable({
        valueExpression: '$view.scale',
        stops: [
          { size: 2, value: 360000 },
          { size: 4, value: 240000 },
          { size: 8, value: 12000 },
          { size: 16, value: 0 },
        ],
      }),
    ],
  });
}
