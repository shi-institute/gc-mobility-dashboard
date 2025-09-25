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

  // replica does not have public transit ridership data for Greenville County before 2023 Q4
  const publicTransitReplicaRidershipDataExists =
    data?.some((area) => area.statistics?.thursday_trip.methods.commute.public_transit) || false;

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
            style={{
              opacity: shouldRender('bluelines') === 'partial' ? 0.5 : 1,
              fontSize: '0.875rem',
            }}
          >
            <div>
              <div>
                {'Show trip density on the map for commutes in ' +
                  (data?.length === 1 ? 'this area.' : 'the selected seasons and areas.')}
              </div>
              <div style={{ color: 'var(--text-secondary)', letterSpacing: '-0.34px' }}>
                The width of the blue lines indicates the trip density.
              </div>
              <SelectTravelMethod travelMethodList={travelMethodList} label={''} />
            </div>
          </StatisticContainer>
        </SectionEntry>
      ) : null}
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
