import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js';
import { CustomContent } from '@arcgis/core/popup/content';
import PopupTemplate from '@arcgis/core/PopupTemplate.js';
import { SimpleRenderer } from '@arcgis/core/renderers';
import { SimpleFillSymbol } from '@arcgis/core/symbols';
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { useAppData } from '.';
import { GeoJSONLayerInit } from '../components/common/Map/types';
import { notEmpty, requireKey } from '../utils';
import { createBusStopRenderer, createInterestAreaRenderer } from '../utils/renderers';

type AppData = ReturnType<typeof useAppData>['data'];

export function useMapData(data: AppData) {
  const networkSegments = useMemo(() => {
    const validSegmentsStylesByAreaAndSeason = (data || [])
      .filter(notEmpty)
      .filter(requireKey('network_segments_style'));

    interface InterpolateInput {
      minbound: number;
      maxbound: number;
      minboundvalue: number;
      maxboundvalue: number;
    }

    function interpolate(input: InterpolateInput) {
      return [
        'interpolate',
        ['linear'],
        ['zoom'],
        input.minbound,
        input.minboundvalue,
        input.maxbound,
        input.maxboundvalue,
      ];
    }

    return validSegmentsStylesByAreaAndSeason.map((data) => {
      const modifiedStyle = {
        ...data.network_segments_style,
        layers: [
          {
            ...data.network_segments_style.layers[0],
            paint: {
              'line-color': 'rgb(0, 102, 255)',
              'line-width': [
                'case',
                ['<=', ['get', 'frequency_bucket'], 2],
                interpolate({ minbound: 9, minboundvalue: 0.1, maxbound: 15, maxboundvalue: 1 }),
                ['<=', ['get', 'frequency_bucket'], 4],
                interpolate({ minbound: 9, minboundvalue: 1, maxbound: 15, maxboundvalue: 2 }),
                ['<=', ['get', 'frequency_bucket'], 6],
                interpolate({ minbound: 9, minboundvalue: 2, maxbound: 15, maxboundvalue: 3 }),
                ['<=', ['get', 'frequency_bucket'], 8],
                interpolate({ minbound: 9, minboundvalue: 3, maxbound: 15, maxboundvalue: 4 }),
                ['<=', ['get', 'frequency_bucket'], 10],
                interpolate({ minbound: 9, minboundvalue: 4, maxbound: 15, maxboundvalue: 5 }),
                0.1,
              ],
            } satisfies mapboxgl.LinePaint,
          },
        ],
      };

      return new VectorTileLayer({
        title: `Network Segments (${data.__area} ${data.__year} ${data.__quarter})`,
        id: `network-segments__${data.__area}_${data.__year}_${data.__quarter}`,
        style: modifiedStyle,
      });
    });
  }, [data]);

  const areaPolygons = useMemo(() => {
    const groupedByArea = Object.groupBy(data || [], (resolved) => resolved.__area);

    const uniqueAreaPolygons = Object.entries(groupedByArea).flatMap(
      ([areaName, areaSeasonSeries]) => {
        return {
          areaName,
          polygon: areaSeasonSeries
            ?.filter(notEmpty)
            ?.map(({ polygon }) => polygon)
            .filter(notEmpty)
            .slice(0, 1)?.[0],
        };
      }
    );

    return uniqueAreaPolygons
      .map(({ areaName, polygon }) => {
        if (!polygon) {
          return null;
        }

        return {
          title: `${areaName} Boundary`,
          id: `area-polygon__${areaName}`,
          data: polygon,
          renderer: createInterestAreaRenderer(),
        } satisfies GeoJSONLayerInit;
      })
      .filter(notEmpty);
  }, [data]);

  const selectedAreasAndSeasonsRidership = useMemo(() => {
    const filteredData = (data || [])
      .map(({ ridership, __year, __quarter }) => ({ ridership, __year, __quarter }))
      .reduce((acc, curr) => {
        const currentYear = curr.__year;
        const currentQuarter = curr.__quarter;
        const ridershipData = (curr.ridership || []).map((r) => {
          return {
            ...r,
            __year: currentYear,
            __quarter: currentQuarter,
          };
        });

        return [...acc, ...ridershipData];
      }, [] as (NonNullable<NonNullable<AppData>[0]['ridership']>[0] & { __year: number; __quarter: 'Q2' | 'Q4' })[])
      .map((ridershipData) => {
        const season = `${ridershipData.__quarter}:${ridershipData.__year}`;
        return { season, ...ridershipData };
      });

    const groupedByStop = Object.groupBy(filteredData, (r) => r.stop_point);

    const groupedByStopAndSeason = Object.fromEntries(
      Object.entries(groupedByStop).map(([stopPoint, ridershipData]) => {
        const ridershipBySeason = Object.groupBy(ridershipData || [], (r) => r.season);
        return [stopPoint, ridershipBySeason] as const;
      })
    );

    return groupedByStopAndSeason;
  }, [data]);

  const routes = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('routes'))
        // only keep the first occurrence because it would be confusing to show routes on top of each other over time
        .slice(0, 1)
        .map(({ routes, __quarter, __year }) => {
          return {
            title: `Routes (${__year} ${__quarter})`,
            id: `routes__${__year}_${__quarter}`,
            data: routes,
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const stops = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('stops'))
        // only keep the first occurrence
        .slice(0, 1)
        .map(({ __quarter, __year, stops }) => {
          return {
            title: `Stops (${__year} ${__quarter})`,
            data: stops,
            renderer: createBusStopRenderer(),
            minScale: 240000, // do not show bus stops at scales larger than 1:240,000
            popupEnabled: true,
            popupTemplate: new PopupTemplate({
              title: `{Name} (${__year} ${__quarter})`,
              content: [
                new CustomContent({
                  outFields: ['*'],
                  creator: (event) => {
                    const stopRidership = Object.entries(
                      selectedAreasAndSeasonsRidership[event?.graphic.attributes.ID]
                    ).map(([season, ridership]) => {
                      return [
                        season,
                        {
                          alightings:
                            ridership?.reduce((acc, r) => acc + (r.alighting || 0), 0) || 0,
                          boardings: ridership?.reduce((acc, r) => acc + (r.boarding || 0), 0) || 0,
                        },
                      ] as const;
                    });

                    const rootElem = document.createElement('div');
                    createRoot(rootElem).render(
                      <div>
                        {stopRidership.map(([season, stats]) => {
                          return (
                            <div key={season}>
                              <h3>{season}</h3>
                              <p>Boardings: {stats.boardings}</p>
                              <p>Alightings: {stats.alightings}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                    return rootElem;
                  },
                }),
              ],
            }),
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const walkServiceAreas = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('walk_service_area'))
        // only keep the first occurrence because it would be confusing to show
        // the service areas top of each other for each selected season
        .slice(0, 1)
        .map(({ walk_service_area, __quarter, __year }) => {
          return {
            title: `0.5-Mile Walking Radius from Stops (${__year} ${__quarter})`,
            id: `walk-service-area__${__year}_${__quarter}`,
            data: walk_service_area,
            renderer: serviceAreaRenderer,
            visible: false,
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const cyclingServiceAreas = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('bike_service_area'))
        // only keep the first occurrence because it would be confusing to show
        // the service areas top of each other for each selected season
        .slice(0, 1)
        .map(({ bike_service_area, __quarter, __year }) => {
          return {
            title: `15-Minute Cycling Radius from Stops (at 15 mph) (${__year} ${__quarter})`,
            id: `bike-service-area__${__year}_${__quarter}`,
            data: bike_service_area,
            renderer: serviceAreaRenderer,
            visible: false,
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const paratransitServiceAreas = useMemo(() => {
    return (
      (data || [])
        .filter(requireKey('paratransit_service_area'))
        .filter(notEmpty)
        // only keep the first occurrence because it would be confusing to show
        // the buffers top of each other for each selected season
        .slice(0, 1)
        .map(({ paratransit_service_area, __quarter, __year }) => {
          return {
            title: `Paratransit Service Area (${__year} ${__quarter})`,
            id: `paratransit-service-area__${__year}_${__quarter}`,
            data: paratransit_service_area,
            renderer: serviceAreaRenderer,
            visible: false,
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  return {
    networkSegments,
    areaPolygons,
    routes,
    stops,
    walkServiceAreas,
    cyclingServiceAreas,
    paratransitServiceAreas,
  };
}

const serviceAreaRenderer = new SimpleRenderer({
  symbol: new SimpleFillSymbol({
    color: [255, 255, 255, 0.32],
    outline: {
      color: [0, 0, 0, 0.36],
      width: 1,
    },
  }),
});
