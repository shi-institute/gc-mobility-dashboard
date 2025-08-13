import type { Style as MapboxStyle, VectorSource as MapboxVectorSource } from 'mapbox-gl';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { generateHash, inflateResponse, notEmpty } from '../utils';

export function createAppDataContext(
  areas: AppDataHookParameters['areas'],
  seasons: AppDataHookParameters['seasons'],
  travelMethod: AppDataHookParameters['travelMethod']
) {
  return _useAppData({ areas, seasons, travelMethod });
}

type TravelMethod =
  | 'biking'
  | 'carpool'
  | 'commercial'
  | 'on_demand_auto'
  | 'other_travel_mode'
  | 'private_auto'
  | 'public_transit'
  | 'walking';

export type AppDataContextValue = ReturnType<typeof _useAppData>;
export const AppDataContext = createContext<AppDataContextValue>({} as AppDataContextValue);

export function _useAppDataContext() {
  return useContext(AppDataContext);
}

export interface AppDataHookParameters {
  areas: string[];
  seasons: ['Q2' | 'Q4', number][];
  /**
   * Optional travel methods for filtering the data.
   *
   * If provided, only trips with this travel method will be included in the data.
   * If not provided, all travel methods will be included.
   */
  travelMethod?: TravelMethod;
}

function _useAppData({ areas, seasons, travelMethod }: AppDataHookParameters) {
  const [areasList, setAreasList] = useState<string[]>([]);
  useEffect(() => {
    fetch('./data/replica/area_index.txt')
      .then((res) => res.text())
      .then((text) => {
        const areaList = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        setAreasList(areaList);
      });
  }, [setAreasList]);

  const [seasonsList, setSeasonsList] = useState<string[]>([]);
  useEffect(() => {
    fetch('./data/replica/season_index.txt')
      .then((res) => res.text())
      .then((text) => {
        const seasonsList = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        setSeasonsList(seasonsList);
      });
  }, [setSeasonsList]);

  const travelMethodList = [
    'biking',
    'carpool',
    'commercial',
    'on_demand_auto',
    'other_travel_mode',
    'private_auto',
    'public_transit',
    'walking',
  ];

  // fetch the census data, which is a static time series file for each category that
  // applies to all areas and seasons
  const censusPromises = useMemo(() => {
    const censusData = getCensusData();
    return {
      // households: () => censusData.households,
      // race_ethnicity: () => censusData.race_ethnicity,
      // population_total: () => censusData.population_total,
      // educational_attainment: () => censusData.educational_attainment,
      census_acs_5year: () => censusData.combined,
    };
  }, []);

  // merge the replica promises with the census promises
  const dataPromises = useMemo(() => {
    const replicaPaths = constructReplicaPaths(areas, seasons, travelMethod);
    const replicaPromises = constructReplicaPromises(replicaPaths);
    const greenlinkPromises = getGreenlinkPromises(seasons);
    const essentialServicesPromises = getEssentialServicesPromises(areas, seasons);
    return replicaPromises
      .map(({ area, year, quarter, promises }) => {
        const greenlinkPromisesForSeason = greenlinkPromises[year + '_' + quarter];
        const essentialServicesPromisesForAreaAndSeason =
          essentialServicesPromises[year + '_' + quarter + '__' + area];

        if (!greenlinkPromisesForSeason || !essentialServicesPromisesForAreaAndSeason) {
          console.warn(
            `No Greenlink or Essential Services data found for area ${area} in season ${year} ${quarter}. Voiding data for area season.`
          );
          return null;
        }

        // merge all promises into a single object
        return {
          ...promises,
          census_acs_5year: () =>
            censusPromises.census_acs_5year().then((data) => {
              if (!data) {
                return null;
              }

              const areaData = data
                // omit items that do not belong to an area
                .filter((item) => item.areas && item.areas.length > 0)
                // omit items that are empty
                .filter((item) => !!item.NAME)
                // omit items that do not belong to the current area
                .filter((item) => item.areas.includes(area));

              // group the data by YEAR
              const groupedData = Object.entries(Object.groupBy(areaData, (d) => d.YEAR))
                // convert the year range to the end year as an integer
                .map(([yearRange, items]) => {
                  const endYear = yearRange.split('-')[1];
                  if (!endYear) {
                    return null;
                  }

                  return [parseInt(endYear), items] as const;
                })
                .filter(notEmpty);

              // get the data for the closest year to the current year
              const closestYear = groupedData.reduce((prev, curr) => {
                return Math.abs(curr[0] - year) < Math.abs(prev[0] - year) ? curr : prev;
              });

              return closestYear[1];
            }),
          ...greenlinkPromisesForSeason,
          ...essentialServicesPromisesForAreaAndSeason,
          coverage: (abortSignal?: AbortSignal) =>
            greenlinkPromisesForSeason.coverage(abortSignal).then((data) => {
              if (!data) {
                return null;
              }

              return data.find(
                (item) => item.year === year && item.quarter === quarter && item.area === area
              );
            }),
          ridership: (abortSignal?: AbortSignal) =>
            greenlinkPromisesForSeason.ridership(abortSignal).then((data) => {
              if (!data) {
                return null;
              }
              return data.filter((stop) => stop.areas?.includes(area));
            }),
        };
      })
      .filter(notEmpty);
  }, [areas, seasons]);

  // manage the state of the fetch data, showing a loading state while the data is being fetched
  const [data, setData] = useState<ResolvedData<(typeof dataPromises)[number]>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Error[] | null>(null);
  useEffect(() => {
    // set up an abort controller to cancel the fetch request if the component unmounts or the dependencies change
    const abortController = new AbortController();
    const { signal } = abortController;

    if (loading === false) {
      setLoading(true);
      setErrors(null);
      resolveArrayOfPromiseRecords(dataPromises, signal)
        .then((fetchedData) => {
          if (fetchedData) {
            setData(fetchedData);
          }
        })
        .catch((error) => {
          if (!signal.aborted) {
            setErrors((prevErrors) => (prevErrors ? [...prevErrors, error] : [error]));
            console.error('An error occurred while fetching data. Please try again later.', error);
          }
          return null;
        })
        .finally(() => {
          if (!signal.aborted) {
            setLoading(false);
          }
        });
    }

    return () => {
      abortController.abort('fetch effect in useAppData is being cleaned up');
    };
  }, [dataPromises]);

  // all track the state for the scenaio data promises
  const [scenarioDataPromises, setScenarioDataPromises] = useState<Awaited<
    ReturnType<typeof constructScenarioDataPromises>
  > | null>(null);
  useEffect(() => {
    constructScenarioDataPromises()
      .then((promises) => {
        setScenarioDataPromises(promises);
      })
      .catch((error) => {
        console.error('An error occurred while constructing scenario data promises.', error);
        setScenarioDataPromises(null);
      });
  }, [setScenarioDataPromises]);
  const [scenarioData, setScenarioData] = useState<
    | (ResolvedData<Omit<NonNullable<typeof scenarioDataPromises>, 'futureRoutes'>> & {
        futureRoutes: ResolvedData<
          NonNullable<typeof scenarioDataPromises>['futureRoutes'][number]
        >[];
      })
    | null
  >(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioErrors, setScenarioErrors] = useState<Error[] | null>(null);
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    if (scenarioLoading === false && scenarioDataPromises && scenarioData === null) {
      setScenarioLoading(true);
      setScenarioErrors(null);

      const { futureRoutes, ...rest } = scenarioDataPromises;

      const resolvedScenarios = resolveObjectOfPromises(rest, signal);
      const resolvedFutureRoutes = resolveArrayOfPromiseRecords(futureRoutes, signal);

      Promise.all([resolvedScenarios, resolvedFutureRoutes])
        .then((fetchedData) => {
          const [scenariosData, futureRoutesData] = fetchedData;
          if (scenariosData && futureRoutesData) {
            setScenarioData({ ...scenariosData, futureRoutes: futureRoutesData });
          }
        })
        .catch((error) => {
          if (!signal.aborted) {
            setScenarioErrors((prevErrors) => (prevErrors ? [...prevErrors, error] : [error]));
            console.error('An error occurred while fetching scenario data.', error);
          }
          return null;
        })
        .finally(() => {
          if (!signal.aborted) {
            setScenarioLoading(false);
          }
        });
    }

    return () => {
      abortController.abort('fetch effect in useAppData for scenario data is being cleaned up');
    };
  }, [scenarioDataPromises, scenarioData]);

  return {
    data,
    loading,
    errors,
    areasList,
    seasonsList,
    travelMethodList,
    scenarios: {
      data: scenarioData,
      loading: scenarioLoading,
      errors: scenarioErrors,
    },
  };
}

