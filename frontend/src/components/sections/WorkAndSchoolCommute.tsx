import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility, useToggleSectionItemVisibility } from '../../hooks';
import { shouldRenderStatistic } from '../../utils';
import { Section, SectionEntry, Statistic } from '../common';
import { StatisticContainer } from '../common/Statistic/StatisticContainer';
import { SelectTravelMethod } from '../options';

export function WorkAndSchoolCommute() {
  const { data, travelMethodList } = useAppData();

  const [visibleSections] = useSectionsVisibility();
  const { editMode, handleClick } = useToggleSectionItemVisibility('WorkAndSchoolCommute');
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds.WorkAndSchoolCommute,
    editMode
  );

  return (
    <Section title="Commutes to Work and School" shortTitle="Work & School">
      {shouldRender('bluelines') ? (
        <SectionEntry
          s={{ gridColumn: '1 / 3' }}
          m={{ gridColumn: '1 / 4' }}
          l={{ gridColumn: '1 / 5' }}
        >
          <StatisticContainer
            onClick={handleClick('bluelines')}
            style={{ opacity: shouldRender('bluelines') === 'partial' ? 0.5 : 1 }}
          >
            <SelectTravelMethod
              travelMethodList={travelMethodList}
              label={
                'Show trip density on the map for commutes in ' +
                (data?.length === 1 ? 'this area' : 'the selected seasons and areas')
              }
            />
          </StatisticContainer>
        </SectionEntry>
      ) : null}
      <Statistic.Percent
        wrap
        label="Any trip using public transit"
        if={shouldRender('curr')}
        onClick={handleClick('curr')}
        data={data?.map((area) => {
          const publicTransitTrips =
            area.statistics?.thursday_trip.methods.commute.public_transit || 0;
          const allTrips = Object.values(
            area.statistics?.thursday_trip.methods.commute || {}
          ).reduce((sum, value) => sum + (value || 0), 0);

          return {
            label: area.__label,
            value: ((publicTransitTrips / allTrips) * 100).toFixed(2),
          };
        })}
      />
      <Statistic.Percent
        wrap
        label="Any trip that could use public transit"
        description="Excludes existing public transit trips"
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
