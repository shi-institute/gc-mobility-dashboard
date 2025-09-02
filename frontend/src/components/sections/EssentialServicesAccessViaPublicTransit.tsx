import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility, useToggleSectionItemVisibility } from '../../hooks';
import { shouldRenderStatistic } from '../../utils';
import { Section, Statistic } from '../common';

export function EssentialServicesAccessViaPublicTransit() {
  const { data } = useAppData();

  const [visibleSections] = useSectionsVisibility();
  const { editMode, handleClick } = useToggleSectionItemVisibility(
    'EssentialServices.AccessViaPublicTransit'
  );
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds['EssentialServices.AccessViaPublicTransit'],
    editMode
  );

  return (
    <Section
      title="Essential Services Access via Public Transit"
      shortTitle="Via Public Transit"
      key={0}
    >
      <Statistic.Percent
        label="Grocery Stores"
        wrap
        if={shouldRender('groc')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.grocery_store__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
        onClick={handleClick('groc')}
      />
      <Statistic.Percent
        label="Dental Care"
        wrap
        if={shouldRender('dent')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.dental__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
        onClick={handleClick('dent')}
      />
      <Statistic.Percent
        label="Eye Care"
        wrap
        if={shouldRender('eye')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.eye_care__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
        onClick={handleClick('eye')}
      />
      <Statistic.Percent
        label="Family Medicine"
        wrap
        if={shouldRender('fam')}
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.family_medicine__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
        onClick={handleClick('fam')}
      />
      <Statistic.Percent
        label="Free Clinics"
        wrap
        if={shouldRender('free')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.free_clinics__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
        onClick={handleClick('free')}
      />
      <Statistic.Percent
        label="Hospitals"
        wrap
        if={shouldRender('hosp')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.hospitals__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
        onClick={handleClick('hosp')}
      />
      <Statistic.Percent
        label="Internal Medicine"
        wrap
        if={shouldRender('intm')}
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.internal_medicine__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
        onClick={handleClick('intm')}
      />
      <Statistic.Percent
        label="Urgent Care"
        wrap
        if={shouldRender('urg')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.urgent_care__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
        onClick={handleClick('urg')}
      />
      <Statistic.Percent
        label="Child Care Centers"
        wrap
        if={shouldRender('child')}
        data={data?.map((area) => {
          const stat = area.essential_services_access_stats?.child_care__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
        onClick={handleClick('child')}
      />
      <Statistic.Percent
        label="Commercial Zones"
        wrap
        if={shouldRender('com')}
        data={data?.map((area) => {
          const stat =
            area.essential_services_access_stats?.commercial_zone__access_fraction ?? NaN;
          return { label: area.__label, value: (stat * 100).toFixed(1) };
        })}
        onClick={handleClick('com')}
      />
    </Section>
  );
}
