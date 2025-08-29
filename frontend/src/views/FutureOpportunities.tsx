import '@arcgis/map-components/dist/components/arcgis-map';
import { useContext, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Button,
  CoreFrame,
  CoreFrameContext,
  IconButton,
  Map,
  PageHeader,
  renderSections,
  SectionBundle,
  SidebarContent,
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
import { notEmpty } from '../utils';

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
      sections={renderSections(
        [
          <SectionBundle.Future.Coverage key="Coverage" />,
          <SectionBundle.Future.WorkAndSchoolCommute key="Work & School" />,
        ],
        true
      )}
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
