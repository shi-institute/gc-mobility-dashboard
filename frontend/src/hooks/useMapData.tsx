import Color from '@arcgis/core/Color';
import * as unionOperator from '@arcgis/core/geometry/operators/unionOperator.js';
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js';
import { CustomContent, FieldsContent } from '@arcgis/core/popup/content';
import PopupTemplate from '@arcgis/core/PopupTemplate.js';
import { SimpleRenderer } from '@arcgis/core/renderers';
import SizeVariable from '@arcgis/core/renderers/visualVariables/SizeVariable';
import { SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol } from '@arcgis/core/symbols';
import { useEffect, useMemo } from 'react';
import { useAppData } from '.';
import { Section, Statistic } from '../components';
import { GeoJSONLayerInit } from '../components/common/Map/types';
import { createPopupRoot, notEmpty, requireKey } from '../utils';
import { createBusStopRenderer, createInterestAreaRenderer } from '../utils/renderers';

type AppData = ReturnType<typeof useAppData>['data'];
type AppFutureRoutesData = NonNullable<
  ReturnType<typeof useAppData>['scenarios']['data']
>['futureRoutes'];

export function useMapData(data: AppData, view?: __esri.MapView | null) {
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

  const onMapReadyFunctions: ((map: __esri.Map, view: __esri.MapView) => void)[] = [];

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

  useEffect(() => {
    view?.when(async () => {
      if (areaPolygons.length > 0) {
        const layers = view.map?.allLayers;
        const layersToFocusIds = areaPolygons.map((layer) => layer.id);

        const foundLayers = layers
          ?.filter((layer) => layersToFocusIds.includes(layer.id))
          .toArray();

        const promises =
          foundLayers
            ?.map((layer): Promise<{ count: number; extent: __esri.Extent }> | null => {
              return layer.when(() => {
                if (!('queryExtent' in layer) || typeof layer.queryExtent != 'function') {
                  return null;
                }
                return layer.queryExtent() as Promise<{ count: number; extent: __esri.Extent }>;
              });
            })
            .filter(notEmpty) || [];

        const layerExtents = await Promise.all(promises);

        const extentUnion = unionOperator.executeMany(layerExtents.map(({ extent }) => extent));

        view?.goTo(extentUnion, { animate: true, duration: 1000 }); //.catch(console.error);
      }
    });
  }, [view, areaPolygons]);

  function calculateRidership(allAreas = false) {
    const filteredData = (data || [])
      .map(({ ridership, __year, __quarter }) => ({ ridership, __year, __quarter }))
      .reduce((acc, curr) => {
        const currentYear = curr.__year;
        const currentQuarter = curr.__quarter;
        const ridershipData =
          curr.ridership?.[allAreas ? 'all' : 'area'].map((r) => {
            return {
              ...r,
              __year: currentYear,
              __quarter: currentQuarter,
            };
          }) || [];

        return [...acc, ...ridershipData];
      }, [] as (NonNullable<NonNullable<AppData>[0]['ridership']>['area'][0] & { __year: number; __quarter: 'Q2' | 'Q4' })[])
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
  }

  // @ts-expect-error - this is currently unused but will be used in the future
  const selectedAreasAndSeasonsRidership = useMemo(() => calculateRidership(), [data]);
  const allAreasAndSelectedSeasonsRidership = useMemo(() => calculateRidership(true), [data]);

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
                      allAreasAndSelectedSeasonsRidership[event?.graphic.attributes.ID] || {}
                    ).map(([season, ridership]) => {
                      const earliestPeriod = ridership?.sort((a, b) =>
                        new Date(a.period) > new Date(b.period) ? 1 : -1
                      )[0]?.period;
                      const latestPeriod = ridership?.sort((a, b) =>
                        new Date(a.period) < new Date(b.period) ? 1 : -1
                      )[0]?.period;

                      const earliestDate = earliestPeriod
                        ? new Intl.DateTimeFormat('en-US').format(new Date(earliestPeriod))
                        : 'N/A';
                      const latestDate = latestPeriod
                        ? new Intl.DateTimeFormat('en-US').format(new Date(latestPeriod))
                        : 'N/A';

                      return [
                        season,
                        earliestDate,
                        latestDate,
                        {
                          alightings:
                            ridership?.reduce((acc, r) => acc + (r.alighting || 0), 0) || 0,
                          boardings: ridership?.reduce((acc, r) => acc + (r.boarding || 0), 0) || 0,
                        },
                      ] as const;
                    });

                    return createPopupRoot(document.createElement('div')).render(
                      <div>
                        {stopRidership.length === 0 ? (
                          <div>No ridership data available</div>
                        ) : (
                          stopRidership.map(([season, start, end, stats]) => {
                            return (
                              <Section
                                title={`Weekday Ridership (${start} - ${end})`}
                                containerNameOverride="popup-section"
                                key={season}
                              >
                                <Statistic.Number
                                  wrap
                                  label="Boardings"
                                  data={[
                                    {
                                      label: season,
                                      value: stats.boardings,
                                    },
                                  ]}
                                />
                                <Statistic.Number
                                  wrap
                                  label="Alightings"
                                  data={[
                                    {
                                      label: season,
                                      value: stats.alightings,
                                    },
                                  ]}
                                />
                              </Section>
                            );
                          })
                        )}
                      </div>
                    );
                  },
                }),
              ],
            }),
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data, allAreasAndSelectedSeasonsRidership]);

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

  const dentalCareFacilities = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('dental_locations'))
        // only keep the first occurrence because it would be confusing to show dental care facilities on top of each other over time
        .slice(0, 1)
        .map(({ dental_locations, __quarter, __year }) => {
          return {
            title: `Dental Care Locations (${__year} ${__quarter})`,
            id: `dental-locations${__year}_${__quarter}`,
            data: dental_locations,
            popupEnabled: true,
            // TODO: add a fancy renderer
            popupTemplate: new PopupTemplate({
              title: `{Name} (${__year} ${__quarter})`,
              content: [
                new FieldsContent({
                  title: 'Healthcare Facility Details',
                  fieldInfos: popupFieldsFromObject(dental_locations.features[0]?.properties || {}),
                }),
              ],
            }),
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const eyeCareFacilities = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('eye_care_locations'))
        // only keep the first occurrence because it would be confusing to show eye care facilities on top of each other over time
        .slice(0, 1)
        .map(({ eye_care_locations, __quarter, __year }) => {
          return {
            title: `Eye Care Locations (${__year} ${__quarter})`,
            id: `eye-care-locations${__year}_${__quarter}`,
            data: eye_care_locations,
            popupEnabled: true,
            // TODO: add a fancy renderer
            popupTemplate: new PopupTemplate({
              title: `{Name} (${__year} ${__quarter})`,
              content: [
                new FieldsContent({
                  title: 'Healthcare Facility Details',
                  fieldInfos: popupFieldsFromObject(
                    eye_care_locations.features[0]?.properties || {}
                  ),
                }),
              ],
            }),
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const familyMedicineFacilities = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('family_medicine_locations'))
        // only keep the first occurrence because it would be confusing to show family medicine facilities on top of each other over time
        .slice(0, 1)
        .map(({ family_medicine_locations, __quarter, __year }) => {
          return {
            title: `Family Medicine Locations (${__year} ${__quarter})`,
            id: `family-medicine-locations${__year}_${__quarter}`,
            data: family_medicine_locations,
            popupEnabled: true,
            // TODO: add a fancy renderer
            popupTemplate: new PopupTemplate({
              title: `{Name} (${__year} ${__quarter})`,
              content: [
                new FieldsContent({
                  title: 'Healthcare Facility Details',
                  fieldInfos: popupFieldsFromObject(
                    family_medicine_locations.features[0]?.properties || {}
                  ),
                }),
              ],
            }),
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const freeClinicsFacilities = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('free_clinics_locations'))
        // only keep the first occurrence because it would be confusing to show free clinics on top of each other over time
        .slice(0, 1)
        .map(({ free_clinics_locations, __quarter, __year }) => {
          return {
            title: `Free Clinics Locations (${__year} ${__quarter})`,
            id: `free-clinics-locations${__year}_${__quarter}`,
            data: free_clinics_locations,
            popupEnabled: true,
            // TODO: add a fancy renderer
            popupTemplate: new PopupTemplate({
              title: `{Name} (${__year} ${__quarter})`,
              content: [
                new FieldsContent({
                  title: 'Healthcare Facility Details',
                  fieldInfos: popupFieldsFromObject(
                    free_clinics_locations.features[0]?.properties || {}
                  ),
                }),
              ],
            }),
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const hospitalsFacilities = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('hospitals_locations'))
        // only keep the first occurrence because it would be confusing to show hospitals on top of each other over time
        .slice(0, 1)
        .map(({ hospitals_locations, __quarter, __year }) => {
          return {
            title: `Hospitals Locations (${__year} ${__quarter})`,
            id: `hospitals-locations${__year}_${__quarter}`,
            data: hospitals_locations,
            popupEnabled: true,
            // TODO: add a fancy renderer
            popupTemplate: new PopupTemplate({
              title: `{Name} (${__year} ${__quarter})`,
              content: [
                new FieldsContent({
                  title: 'Healthcare Facility Details',
                  fieldInfos: popupFieldsFromObject(
                    hospitals_locations.features[0]?.properties || {}
                  ),
                }),
              ],
            }),
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const internalMedicineFacilities = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('internal_medicine_locations'))
        // only keep the first occurrence because it would be confusing to show internal medicine facilities on top of each other over time
        .slice(0, 1)
        .map(({ internal_medicine_locations, __quarter, __year }) => {
          return {
            title: `Internal Medicine Locations (${__year} ${__quarter})`,
            id: `internal-medicine-locations${__year}_${__quarter}`,
            data: internal_medicine_locations,
            popupEnabled: true,
            // TODO: add a fancy renderer
            popupTemplate: new PopupTemplate({
              title: `{Name} (${__year} ${__quarter})`,
              content: [
                new FieldsContent({
                  title: 'Healthcare Facility Details',
                  fieldInfos: popupFieldsFromObject(
                    internal_medicine_locations.features[0]?.properties || {}
                  ),
                }),
              ],
            }),
          } satisfies GeoJSONLayerInit;
        })[0]
    );
  }, [data]);

  const urgentCareFacilities = useMemo(() => {
    return (
      (data || [])
        .filter(notEmpty)
        .filter(requireKey('urgent_care_locations'))
        // only keep the first occurrence because it would be confusing to show urgent care facilities on top of each other over time
        .slice(0, 1)
        .map(({ urgent_care_locations, __quarter, __year }) => {
          return {
            title: `Urgent Care Locations (${__year} ${__quarter})`,
            id: `urgent-care-locations${__year}_${__quarter}`,
            data: urgent_care_locations,
            popupEnabled: true,
            // TODO: add a fancy renderer
            popupTemplate: new PopupTemplate({
              title: `{Name} (${__year} ${__quarter})`,
              content: [
                new FieldsContent({
                  title: 'Healthcare Facility Details',
                  fieldInfos: popupFieldsFromObject(
                    urgent_care_locations.features[0]?.properties || {}
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
    onMapReadyFunctions,
    networkSegments,
    areaPolygons,
    routes,
    stops,
    walkServiceAreas,
    cyclingServiceAreas,
    paratransitServiceAreas,
    groceryStores,
    dentalCareFacilities,
    eyeCareFacilities,
    familyMedicineFacilities,
    freeClinicsFacilities,
    hospitalsFacilities,
    internalMedicineFacilities,
    urgentCareFacilities,
    childCareCenters,
    commercialZones,
  };
}

/**
 * Returns layers for an ArcGIS map that represent future routes, stops, and service areas.
 *
 * @param data Future routes data from the useAppData hook.
 * @param allowedRouteIds If porivded, only routes with these IDs will be included.
 *                        If not provided, all future routes will be included.
 * @returns
 */
export function useFutureMapData(data: AppFutureRoutesData, allowedRouteIds?: string[]) {
  const filteredData = allowedRouteIds
    ? data.filter((d) => allowedRouteIds.includes(d.__routeId))
    : data;

  const futureRoutes = useMemo(() => {
    return filteredData
      .filter(notEmpty)
      .filter(requireKey('route'))
      .map(({ route, __routeId }) => {
        return {
          title: `Future Route (${__routeId})`,
          id: `future_route__${__routeId}`,
          data: route,
          renderer: new SimpleRenderer({
            symbol: new SimpleLineSymbol({
              color: 'rgba(89, 220, 24, 0.8)',
              width: 4,
              style: 'solid',
            }),
          }),
        } satisfies GeoJSONLayerInit;
      });
  }, [filteredData]);

  const futureStops = useMemo(() => {
    return filteredData
      .filter(notEmpty)
      .filter(requireKey('stops'))
      .map(({ stops, __routeId }) => {
        return {
          title: `Stops (${__routeId})`,
          data: stops,
          renderer: createBusStopRenderer(new Color('rgba(35, 148, 0, 1)')),
          minScale: 240000, // do not show bus stops at scales larger than 1:240,000
          popupEnabled: true,
        } satisfies GeoJSONLayerInit;
      });
  }, [filteredData]);

  const futureWalkServiceAreas = useMemo(() => {
    return filteredData
      .filter(notEmpty)
      .filter(requireKey('walk_service_area'))
      .map(({ walk_service_area, __routeId }) => {
        return {
          title: `0.5-Mile Walking Radius from Stops (${__routeId})`,
          id: `walk-service-area__${__routeId}`,
          data: walk_service_area,
          renderer: futureServiceAreaRenderer,
          visible: false,
        } satisfies GeoJSONLayerInit;
      });
  }, [filteredData]);

  const futureCyclingServiceAreas = useMemo(() => {
    return filteredData
      .filter(notEmpty)
      .filter(requireKey('bike_service_area'))
      .map(({ bike_service_area, __routeId }) => {
        return {
          title: `15-Minute Cycling Radius from Stops (at 15 mph) (${__routeId})`,
          id: `bike-service-area__${__routeId}`,
          data: bike_service_area,
          renderer: futureServiceAreaRenderer,
          visible: false,
        } satisfies GeoJSONLayerInit;
      });
  }, [filteredData]);

  const futureParatransitServiceAreas = useMemo(() => {
    return filteredData
      .filter(requireKey('paratransit_service_area'))
      .filter(notEmpty)
      .map(({ paratransit_service_area, __routeId }) => {
        return {
          title: `Paratransit Service Area (${__routeId})`,
          id: `paratransit-service-area__${__routeId}`,
          data: paratransit_service_area,
          renderer: futureServiceAreaRenderer,
          visible: false,
        } satisfies GeoJSONLayerInit;
      });
  }, [filteredData]);

  return {
    futureRoutes,
    futureStops,
    futureWalkServiceAreas,
    futureCyclingServiceAreas,
    futureParatransitServiceAreas,
  };
}

const serviceAreaRenderer = new SimpleRenderer({
  symbol: new SimpleFillSymbol({
    color: new Color('rgba(255, 255, 255, 0.32)'),
    outline: {
      color: [0, 0, 0, 0.36],
      width: 1,
    },
  }),
});

const futureServiceAreaRenderer = new SimpleRenderer({
  symbol: new SimpleFillSymbol({
    color: new Color('rgba(128, 255, 135, 0.24)'),
    outline: {
      color: [0, 0, 0, 0.36],
      width: 1,
    },
  }),
});

function popupFieldsFromObject(obj: Record<string, any>) {
  return Object.keys(obj).map((fieldName) => {
    return {
      fieldName,
      label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  });
}
