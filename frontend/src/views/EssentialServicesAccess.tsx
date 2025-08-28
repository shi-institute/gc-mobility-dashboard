import '@arcgis/map-components/dist/components/arcgis-map';
import { useContext, useState } from 'react';
import {
  Button,
  CoreFrame,
  CoreFrameContext,
  IconButton,
  Map,
  PageHeader,
  Section,
  SidebarContent,
  Statistic,
} from '../components';
import { DismissIcon } from '../components/common/IconButton/DismssIcon';
import { AppNavigation } from '../components/navigation';
import {
  ComparisonModeSwitch,
  SelectedArea,
  SelectedSeason,
  SelectTravelMethod,
  useComparisonModeState,
} from '../components/options';
import { useAppData, useLocalStorage, useMapData } from '../hooks';
import { notEmpty } from '../utils';

export function EssentialServicesAccess() {
  const { data, loading } = useAppData();

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
  } = useMapData(data, mapView);

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      loading={loading}
      header={<AppNavigation />}
      sectionsHeader={<SectionsHeader />}
      sidebar={<Sidebar />}
      map={
        <div style={{ height: '100%' }}>
          <Map
            layers={[
              ...networkSegments,
              walkServiceAreas,
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
              commercialZones,
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
  const { areasList, seasonsList } = useAppData();

  const { optionsOpen, setOptionsOpen, isFullDesktop, isMobile } = useContext(CoreFrameContext);

  const [showAside, setShowAside] = useLocalStorage('aside--tab-4', true);

  return (
    <PageHeader isComparing={isComparing}>
      <h2>Which essential services can you access via public transit?</h2>
      <p>
        Learn what percentage of the population can reach essential services via public transit and
        how long it takes.
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
  const { data, loading, errors } = useAppData();

  if (loading && !data) {
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

  return [
    <Section title="Essential Services Access via Public Transit" key={0}>
      <Statistic.Percent
        label="Grocery Stores"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.grocery_store__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Dental Care"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.dental__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Eye Care"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.eye_care__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Family Medicine"
        wrap
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.family_medicine__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Free Clinics"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.free_clinics__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Hospitals"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.hospitals__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Internal Medicine"
        wrap
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.internal_medicine__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Urgent Care"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.urgent_care__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Child Care Centers"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.child_care__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Commercial Zones"
        wrap
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.commercial_zone__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
    </Section>,
    <Section title="Recorded Average Travel Time to Essential Services via Public Transit" key={1}>
      <Statistic.Number
        label="Grocery Stores"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.grocery_store__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Dental Care"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.dental__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Eye Care"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.eye_care__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Family Medicine"
        wrap
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.family_medicine__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Free Clinics"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.free_clinics__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Hospitals"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.hospitals__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Internal Medicine"
        wrap
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.internal_medicine__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Urgent Care"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.urgent_care__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Child Care Centers"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.child_care__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Commercial Zones"
        wrap
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.commercial_zone__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
    </Section>,
  ];
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
