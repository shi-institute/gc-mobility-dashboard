import { useAppData } from '../../hooks';
import { Section, Statistic } from '../common';

export function EssentialServicesAccessViaPublicTransit() {
  const { data } = useAppData();

  return (
    <Section
      title="Essential Services Access via Public Transit"
      shortTitle="Via Public Transit"
      key={0}
    >
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
    </Section>
  );
}
