import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility, useToggleSectionItemVisibility } from '../../hooks';
import { shouldRenderStatistic } from '../../utils';
import { Section, Statistic } from '../common';

export function WorkAndSchoolCommute() {
  const { data } = useAppData();

  const [visibleSections] = useSectionsVisibility();
  const { editMode, handleClick } = useToggleSectionItemVisibility('WorkAndSchoolCommute');
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds.WorkAndSchoolCommute,
    editMode
  );

  // replica does not have public transit ridership data for Greenville County before 2023 Q4
  const publicTransitReplicaRidershipDataExists =
    data?.some((area) => area.statistics?.thursday_trip.methods.commute.public_transit) || false;

  return (
    <Section title="Commutes to Work and School" shortTitle="Work & School">
      {publicTransitReplicaRidershipDataExists ? (
        <Statistic.Percent
          wrap
          label="Any trip using public transit"
          if={shouldRender('curr')}
          onClick={handleClick('curr')}
          data={data?.map((area) => {
            const publicTransitTrips =
              area.statistics?.thursday_trip.methods.commute.public_transit || NaN;

            const allTrips = Object.values(
              area.statistics?.thursday_trip.methods.commute || {}
            ).reduce((sum, value) => sum + (value || 0), 0);

            return {
              label: area.__label,
              value: ((publicTransitTrips / allTrips) * 100).toFixed(2),
            };
          })}
        />
      ) : null}
      <Statistic.Percent
        wrap
        label="Any trip that could use public transit"
        description={
          publicTransitReplicaRidershipDataExists
            ? 'Excludes existing public transit trips'
            : undefined
        }
        if={shouldRender('poten')}
        onClick={handleClick('poten')}
        data={data?.map((area) => {
          const possibleConversions =
            area.statistics?.thursday_trip.possible_conversions.via_walk || 0;
          const allTrips = Object.values(area.statistics?.thursday_trip.methods.__all || {}).reduce(
            (sum, value) => sum + (value || 0),
            0
          );

          return {
            label: area.__label,
            value: ((possibleConversions / allTrips) * 100).toFixed(2),
          };
        })}
      />
      <Statistic.Percent
        wrap
        label="Households without a vehicle (ACS)"
        if={shouldRender('novehic')}
        onClick={handleClick('novehic')}
        data={data?.map((area) => {
          const households =
            area.census_acs_5year
              ?.map((item) => item.households__total)
              .reduce((sum, value) => sum + (value || 0), 0) || NaN;
          const householdsNoVehicle =
            area.census_acs_5year
              ?.map((item) => item.households__no_vehicle)
              .reduce((sum, value) => sum + (value || 0), 0) || NaN;

          return {
            label: area.__label,
            value: ((householdsNoVehicle / households) * 100).toFixed(2),
          };
        })}
      />
      <Statistic.Number
        wrap
        label="Median commute time (all modes)"
        unit="minutes"
        if={shouldRender('medt')}
        onClick={handleClick('medt')}
        data={data?.map((area) => {
          const medianDuration = area.statistics?.thursday_trip.median_duration.commute || 0;
          return { label: area.__label, value: medianDuration.toFixed(2) };
        })}
      />
    </Section>
  );
}
