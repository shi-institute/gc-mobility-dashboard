import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility, useToggleSectionItemVisibility } from '../../hooks';
import { shouldRenderStatistic } from '../../utils';
import { Section, Statistic } from '../common';

export function EssentialServicesTravelTimeViaPublicTransit() {
  const { data } = useAppData();

  const [visibleSections] = useSectionsVisibility();
  const { editMode, handleClick } = useToggleSectionItemVisibility(
    'EssentialServices.TravelTimeViaPublicTransit'
  );
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds['EssentialServices.TravelTimeViaPublicTransit'],
    editMode
  );

  // replica does not have public transit ridership data for Greenville County before 2023 Q4
  // which means there are no public transit commute times available
  const publicTransitReplicaRidershipDataExists =
    data?.some((area) => area.statistics?.thursday_trip.methods.commute.public_transit) || false;
  if (!publicTransitReplicaRidershipDataExists) {
    return null;
  }

  return (
    <Section
      title="Recorded Average Travel Time to Essential Services via Public Transit"
      shortTitle="Travel Time"
      description={(() => {
        if (data?.length === 1) {
          const year = data[0]?.__year;
          const quarter = data[0]?.__quarter;
          if (year && quarter) {
            const season = `${quarter === 'Q2' ? 'January-June' : 'July-December'} ${year}`;
            return `The average travel time of recorded trips to essential services via public transit during ${season} in ${data[0]?.__label}.`;
          }
        }
        return 'The average travel time of recorded trips to essential services via public transit during the specified season and in the speicifed area.';
      })()}
      key={1}
    >
      <Statistic.Number
        label="Grocery Stores"
        wrap
        if={shouldRender('groc')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.grocery_store__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
        onClick={handleClick('groc')}
      />
      <Statistic.Number
        label="Dental Care"
        wrap
        if={shouldRender('dent')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.dental__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
        onClick={handleClick('dent')}
      />
      <Statistic.Number
        label="Eye Care"
        wrap
        if={shouldRender('eye')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.eye_care__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
        onClick={handleClick('eye')}
      />
      <Statistic.Number
        label="Family Medicine"
        wrap
        if={shouldRender('fam')}
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.family_medicine__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
        onClick={handleClick('fam')}
      />
      <Statistic.Number
        label="Free Clinics"
        wrap
        if={shouldRender('free')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.free_clinics__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
        onClick={handleClick('free')}
      />
      <Statistic.Number
        label="Hospitals"
        wrap
        if={shouldRender('hosp')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.hospitals__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
        onClick={handleClick('hosp')}
      />
      <Statistic.Number
        label="Internal Medicine"
        wrap
        if={shouldRender('intm')}
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.internal_medicine__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
        onClick={handleClick('intm')}
      />
      <Statistic.Number
        label="Urgent Care"
        wrap
        if={shouldRender('urg')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.urgent_care__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
        onClick={handleClick('urg')}
      />
      <Statistic.Number
        label="Child Care Centers"
        wrap
        if={shouldRender('child')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.child_care__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
        onClick={handleClick('child')}
      />
      <Statistic.Number
        label="Commercial Zones"
        wrap
        if={shouldRender('com')}
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.commercial_zone__mean_travel_time ?? NaN;
          return { label: area.__label, value: stat.toFixed(1) };
        })}
        unit="minutes"
        onClick={handleClick('com')}
      />
    </Section>
  );
}
