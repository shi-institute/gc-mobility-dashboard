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
  const [visibleSections, , , editMode] = useSectionsVisibility();

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

  const render = renderSection.bind(null, visibleSections, editMode);

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

  const seasons = Array.from(
    new Set(
      (data || []).map((area) => {
        let seasonString = '';
        if (area.__quarter === 'Q2') {
          seasonString = 'April-June';
        } else if (area.__quarter === 'Q4') {
          seasonString = 'October-December';
        }
        if (area.__year) {
          seasonString += ` ${area.__year}`;
        }
        return seasonString;
      })
    )
  ).sort();

  return (
    <PageHeader isComparing={isComparing}>
      <h2>Where does transit go?</h2>
      <p>
        Viewing: {listOxford(uniqueAreaNames)} for {listOxford(seasons)}
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
          <h1>Welcome to the Greenville Connects transit data dashboard!</h1>
          <IconButton onClick={() => setShowAside(false)}>
            <DismissIcon size={16} />
          </IconButton>
          <p>
            This is the General Access page. Here, you can see where Greenlink’s routes go, how many
            riders they service, and how they match with other modes of transportation.
          </p>
          <p>
            In the options menu, you can select which area you’d like to get data about, and when
            that data is from.
          </p>
          <p>
            You can also select which mode of transportation you’d like to see. The weight of the
            blue lines indicates how often those routes are taken using that form of transportation.{' '}
          </p>
          <p>
            You can enter comparison mode to see how two areas of Greenville compare in their
            mobility and transit access.
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
