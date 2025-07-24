import type { Style as MapboxStyle, VectorSource as MapboxVectorSource } from 'mapbox-gl';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { inflateResponse } from '../utils';

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
  | 'commerical'
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
    'commerical',
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
      households: () => censusData.households,
      race_ethnicity: () => censusData.race_ethnicity,
      population_total: () => censusData.population_total,
      educational_attainment: () => censusData.educational_attainment,
    };
  }, []);

  // merge the replica promises with the census promises
  const dataPromises = useMemo(() => {
    const replicaPaths = constructReplicaPaths(areas, seasons, travelMethod);
    const replicaPromises = constructReplicaPromises(replicaPaths);
    const greenlinkPromises = getGreenlinkPromises(seasons);
    return replicaPromises.map(({ year, quarter, promises }) => {
      const greenlinkPromisesForSeason = greenlinkPromises[year + '_' + quarter] || {};

      // merge all promises into a single object
      return {
        ...promises,
        ...censusPromises,
        ...greenlinkPromisesForSeason,
      };
    });
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

  return { data, loading, errors, areasList, seasonsList, travelMethodList };
}

async function fetchData<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  abortSignal?: AbortSignal,
  skipInflate = false
): Promise<T> {
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

      return JSON.parse(text);
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
      const results = await Promise.all(
        Object.entries(promises).map(async ([key, fn]) => [key, await fn(abortSignal)] as const)
      );

      const data: Record<string, unknown> = {};
      results.forEach(([key, result]) => {
        if (promises.hasOwnProperty(key)) {
          data[key] = result;
        }
      });
      return data as ResolvedData<T[number]>;
    })
  );
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
  };

  const households = fetchData<CensusHouseholdsTimeSeries>(paths.households).catch(
    handleError('households')
  );
  const race_ethnicity = fetchData<CensusRaceEthnicityTimeSeries>(paths.race_ethnicity).catch(
    handleError('race_ethnicity')
  );
  const population_total = fetchData<CensusPopulationTotalTimeSeries>(paths.population_total).catch(
    handleError('population_total')
  );
  const educational_attainment = fetchData<CensusEducationalAttainmentTimeSeries>(
    paths.educational_attainment
  ).catch(handleError('educational_attainment'));

  return { households, race_ethnicity, population_total, educational_attainment };
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
                      paths.network_segments_style + '/../' + style.sources.esri.url,
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
