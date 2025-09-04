import '@arcgis/map-components/dist/components/arcgis-map';
import styled from '@emotion/styled';
import { useContext, useState } from 'react';
import {
  Button,
  CoreFrame,
  CoreFrameContext,
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
import { notEmpty } from '../utils';

export function EssentialServicesAccess() {
  const { data, loading } = useAppData();
  const [visibleSections, , , editMode] = useSectionsVisibility();

  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const {
    networkSegments,
    areaPolygons,
    routes,
    stops,
    walkServiceAreas,
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
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '100%' }} title="Map">
            <Map
              layers={[
                ...networkSegments,
                walkServiceAreas,
                commercialZones,
                routes,
                stops,
                groceryStores,
                dentalCareFacilities,
                eyeCareFacilities,
                familyMedicineFacilities,
                freeClinicsFacilities,
                hospitalsFacilities,
                internalMedicineFacilities,
                urgentCareFacilities,
                childCareCenters,
                ...areaPolygons,
              ].filter(notEmpty)}
              onMapReady={(_, view) => {
                setMapView(view);
              }}
              neverShowExpandedLayersListOnLoad
            />
          </div>
          <CompactMapLegend>
            <span>Color Code:</span>
            <span style={{ background: '#fed7ff' }}>Commercial</span>
            <span style={{ background: '#64f3ab' }}>Grocery</span>
            <span style={{ background: '#f1e32b' }}>Medical/Dental</span>
            <span style={{ background: '#7b47f5', color: '#fff' }}>Child Care</span>
          </CompactMapLegend>
        </div>
      }
      sections={renderSections([
        render('EssentialServices.AccessViaPublicTransit', 'Via Public Transit'),
        render('EssentialServices.TravelTimeViaPublicTransit', 'Travel Time'),
      ])}
    />
  );
}

const CompactMapLegend = styled.aside`
  display: flex;
  flex-direction: row;
  gap: 0.25rem 0.5rem;
  justify-content: start;
  align-items: center;
  font-size: 0.875rem;
  flex-wrap: wrap;
  padding: 0.25rem 0;

  span:first-of-type {
    font-weight: 600;
    margin-right: 0.25rem;
    padding: 0;
  }

  span {
    padding: 0.125rem 0.25rem;
    border-radius: var(--button-radius);
  }
`;

function SectionsHeader() {
  const [isComparing] = useComparisonModeState();
  const { areasList, seasonsList } = useAppData();

  const { optionsOpen, setOptionsOpen, isFullDesktop, isMobile } = useContext(CoreFrameContext);

  const [showAside, setShowAside] = useLocalStorage('aside--tab-4', true);

  return (
    <PageHeader isComparing={isComparing}>
      <h2>Who can transit serve?</h2>
      <p>
        Learn what percentage of the population can reach essential services via public transit and
        how long it takes.
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
          <h1>About this tab</h1>
          <IconButton onClick={() => setShowAside(false)}>
            <DismissIcon size={16} />
          </IconButton>
          <p>
            From childcare, to grocery shopping, to doctor’s offices, transit is how thousands of
            people get where they need to be.
          </p>
          <p>
            See which essential services are transit accessible and how long it takes to get there.
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

      <h2>Travel Density Segments</h2>
      <SelectTravelMethod travelMethodList={travelMethodList} />
    </SidebarContent>
  );
}