const globalResultCache: Record<string, unknown> = {};

async function fetchData<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  abortSignal?: AbortSignal,
  skipInflate = false,
  rememberResult = true
): Promise<T> {
  const inputHash = await generateHash(typeof input === 'string' ? input : JSON.stringify(input));

  if (rememberResult && globalResultCache[inputHash]) {
    return globalResultCache[inputHash] as T;
  }

  return fetch(input, {
    signal: abortSignal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Network response was not ok. Status: ${response.status}, URL: ${response.url}`
        );
      }
      return response;
    })
    .then((response) => {
      if (skipInflate) {
        return response.text();
      }
      return inflateResponse(response);
    })
    .then((text) => {
      if (text.startsWith('<!DOCTYPE')) {
        throw new Error('Received HTML response instead of JSON. This may indicate a 404 error.');
      }

      const parsedData = JSON.parse(text) as T;

      if (rememberResult) {
        globalResultCache[inputHash] = parsedData;
      }
      return parsedData;
    });
}

type DataPromises = Record<string, (abortSignal?: AbortSignal) => Promise<unknown>>[];

type ResolvedData<T extends DataPromises[number]> = {
  [K in keyof T]: Awaited<ReturnType<T[K]>>;
};

/**
 * Resolve all promises from an input array of objects with promises as their values.
 * @param dataPromises An array of objects, where each object property is a function that returns a promise.
 * @param abortSignal A signal to abort the fetch requests. Generate one with `const abortController = new AbortController()` and provide `abortController.signal`. Abort with `abortController.abort()`.
 * @returns An array of objects with the resolved values of the promises.
 */
async function resolveArrayOfPromiseRecords<T extends DataPromises>(
  dataPromises: T,
  abortSignal?: AbortSignal
): Promise<ResolvedData<T[number]>[] | null> {
  return Promise.all(
    dataPromises.map(async (promises) => {
      const data = await resolveObjectOfPromises(promises, abortSignal);
      return data as ResolvedData<T[number]>;
    })
  );
}

/**
 * Resolves all promises from an object of promises.
 * @param promises An object where each property is a function that returns a promise.
 * @param abortSignal  A signal to abort the fetch requests. Generate one with `const abortController = new AbortController()` and provide `abortController.signal`. Abort with `abortController.abort()`.
 * @returns An object with the resolved values of the promises, or null if any promise fails.
 */
async function resolveObjectOfPromises<T extends DataPromises[number]>(
  promises: T,
  abortSignal?: AbortSignal
): Promise<ResolvedData<T> | null> {
  const results = await Promise.all(
    Object.entries(promises).map(async ([key, fn]) => {
      if (typeof fn !== 'function') {
        console.warn(`Skipping non-function promise for key: ${key}`);
        return [key, null] as const; // Skip non-function promises
      }

      return [key, await fn(abortSignal)] as const;
    })
  );

  const data: Record<string, unknown> = {};
  results.forEach(([key, result]) => {
    if (promises.hasOwnProperty(key)) {
      data[key] = result;
    }
  });
  return data as ResolvedData<T>;
}

function handleError(key: string, shouldThrow = true, supressIncorrectHeaderCheck = false) {
  return (error: Error | string) => {
    const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';

    // ignore errors that are caused by the cleanup of the useAppData effect
    if (errorMessage?.includes('useAppData is being cleaned up')) {
      console.debug(`Ignoring cleanup error for ${key}:`, error);
      return null;
    }

    if (supressIncorrectHeaderCheck && errorMessage === 'incorrect header check') {
      console.debug(`Ignoring incorrect header check error for ${key}:`, error);
      return null;
    }

    // if the data was not found (404), return null instead of throwing an error
    if (errorMessage === 'Received HTML response instead of JSON. This may indicate a 404 error.') {
      console.warn(`Data for ${key} not found:`, error);
      return null;
    }

    console.error(`Error fetching ${key} data:`, error);

    if (shouldThrow !== false) {
      throw new Error(
        `Error fetching ${key} data: ` +
          (errorMessage || error) +
          `. See the console for more details.`
      );
    }

    return null;
  };
}

/**
 * Fetches the core census data that is used across all areas and seasons.
 */
function getCensusData() {
  const paths = {
    households: `./data/census_acs_5year/B08201/time_series.json.deflate`,
    race_ethnicity: `./data/census_acs_5year/DP05/time_series.json.deflate`,
    population_total: `./data/census_acs_5year/S0101/time_series.json.deflate`,
    educational_attainment: `./data/census_acs_5year/S1501/time_series.json.deflate`,
    combined: `./data/census_acs_5year/time_series.json.deflate`,
  };

  const households = fetchData<CensusHouseholdsTimeSeries>(
    paths.households,
    undefined,
    undefined,
    true
  ).catch(handleError('households'));
  const race_ethnicity = fetchData<CensusRaceEthnicityTimeSeries>(
    paths.race_ethnicity,
    undefined,
    undefined,
    true
  ).catch(handleError('race_ethnicity'));
  const population_total = fetchData<CensusPopulationTotalTimeSeries>(
    paths.population_total,
    undefined,
    undefined,
    true
  ).catch(handleError('population_total'));
  const educational_attainment = fetchData<CensusEducationalAttainmentTimeSeries>(
    paths.educational_attainment,
    undefined,
    undefined,
    true
  ).catch(handleError('educational_attainment'));
  const combined = fetchData<CombinedCensusDataTimeSeries>(
    paths.combined,
    undefined,
    undefined,
    true
  ).catch(handleError('combined'));

  return { households, race_ethnicity, population_total, educational_attainment, combined };
}

/**
 * Provides promises that fetch the data related to Greenlink service.
 */
function getGreenlinkPromises(seasons: AppDataHookParameters['seasons']) {
  const allPromises = seasons.map(([__quarter, __year]) => {
    const gtfsFolder = `./data/greenlink_gtfs/${__year}/${__quarter}`;
    const ridershipFolder = `./data/greenlink_ridership/${__year}/${__quarter}`;

    return {
      year: __year,
      quarter: __quarter,
      promises: {
        coverage: (abortSignal?: AbortSignal) =>
          fetchData<ServiceCoverage[]>(
            `./data/greenlink_gtfs/service_coverage_stats.json.deflate`,
            abortSignal,
            false,
            true
          ).catch(handleError('greenlink_coverage')),
        routes: (abortSignal?: AbortSignal) =>
          fetchData<GTFS.Routes>(`${gtfsFolder}/routes.geojson.deflate`, abortSignal).catch(
            handleError('greenlink_routes')
          ),
        stops: (abortSignal?: AbortSignal) =>
          fetchData<GTFS.Stops>(`${gtfsFolder}/stops.geojson.deflate`, abortSignal).catch(
            handleError('greenlink_stops')
          ),
        walk_service_area: (abortSignal?: AbortSignal) =>
          fetchData<GTFS.WalkServiceArea>(
            `${gtfsFolder}/walk_service_area.geojson.deflate`,
            abortSignal
          ).catch(handleError('greenlink_walk_service_area')),
        bike_service_area: (abortSignal?: AbortSignal) =>
          fetchData<GTFS.BikeServiceArea>(
            `${gtfsFolder}/bike_service_area.geojson.deflate`,
            abortSignal
          ).catch(handleError('greenlink_bike_service_area')),
        paratransit_service_area: (abortSignal?: AbortSignal) =>
          fetchData<GTFS.ParatransitServiceArea>(
            `${gtfsFolder}/paratransit_service_area.geojson.deflate`,
            abortSignal
          ).catch(handleError('greenlink_paratransit_service_area')),
        ridership: (abortSignal?: AbortSignal) =>
          fetchData<StopRidership[]>(
            `${ridershipFolder}/ridership.json.deflate`,
            abortSignal
          ).catch(handleError('greenlink_ridership', true, true)),
      },
    };
  });

  const groupedPromises: Record<string, (typeof allPromises)[number]['promises']> = {};
  for (const { year, quarter, promises } of allPromises) {
    const key = `${year}_${quarter}`;
    groupedPromises[key] = promises;
  }

  return groupedPromises;
}

function getEssentialServicesPromises(
  areas: AppDataHookParameters['areas'],
  seasons: AppDataHookParameters['seasons']
) {
  const allPromises = seasons.flatMap(([__quarter, __year]) => {
    return areas.map((__area) => {
      const essentialServicesFolder = `./data/essential_services/${__year}/${__quarter}`;

      return {
        area: __area,
        year: __year,
        quarter: __quarter,
        promises: {
          essential_services_access_stats: (abortSignal?: AbortSignal) =>
            fetchData<EssentialServicesAccessStats[]>(
              `./data/essential_services/essential_services_stats.json.deflate`,
              abortSignal,
              false,
              true
            )
              .then((data) => {
                if (!data) {
                  return null;
                }
                return Object.fromEntries(
                  data
                    .filter(
                      (item) => item.season === `${__year}_${__quarter}` && item.area === __area
                    )
                    .flatMap((item) => Object.entries(item))
                ) as MergedEssentialServicesAccessStats;
              })
              .catch(handleError('essential_services_access_stats')),
          child_care_locations: (abortSignal?: AbortSignal) =>
            fetchData<GeoJSON>(
              `${essentialServicesFolder}/child_care.geojson.deflate`,
              abortSignal
            ).catch(handleError('child_care_locations', true, true)),
          grocery_store_locations: (abortSignal?: AbortSignal) =>
            fetchData<GeoJSON>(
              `${essentialServicesFolder}/grocery_store.geojson.deflate`,
              abortSignal
            ).catch(handleError('grocery_store_locations', true, true)),
          healthcare_locations: (abortSignal?: AbortSignal) =>
            fetchData<GeoJSON>(
              `${essentialServicesFolder}/healthcare.geojson.deflate`,
              abortSignal
            ).catch(handleError('healthcare_locations', true, true)),
          commercial_zone_locations: (abortSignal?: AbortSignal) =>
            fetchData<GeoJSON<{ ZONING: string }>>(
              `${essentialServicesFolder}/commercial_zone.geojson.deflate`,
              abortSignal
            ).catch(handleError('commercial_zone_locations', true, true)),
        },
      };
    });
  });

  const groupedPromises: Record<string, (typeof allPromises)[number]['promises']> = {};
  for (const { area, year, quarter, promises } of allPromises) {
    const key = `${year}_${quarter}__${area}`;
    groupedPromises[key] = promises;
  }

  return groupedPromises;
}

/**
 * Constructs paths for the replica data based on the areas and seasons.
 */
function constructReplicaPaths(
  areas: AppDataHookParameters['areas'],
  seasons: AppDataHookParameters['seasons'],
  travelMethod?: AppDataHookParameters['travelMethod']
) {
  return areas.flatMap((area) => {
    return seasons.map(([quarter, year]) => {
      let networkSegmentsSuffix = `_${year}_${quarter}__thursday`;
      if (travelMethod) {
        networkSegmentsSuffix += `__commute__${travelMethod}`;
      }

      return {
        __area: area,
        __year: year,
        __quarter: quarter,
        __label: `${area}${seasons.length > 1 ? ` (${year} ${quarter})` : ''}`,
        polygon: `./data/replica/${area}/polygon.geojson.deflate`,
        statistics: `./data/replica/${area}/statistics/replica__south_atlantic_${year}_${quarter}.json.deflate`,
        network_segments_style: `./data/replica/${area}/network_segments/south_atlantic${networkSegmentsSuffix}/VectorTileServer/resources/styles/root.json`,
        population: `./data/replica/${area}/population/south_atlantic_${year}_${quarter}.json.deflate`,
      };
    });
  });
}

/**
 * Returns an array of objects containing promises for fetching replica data for each area and season (per the paths).
 *
 * Each function can be aborted by passing an `AbortSignal` to the first argument.
 *
 * @param replicaPaths - the returned value of `constructReplicaPaths`
 */
function constructReplicaPromises(replicaPaths: ReturnType<typeof constructReplicaPaths>) {
  return replicaPaths.map(({ __area, __year, __quarter, __label, ...paths }) => {
    return {
      area: __area,
      year: __year,
      quarter: __quarter,
      promises: {
        __area: async () => __area,
        __year: async () => __year,
        __quarter: async () => __quarter,
        __label: async () => __label,
        polygon: (abortSignal?: AbortSignal) =>
          fetchData<ReplicaAreaPolygon>(paths.polygon, abortSignal).catch(handleError('polygon')),
        statistics: (abortSignal?: AbortSignal) =>
          fetchData<ReplicaStatistics>(paths.statistics, abortSignal).catch(
            handleError('statistics')
          ),
        network_segments_style: (abortSignal?: AbortSignal) =>
          fetchData<Omit<MapboxStyle, 'sources'> & { sources: Record<string, MapboxVectorSource> }>(
            paths.network_segments_style,
            abortSignal,
            true
          )
            .then((style) => {
              return {
                ...style,
                sources: {
                  ...style.sources,
                  esri: {
                    ...style.sources.esri,
                    // resolve the relative URL to a complete path
                    url: new URL(
                      paths.network_segments_style + '/../' + style.sources.esri?.url,
                      window.location.origin
                    ).href,
                  },
                },
                layers: style.layers.map((layer) => {
                  return { ...layer, minzoom: undefined, maxzoom: undefined };
                }),
              };
            })
            .catch(handleError('network_segments_style', true, true)),
        population: (abortSignal?: AbortSignal) =>
          fetchData<ReplicaSyntheticPeople>(paths.population, abortSignal).catch(
            handleError('population')
          ),
      },
    };
  });
}

async function constructScenarioDataPromises() {
  const futureRoutesList = await fetch('./data/future_routes/future_routes_index.txt')
    .then((res) => res.text())
    .then((text) => {
      return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    })
    .catch((error) => {
      console.error('Error fetching future routes index:', error);
      return [];
    });

  const futureRoutesPromises = futureRoutesList.map((routeId) => {
    const folderPath = './data/future_routes/' + routeId;

    return {
      __routeId: () => new Promise((resolve) => resolve(routeId)),
      stats: (abortSignal?: AbortSignal) =>
        fetchData<{
          counts: { walk_convertable_count: number; bike_convertable_count: number };
        }>(`${folderPath}/stats.json.deflate`, abortSignal).catch(
          handleError(`future_route_stats_${routeId}`, true, true)
        ),
      route: (abortSignal?: AbortSignal) =>
        fetchData<GeoJSON<unknown, 'LineString' | 'MultiLineString'>>(
          `${folderPath}/route.geojson.deflate`,
          abortSignal
        ).catch(handleError(`future_route_${routeId}`, true, true)),
      stops: (abortSignal?: AbortSignal) =>
        fetchData<GeoJSON<unknown, 'Point'>>(
          `${folderPath}/stops.geojson.deflate`,
          abortSignal
        ).catch(handleError(`future_route_stops_${routeId}`, true, true)),
      walk_service_area: (abortSignal?: AbortSignal) =>
        fetchData<GeoJSON<NorthsideDataProcessing, 'Polygon' | 'MultiPolygon'>>(
          `${folderPath}/walkshed.geojson.deflate`,
          abortSignal
        ).catch(handleError(`future_route_walk_service_area_${routeId}`, true, true)),
      bike_service_area: (abortSignal?: AbortSignal) =>
        fetchData<GeoJSON<NorthsideDataProcessing, 'Polygon' | 'MultiPolygon'>>(
          `${folderPath}/bikeshed.geojson.deflate`,
          abortSignal
        ).catch(handleError(`future_route_bike_service_area_${routeId}`, true, true)),
      paratransit_service_area: (abortSignal?: AbortSignal) =>
        fetchData<GeoJSON<NorthsideDataProcessing, 'Polygon' | 'MultiPolygon'>>(
          `${folderPath}/paratransit_service_area.geojson.deflate`,
          abortSignal
        ).catch(handleError(`paratransit${routeId}`, true, true)),
    };
  });

  return {
    scenarios: (abortSignal?: AbortSignal) =>
      fetchData<{ scenarios: Scenario[] }>(`./data/tab5_scenarios.json.deflate`, abortSignal).catch(
        handleError('tab5_scenarios')
      ),
    futureRoutes: futureRoutesPromises,
  };
}
