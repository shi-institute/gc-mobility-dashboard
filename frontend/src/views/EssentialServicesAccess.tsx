import '@arcgis/map-components/dist/components/arcgis-map';
import { CoreFrame, Map, Section, SidebarContent, Statistic } from '../components';
import { AppNavigation } from '../components/navigation';
import {
  ComparisonModeSwitch,
  SelectedArea,
  SelectedSeason,
  SelectTravelMethod,
} from '../components/options';
import { useAppData, useMapData } from '../hooks';
import { notEmpty } from '../utils';

export function EssentialServicesAccess() {
  const { data } = useAppData();
  const {
    networkSegments,
    areaPolygons,
    routes,
    stops,
    walkServiceAreas,
    groceryStores,
    healthcareFacilities,
    childCareCenters,
    commercialZones,
  } = useMapData(data);

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      header={<AppNavigation />}
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
              healthcareFacilities,
              childCareCenters,
              commercialZones,
              ...areaPolygons,
            ].filter(notEmpty)}
          />
        </div>
      }
      sections={Sections()}
    />
  );
}

function Sections() {
  const { data } = useAppData();

  return [
    <Section title="Essential Services Access via Public Transit">
      <Statistic.Percent
        label="Grocery Stores"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.grocery_store__access_fraction || NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Healthcare"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.healthcare__access_fraction || NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Child Care Centers"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.child_care__access_fraction || NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
      <Statistic.Percent
        label="Commercial Zones"
        wrap
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.commercial_zone__access_fraction || NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
      />
    </Section>,
    <Section title="Recorded Average Travel Time to Essential Services via Public Transit">
      <Statistic.Number
        label="Grocery Stores"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.grocery_store__mean_travel_time || NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Healthcare"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.healthcare__mean_travel_time || NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Child Care Centers"
        wrap
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.child_care__mean_travel_time || NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
      />
      <Statistic.Number
        label="Commercial Zones"
        wrap
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.commercial_zone__mean_travel_time || NaN;
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
