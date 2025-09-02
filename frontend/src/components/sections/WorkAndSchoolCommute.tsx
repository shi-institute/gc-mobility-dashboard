import { useLocation } from 'react-router';
import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility } from '../../hooks';
import { notEmpty, shouldRenderStatistic } from '../../utils';
import { Button, Section, SectionEntry, Statistic } from '../common';
import { TAB_3_FRAGMENT } from '../navigation';
import { SelectTravelMethod } from '../options';

export function WorkAndSchoolCommute() {
  const { data, travelMethodList } = useAppData();
  const { search } = useLocation();

  const [visibleSections, , visibleTabs] = useSectionsVisibility();
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds.AreaDemographics
  );

  const jobAccessSearch = (() => {
    const currentSearchParams = new URLSearchParams(search);

    const selectedAreas = currentSearchParams.get('areas')?.split(',').filter(notEmpty) || [];
    const selectedSeasons = currentSearchParams.get('seasons')?.split(',').filter(notEmpty) || [];

    const selectedSeasonAreas = selectedAreas.flatMap((area) => {
      return selectedSeasons.map((season) => `${area}::${season}`);
    });

    currentSearchParams.set('jobAreas', selectedSeasonAreas.join(','));
    return currentSearchParams.toString() ? `?${currentSearchParams.toString()}` : '';
  })();

  return (
    <Section title="Commutes to Work and School" shortTitle="Work & School">
      {shouldRender('bluelines') ? (
        <SectionEntry
          s={{ gridColumn: '1 / 3' }}
          m={{ gridColumn: '1 / 4' }}
          l={{ gridColumn: '1 / 5' }}
        >
          <div>
            <SelectTravelMethod
              travelMethodList={travelMethodList}
              label={
                'Show trip density on the map for commutes in ' +
                (data?.length === 1 ? 'this area' : 'the selected seasons and areas')
              }
            />
          </div>
        </SectionEntry>
      ) : null}
      <Statistic.Percent
        wrap
        label="Any trip using public transit"
        if={shouldRender('curr')}
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
        data={data?.map((area) => {
          const medianDuration = area.statistics?.thursday_trip.median_duration.commute || 0;
          return { label: area.__label, value: medianDuration.toFixed(2) };
        })}
      />
      {!visibleTabs || visibleTabs.includes(TAB_3_FRAGMENT) ? (
        <SectionEntry
          s={{ gridColumn: '1 / 3' }}
          m={{ gridColumn: '1 / 4' }}
          l={{ gridColumn: '1 / 5' }}
        >
          <div>
            <Button href={'#/job-access' + jobAccessSearch}>
              Explore industry/sector of employment
            </Button>
          </div>
        </SectionEntry>
      ) : null}
    </Section>
  );
}
