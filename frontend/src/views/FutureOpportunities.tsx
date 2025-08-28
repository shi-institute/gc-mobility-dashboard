import '@arcgis/map-components/dist/components/arcgis-map';
import { useContext, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import {
  Button,
  CoreFrame,
  CoreFrameContext,
  IconButton,
  Map,
  PageHeader,
  Section,
  SectionEntry,
  SidebarContent,
  Statistic,
} from '../components';
import { DismissIcon } from '../components/common/IconButton/DismssIcon';
import { AppNavigation } from '../components/navigation';
import {
  ComparisonModeSwitch,
  SelectedFutureRoutes,
  useComparisonModeState,
} from '../components/options';
import { useAppData, useLocalStorage, useMapData } from '../hooks';
import { useFutureMapData } from '../hooks/useMapData';
import { notEmpty, toTidyNominal } from '../utils';

export function FutureOpportunities() {
  const { data, scenarios: scenariosData, loading } = useAppData();

  const [isComparing] = useComparisonModeState();
  const [searchParams] = useSearchParams();
  const selectedRouteIds = (searchParams.get('futures')?.split(',').filter(notEmpty) || []).slice(
    0,
    isComparing ? undefined : 1
  );

  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const {
    areaPolygons,
    routes,
    stops,
    walkServiceAreas,
    cyclingServiceAreas,
    paratransitServiceAreas,
  } = useMapData(data, mapView);
  const {
    futureRoutes,
    futureStops,
    futureWalkServiceAreas,
    futureCyclingServiceAreas,
    futureParatransitServiceAreas,
  } = useFutureMapData(scenariosData.data?.futureRoutes || [], selectedRouteIds, mapView, {
    zoomTo: 'paratransit',
  });

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      loading={loading || scenariosData.loading}
      header={<AppNavigation />}
      sectionsHeader={<SectionsHeader />}
      sidebar={<Sidebar />}
      map={
        <div style={{ height: '100%' }} title="Map">
          <Map
            layers={[
              walkServiceAreas,
              ...futureWalkServiceAreas,
              cyclingServiceAreas,
              ...futureCyclingServiceAreas,
              paratransitServiceAreas,
              ...futureParatransitServiceAreas,
              ...futureRoutes,
              routes,
              ...futureStops,
              stops,
              ...areaPolygons,
            ].filter(notEmpty)}
            onMapReady={(_, view) => {
              setMapView(view);
            }}
          />
        </div>
      }
      sections={Sections()}
    />
  );
}

function SectionsHeader() {
  const [isComparing] = useComparisonModeState();
  const { scenarios } = useAppData();
  const futureRouteIds = (scenarios.data?.futureRoutes || []).map((route) => route.__routeId);

  const { optionsOpen, setOptionsOpen, isFullDesktop, isMobile } = useContext(CoreFrameContext);

  const [showAside, setShowAside] = useLocalStorage('aside--tab-2', true);

  return (
    <PageHeader isComparing={isComparing}>
      <h2>Future Transit Routes & Stops</h2>
      <p>Visualize selected future transit routes from Greenlink's transit development plan.</p>
      {isFullDesktop || isMobile ? null : (
        <div className="button-row">
          {isComparing ? (
            <p className="message">Open options to show different routes.</p>
          ) : (
            <SelectedFutureRoutes routeIds={futureRouteIds} />
          )}
          <Button onClick={() => setOptionsOpen(!optionsOpen)}>More options</Button>
        </div>
      )}
      {showAside ? (
        <aside>
          <h1>About this tab</h1>
          <IconButton
            onClick={() => setShowAside(false)}
            title="Permanently dismiss this message on this device"
          >
            <DismissIcon size={16} />
          </IconButton>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
            nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
            officia deserunt mollit anim id est laborum.
          </p>
        </aside>
      ) : null}
    </PageHeader>
  );
}

