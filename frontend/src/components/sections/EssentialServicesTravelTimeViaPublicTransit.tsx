import { useAppData } from '../../hooks';
import { Section, Statistic } from '../common';

export function EssentialServicesTravelTimeViaPublicTransit() {
  const { data } = useAppData();

  return (
    <Section
      title="Recorded Average Travel Time to Essential Services via Public Transit"
      shortTitle="Travel Time"
      key={1}
    >
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
    </Section>
  );
}
