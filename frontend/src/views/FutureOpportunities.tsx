import '@arcgis/map-components/dist/components/arcgis-map';
import { useContext, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Button,
  CoreFrame,
  CoreFrameContext,
  ErrorBoundary,
  IconButton,
  Map,
  PageHeader,
  renderSections,
  SidebarContent,
} from '../components';
import { DismissIcon } from '../components/common/IconButton/DismssIcon';
import { renderSection } from '../components/layout/SectionRenderer/renderSections';
import { AppNavigation } from '../components/navigation';
import {
  ComparisonModeSwitch,
  SelectedFutureRoutes,
  useComparisonModeState,
} from '../components/options';
import { useAppData, useLocalStorage, useMapData, useSectionsVisibility } from '../hooks';
import { useFutureMapData } from '../hooks/useMapData';
import { notEmpty } from '../utils';

export function FutureOpportunities() {
  const { data, scenarios: scenariosData, loading } = useAppData();
  const [visibleSections, , , editMode] = useSectionsVisibility();

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

  const render = renderSection.bind(null, visibleSections, editMode);

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      loading={loading || scenariosData.loading}
      header={<AppNavigation />}
      sectionsHeader={<SectionsHeader />}
      sidebar={<Sidebar />}
      map={
        <ErrorBoundary fallback={<div>Map failed to load</div>} title="Map">
          <div style={{ height: '100%' }}>
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
        </ErrorBoundary>
      }
      sections={renderSections(
        [
          render('Future.Coverage', 'Coverage'),
          render('Future.WorkAndSchoolCommute', 'Work & School'),
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

  const [searchParams] = useSearchParams();
  const selectedRouteIds = (searchParams.get('futures')?.split(',').filter(notEmpty) || []).slice(
    0,
    isComparing ? undefined : 1
  );

  return (
    <PageHeader isComparing={isComparing}>
      <h2>Where can transit expand?</h2>
      <p>
        Visualize selected future transit routes from Greenlink's transit development plan.
        {showAside ? null : (
          <>
            {' '}
            <button className="showAside" onClick={() => setShowAside(true)}>
              More info
            </button>
          </>
        )}
      </p>
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
          <h1>Welcome to the future!</h1>
          <IconButton onClick={() => setShowAside(false)}>
            <DismissIcon size={16} />
          </IconButton>
          <p>
            On this page, you can see how proposed transit routes can bring mobility to more people
            in Greenville.
          </p>
          <p>
            Click the dropdown menu to select a new route, and check the stats to see how the routes
            stack up.
          </p>
        </aside>
      ) : null}
      {selectedRouteIds.includes('GSP Connector') ? (
        <aside>
          <p>
            Greenlink{' '}
            <a href="https://greenvillejournal.com/news/greenlink-to-establish-bus-route-from-downtown-greenville-to-gsp-airport/">
              recently secured
            </a>{' '}
            funding for the bus route between downtown Greenville and Greenville-Spartanburg
            International Airport. It may be ready as soon as 2027.
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
