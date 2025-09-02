import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility } from '../../hooks';
import { shouldRenderStatistic } from '../../utils';
import { Section, Statistic } from '../common';

export function ServiceStatistics() {
  const { data } = useAppData();

  const ridershipDataExists = data?.some((area) => area.ridership) || false;

  const [visibleSections] = useSectionsVisibility();
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds.ServiceStatistics
  );

  return (
    <Section title="Service Statistics">
      <Statistic.Number
        wrap
        label="Miles of service"
        data={data?.map((area) => {
          const meters_distance = area.coverage?.routes_distance_meters || 0;
          const miles_distance = meters_distance / 1609.344; // convert meters to miles

          return {
            label: area.__label,
            value: miles_distance.toFixed(2),
          };
        })}
        unit="miles"
        if={shouldRender('mos')}
      />
      <Statistic.Number
        wrap
        label="Number of stops"
        data={data?.map((area) => {
          return {
            label: area.__label,
            value: area.coverage?.stops_count || NaN,
          };
        })}
        if={shouldRender('nostop')}
      />
      <Statistic.Money
        wrap
        label="Local funding"
        perCapita
        data={data?.map((area) => {
          const localFunding =
            area.operating_funds?.find((fund) => fund.Source === 'Local Government')?.Value ?? NaN;
          const population = area.census_acs_5year__county_total_population || NaN;

          return {
            label: area.__label,
            value: localFunding / population,
          };
        })}
        if={shouldRender('lf')}
      />
      {ridershipDataExists ? (
        <>
          <Statistic.Number
            wrap
            label="Boardings"
            description="Sum of passengers getting on a bus"
            data={data?.map((area) => {
              const boardings = area.ridership?.area.map((stop) => stop.boarding) || [];
              const boardingsTotal = boardings.reduce((sum, value) => sum + (value || 0), 0);

              return {
                label: area.__label,
                value: boardingsTotal,
              };
            })}
            if={shouldRender('on')}
          />
          <Statistic.Number
            wrap
            label="Alightings"
            description="Sum of passengers getting off a bus"
            data={data?.map((area) => {
              const alightings = area.ridership?.area.map((stop) => stop.alighting) || [];
              const alightingsTotal = alightings.reduce((sum, value) => sum + (value || 0), 0);

              return {
                label: area.__label,
                value: alightingsTotal,
              };
            })}
            if={shouldRender('off')}
          />
        </>
      ) : null}
      <Statistic.Number
        wrap
        label="Service coverage"
        data={data?.map((area) => {
          const meters_area = area.coverage?.walk_service_area_area_square_meters || 0;
          const miles_area = meters_area / 1609.344 / 1609.344; // convert square meters to square miles

          return {
            label: area.__label,
            value: miles_area.toFixed(2),
          };
        })}
        unit="square miles"
        if={shouldRender('servsqmi')}
      />
      <Statistic.Percent
        wrap
        label="Household access"
        data={data?.map((area) => {
          const area_households = area.statistics?.synthetic_demographics.households || 0;
          const area_households_covered =
            area.statistics?.synthetic_demographics.households_in_service_area?.walk || 0;

          return {
            label: area.__label,
            value: ((area_households_covered / area_households) * 100).toFixed(1),
          };
        })}
        if={shouldRender('hhacc')}
      />
    </Section>
  );
}