function Sections() {
  const { loading, errors, scenarios } = useAppData();
  const { data: scenariosData, loading: scenariosLoading, errors: scenariosErrors } = scenarios;
  const { search } = useLocation();

  const [isComparing] = useComparisonModeState();
  const [searchParams] = useSearchParams();
  const selectedRouteIds = (searchParams.get('futures')?.split(',').filter(notEmpty) || []).slice(
    0,
    isComparing ? undefined : 1
  );
  const futures = (scenariosData?.futureRoutes || []).filter((future) =>
    selectedRouteIds.includes(future.__routeId)
  );

  const jobAccessSearch = (() => {
    const currentSearchParams = new URLSearchParams(search);
    currentSearchParams.set('jobAreas', selectedRouteIds.map((id) => `${id}::future`).join(','));
    return currentSearchParams.toString() ? `?${currentSearchParams.toString()}` : '';
  })();

  if ((scenariosLoading || loading) && !scenariosData) {
    return [
      <div key="placeholder-loading">
        <p>Loading...</p>
      </div>,
    ];
  }

  if (errors) {
    return [
      <div key="placeholder-error">
        <p>Error: {errors.join(', ')}</p>
      </div>,
    ];
  }

  if (scenariosErrors) {
    return [
      <div key="placeholder-error-2">
        <p>Error: {scenariosErrors.join(', ')}</p>
      </div>,
    ];
  }

  return [
    <Section title="Coverage" key={0}>
      <Statistic.Number
        wrap
        label="Route length"
        data={futures.map(({ stats, __routeId }) => {
          const meters_distance = stats?.route_distance_meters || 0;
          const miles_distance = meters_distance / 1609.344; // convert meters to miles

          return {
            label: __routeId,
            value: miles_distance.toFixed(2),
          };
        })}
        unit="miles"
      />
      <Statistic.Number
        wrap
        label="Route stops"
        data={futures.map(({ stats, __routeId }) => {
          return {
            label: __routeId,
            value: stats?.stops_count ?? NaN,
          };
        })}
      />
      <Statistic.Number
        wrap
        label="Service coverage"
        data={futures.map(({ stats, __routeId }) => {
          const meters_area = stats?.walk_service_area_area_square_meters || 0;
          const miles_area = meters_area / 1609.344 / 1609.344; // convert square meters to square miles

          return {
            label: __routeId,
            value: miles_area.toFixed(2),
          };
        })}
        unit="square miles"
      />
    </Section>,
    <Section title="Work and School" key={1}>
      <Statistic.Percent
        wrap
        label="Trips currently using public transit"
        data={futures.map(({ stats, __routeId }) => {
          const publicTransitTrips = stats?.methods.commute.public_transit ?? NaN;
          const allTrips = Object.values(stats?.methods.commute || {}).reduce(
            (sum, value) => sum + (value || 0),
            0
          );

          return {
            label: __routeId,
            value: ((publicTransitTrips / allTrips) * 100).toFixed(2),
          };
        })}
      />
      <Statistic.Percent
        wrap
        label="Trips that could use public transit"
        description="Excludes existing public transit trips"
        data={futures.map(({ stats, __routeId }) => {
          const possibleConversions = stats?.possible_conversions.via_walk || 0;
          const allTrips = Object.values(stats?.methods.__all || {}).reduce(
            (sum, value) => sum + (value || 0),
            0
          );

          return {
            label: __routeId,
            value: ((possibleConversions / allTrips) * 100).toFixed(2),
          };
        })}
      />
      <Statistic.Number
        wrap
        label="Current median commute time (all modes)"
        unit="minutes"
        data={futures.map(({ stats, __routeId }) => {
          const medianDuration = stats?.median_duration.commute || 0;
          return { label: __routeId, value: medianDuration.toFixed(2) };
        })}
      />
      <SectionEntry
        s={{ gridColumn: '1 / 3' }}
        m={{ gridColumn: '1 / 4' }}
        l={{ gridColumn: '1 / 5' }}
      >
        <div>
          <Button href={'#/job-access' + jobAccessSearch}>
            Explore industry/sector of employment
          </Button>
        </div>
      </SectionEntry>
      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Current commute travel modes"
        legendBeforeTitle
        plot={futures
          .map(({ stats, __routeId, __label }) => {
            return {
              __label,
              __routeId,
              ...stats?.methods.commute,
            };
          })
          .map(({ __label, __routeId, ...walkServiceAreaCurrentTravelMethods }) => {
            const domainMap: Record<string, string> = {
              biking: 'Biking',
              carpool: 'Carpool',
              commerical: 'Commercial',
              on_demand_auto: 'Rideshare',
              private_auto: 'Personal vehicle',
              public_transit: 'Public transit',
              walking: 'Walking',
              other: 'Other',
            };

            return {
              __label,
              __routeId,
              domainY: Object.values(domainMap),
              plotData: toTidyNominal(domainMap)([walkServiceAreaCurrentTravelMethods]),
            };
          })
          .map(({ __routeId, domainY, plotData }, index, array) => {
            return (_, d3, { presets, utils }) => {
              const allFacetsMaxX = utils.maxAcross(
                array.flatMap(({ plotData }) => plotData),
                'fraction'
              );

              const preset = presets.horizontalBar({
                data: plotData,
                domainX: [0, allFacetsMaxX],
                domainY,
                axis: {
                  label: index === array.length - 1 ? 'Percent of commutes' : '',
                  tickFormat: d3.format('.0%'),
                },
                x: 'fraction',
                y: 'group',
              });

              return {
                title: array.length > 1 ? __routeId : undefined,
                ...preset,
                color: {
                  ...preset.color,
                  legend: index === 0,
                },
              };
            };
          })}
      />
    </Section>,
  ];
}

function Sidebar() {
  const { scenarios } = useAppData();
  const futureRouteIds = (scenarios.data?.futureRoutes || []).map((route) => route.__routeId);

  return (
    <SidebarContent>
      <h1>Options</h1>

      <h2>Filters</h2>
      <SelectedFutureRoutes routeIds={futureRouteIds} />

      <h2>Compare</h2>
      <ComparisonModeSwitch />
    </SidebarContent>
  );
}
