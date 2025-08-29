import { useLocation, useSearchParams } from 'react-router';
import { useAppData } from '../../hooks';
import { notEmpty, toTidyNominal } from '../../utils';
import { Button, Section, SectionEntry, Statistic } from '../common';
import { useComparisonModeState } from '../options';

export function WorkAndSchool2() {
  const { scenarios } = useAppData();
  const { data: scenariosData } = scenarios;
  const { search } = useLocation();

  const [isComparing] = useComparisonModeState();
  const [searchParams] = useSearchParams();
  const selectedRouteIds = (searchParams.get('futures')?.split(',').filter(notEmpty) || []).slice(
    0,
    isComparing ? undefined : 1
  );
  const futures = (scenariosData?.futureRoutes || []).filter((future) =>
    selectedRouteIds.includes(future.__routeId)
  );

  const jobAccessSearch = (() => {
    const currentSearchParams = new URLSearchParams(search);
    currentSearchParams.set('jobAreas', selectedRouteIds.map((id) => `${id}::future`).join(','));
    return currentSearchParams.toString() ? `?${currentSearchParams.toString()}` : '';
  })();

  return (
    <Section title="Work and School" key={1}>
      <Statistic.Percent
        wrap
        label="Trips currently using public transit"
        data={futures.map(({ stats, __routeId }) => {
          const publicTransitTrips = stats?.methods.commute.public_transit ?? NaN;
          const allTrips = Object.values(stats?.methods.commute || {}).reduce(
            (sum, value) => sum + (value || 0),
            0
          );

          return {
            label: __routeId,
            value: ((publicTransitTrips / allTrips) * 100).toFixed(2),
          };
        })}
      />
      <Statistic.Percent
        wrap
        label="Trips that could use public transit"
        description="Excludes existing public transit trips"
        data={futures.map(({ stats, __routeId }) => {
          const possibleConversions = stats?.possible_conversions.via_walk || 0;
          const allTrips = Object.values(stats?.methods.__all || {}).reduce(
            (sum, value) => sum + (value || 0),
            0
          );

          return {
            label: __routeId,
            value: ((possibleConversions / allTrips) * 100).toFixed(2),
          };
        })}
      />
      <Statistic.Number
        wrap
        label="Current median commute time (all modes)"
        unit="minutes"
        data={futures.map(({ stats, __routeId }) => {
          const medianDuration = stats?.median_duration.commute || 0;
          return { label: __routeId, value: medianDuration.toFixed(2) };
        })}
      />
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
      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Current commute travel modes"
        legendBeforeTitle
        plot={futures
          .map(({ stats, __routeId, __label }) => {
            return {
              __label,
              __routeId,
              ...stats?.methods.commute,
            };
          })
          .map(({ __label, __routeId, ...walkServiceAreaCurrentTravelMethods }) => {
            const domainMap: Record<string, string> = {
              biking: 'Biking',
              carpool: 'Carpool',
              commerical: 'Commercial',
              on_demand_auto: 'Rideshare',
              private_auto: 'Personal vehicle',
              public_transit: 'Public transit',
              walking: 'Walking',
              other: 'Other',
            };

            return {
              __label,
              __routeId,
              domainY: Object.values(domainMap),
              plotData: toTidyNominal(domainMap)([walkServiceAreaCurrentTravelMethods]),
            };
          })
          .map(({ __routeId, domainY, plotData }, index, array) => {
            return (_, d3, { presets, utils }) => {
              const allFacetsMaxX = utils.maxAcross(
                array.flatMap(({ plotData }) => plotData),
                'fraction'
              );

              const preset = presets.horizontalBar({
                data: plotData,
                domainX: [0, allFacetsMaxX],
                domainY,
                axis: {
                  label: index === array.length - 1 ? 'Percent of commutes' : '',
                  tickFormat: d3.format('.0%'),
                },
                x: 'fraction',
                y: 'group',
              });

              return {
                title: array.length > 1 ? __routeId : undefined,
                ...preset,
                color: {
                  ...preset.color,
                  legend: index === 0,
                },
              };
            };
          })}
      />
    </Section>
  );
}
