import Color from '@arcgis/core/Color';
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js';
import { CustomContent, FieldsContent } from '@arcgis/core/popup/content';
import PopupTemplate from '@arcgis/core/PopupTemplate.js';
import { SimpleRenderer } from '@arcgis/core/renderers';
import SizeVariable from '@arcgis/core/renderers/visualVariables/SizeVariable';
import { SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol } from '@arcgis/core/symbols';
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
            renderer: new SimpleRenderer({
              symbol: new SimpleLineSymbol({
                color: new Color([220, 119, 24, 1]),
                width: 2,
                style: 'solid',
              }),
            }),
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
                      selectedAreasAndSeasonsRidership[event?.graphic.attributes.ID] || {}
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

  const groceryStores = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('grocery_store_locations'))
        // only keep the first occurrence because it would be confusing to show grocery stores on top of each other over time
        .slice(0, 1)
        .map(({ grocery_store_locations, __quarter, __year }) => {
          return {
            title: `Grocery Stores (${__year} ${__quarter})`,
            id: `grocery-stores__${__year}_${__quarter}`,
            data: grocery_store_locations,
            renderer: new SimpleRenderer({
              symbol: new SimpleMarkerSymbol({
                angle: 60,
                color: new Color([71, 245, 170, 1]),
                outline: new SimpleLineSymbol({
                  color: new Color([39, 98, 84, 1]),
                  style: 'solid',
                  width: 1,
                }),
                style: 'triangle',
              }),
              visualVariables: [
                new SizeVariable({
                  valueExpression: '$view.scale',
                  stops: [
                    { size: 2, value: 360000 },
                    { size: 4, value: 240000 },
                    { size: 12, value: 12000 },
                    { size: 20, value: 0 },
                  ],
                }),
              ],
            }),
            popupEnabled: true,
            popupTemplate: new PopupTemplate({
              title: `{Company Name} (${__year} ${__quarter})`,
              content: [
                new FieldsContent({
                  title: 'Grocery Store Details',
                  fieldInfos: Object.keys(
                    grocery_store_locations.features[0]?.properties || {}
                  ).map((fieldName) => {
                    return {
                      fieldName,
                      label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                    };
                  }),
                }),
              ],
            }),
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const healthcareFacilities = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('healthcare_locations'))
        // only keep the first occurrence because it would be confusing to show healthcare facilities on top of each other over time
        .slice(0, 1)
        .map(({ healthcare_locations, __quarter, __year }) => {
          return {
            title: `Healthcare Facilities (${__year} ${__quarter})`,
            id: `healthcare-facilities__${__year}_${__quarter}`,
            data: healthcare_locations,
            popupEnabled: true,
            // TODO: add a facy renderer with a medical symbol
            popupTemplate: new PopupTemplate({
              title: `{Name} (${__year} ${__quarter})`,
              content: [
                new FieldsContent({
                  title: 'Healthcare Facility Details',
                  fieldInfos: Object.keys(healthcare_locations.features[0]?.properties || {}).map(
                    (fieldName) => {
                      return {
                        fieldName,
                        label: fieldName
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase()),
                      };
                    }
                  ),
                }),
              ],
            }),
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const childCareCenters = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('child_care_locations'))
        // only keep the first occurrence because it would be confusing to show child care centers on top of each other over time
        .slice(0, 1)
        .map(({ child_care_locations, __quarter, __year }) => {
          return {
            title: `Child Care Centers (${__year} ${__quarter})`,
            id: `child-care-centers__${__year}_${__quarter}`,
            data: child_care_locations,
            renderer: new SimpleRenderer({
              symbol: new SimpleMarkerSymbol({
                angle: 0,
                color: new Color([71, 100, 245, 1]),
                outline: new SimpleLineSymbol({
                  color: new Color([0, 47, 189, 1]),
                  style: 'solid',
                  width: 1,
                }),
                size: 8,
                style: 'diamond',
              }),
              visualVariables: [
                new SizeVariable({
                  valueExpression: '$view.scale',
                  stops: [
                    { size: 2, value: 360000 },
                    { size: 4, value: 240000 },
                    { size: 12, value: 12000 },
                    { size: 20, value: 0 },
                  ],
                }),
              ],
            }),
            popupEnabled: true,
            popupTemplate: new PopupTemplate({
              title: `{Provider Name} (${__year} ${__quarter})`,
              content: [
                new FieldsContent({
                  title: 'Child Care Center Details',
                  fieldInfos: Object.keys(child_care_locations.features[0]?.properties || {}).map(
                    (fieldName) => {
                      return {
                        fieldName,
                        label: fieldName
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase()),
                      };
                    }
                  ),
                }),
              ],
            }),
            // renderer: createInterestAreaRenderer(),
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const commercialZones = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('commercial_zone_locations'))
        // only keep the first occurrence because it would be confusing to show commercial zones on top of each other over time
        .slice(0, 1)
        .map(({ commercial_zone_locations, __quarter, __year }) => {
          return {
            title: `Commercial Zones (${__year} ${__quarter})`,
            id: `commercial-zones__${__year}_${__quarter}`,
            data: commercial_zone_locations,
            renderer: new SimpleRenderer({
              symbol: new SimpleFillSymbol({
                color: [255, 0, 255, 0.18],
                outline: {
                  color: [0, 0, 0, 0],
                  width: 0,
                },
              }),
            }),
            popupEnabled: true,
            popupTemplate: new PopupTemplate({
              title: `{Name} (${__year} ${__quarter})`,
              content: [
                new FieldsContent({
                  title: 'Commercial Zone Details',
                  fieldInfos: Object.keys(
                    commercial_zone_locations.features[0]?.properties || {}
                  ).map((fieldName) => {
                    return {
                      fieldName,
                      label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                    };
                  }),
                }),
              ],
            }),
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
    groceryStores,
    healthcareFacilities,
    childCareCenters,
    commercialZones,
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
