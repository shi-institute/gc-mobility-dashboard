import '@arcgis/map-components/dist/components/arcgis-map';
import { useContext, useState } from 'react';
import {
  Button,
  CoreFrame,
  CoreFrameContext,
  DeveloperDetails,
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
  SelectedArea,
  SelectedSeason,
  SelectTravelMethod,
  useComparisonModeState,
} from '../components/options';
import { useAppData, useLocalStorage, useMapData, useSectionsVisibility } from '../hooks';
import { listOxford, notEmpty } from '../utils';

export function GeneralAccess() {
  const { data, loading } = useAppData();
  const [visibleSections] = useSectionsVisibility();

  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const {
    networkSegments,
    areaPolygons,
    routes,
    stops,
    walkServiceAreas,
    cyclingServiceAreas,
    paratransitServiceAreas,
  } = useMapData(data, mapView, { zoomTo: 'areas' });

  const render = renderSection.bind(null, visibleSections);

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      loading={loading}
      header={<AppNavigation />}
      sectionsHeader={<SectionsHeader />}
      sidebar={<Sidebar />}
      map={
        <ErrorBoundary fallback={<div>Map failed to load</div>} title="Map">
          <div style={{ height: '100%' }}>
            <Map
              layers={[
                ...networkSegments,
                paratransitServiceAreas,
                cyclingServiceAreas,
                walkServiceAreas,
                routes,
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
      sections={renderSections([
        render('ServiceStatistics', 'Service Statistics'),
        render('WorkAndSchoolCommute', 'Work & School'),
        render('AreaDemographics', 'Area Demographics'),
        render('RiderDemographics', 'Work Demographics'),
        <DeveloperDetails key="Developer Tools" />,
      ])}
    />
  );
}

function SectionsHeader() {
  const [isComparing] = useComparisonModeState();
  const { data, areasList, seasonsList } = useAppData();

  const { optionsOpen, setOptionsOpen, isFullDesktop, isMobile } = useContext(CoreFrameContext);

  const [showAside, setShowAside] = useLocalStorage('aside--tab-1', true);

  const uniqueAreaNames = Array.from(new Set((data || []).map((area) => area.__area))).sort();

  return (
    <PageHeader isComparing={isComparing}>
      <h2>{listOxford(uniqueAreaNames)}</h2>
      {isFullDesktop || isMobile ? null : (
        <div className="button-row">
          {isComparing ? (
            <p className="message">Open options to show different areas and seasons.</p>
          ) : (
            <>
              <SelectedArea areasList={areasList} />
              <SelectedSeason seasonsList={seasonsList} />
            </>
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
  const { areasList, seasonsList, travelMethodList } = useAppData();

  return (
    <SidebarContent>
      <h1>Options</h1>

      <h2>Filters</h2>
      <SelectedArea areasList={areasList} />
      <SelectedSeason seasonsList={seasonsList} />

      <h2>Compare</h2>
      <ComparisonModeSwitch />

      <h2>Work & School</h2>
      <SelectTravelMethod travelMethodList={travelMethodList} />
    </SidebarContent>
  );
}
