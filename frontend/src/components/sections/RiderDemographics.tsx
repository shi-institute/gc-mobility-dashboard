import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility } from '../../hooks';
import { requireKey, shouldRenderStatistic, toTidyNominal } from '../../utils';
import { Section, Statistic } from '../common';

export function RiderDemographics() {
  const { data } = useAppData();

  const [visibleSections] = useSectionsVisibility();
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds.AreaDemographics
  );

  return (
    <Section title="Rider Demographics">
      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Population by race"
        legendBeforeTitle
        if={shouldRender('race')}
        plot={(data || [])
          .filter(requireKey('statistics'))
          .map((area) => {
            return {
              __label: area.__label,
              ...area.statistics.thursday_trip__public_transit_synthetic_population_demographics
                ?.race,
            };
          })
          .map(({ __label, ...areaRaceData }) => {
            const domainMap: Record<string, string> = {
              black_african_american: 'Black',
              white: 'White',
              asian: 'Asian',
              other_race_alone: 'Other',
              two_or_more_races: 'Two or more',
            };

            return {
              __label,
              domainY: Object.values(domainMap),
              plotData: toTidyNominal(domainMap)([areaRaceData]),
            };
          })
          .map(({ __label, domainY, plotData }, index, array) => {
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
                  label: index === array.length - 1 ? 'Percent of population' : '',
                  tickFormat: d3.format('.0%'),
                },
                x: 'fraction',
                y: 'group',
              });

              return {
                title: array.length > 1 ? __label : undefined,
                ...preset,
                color: {
                  ...preset.color,
                  legend: index === 0,
                },
              };
            };
          })}
      />

      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Population by ethnicity"
        legendBeforeTitle
        if={shouldRender('eth')}
        plot={(data || [])
          .filter(requireKey('statistics'))
          .map((area) => {
            return {
              __label: area.__label,
              ...area.statistics.thursday_trip__public_transit_synthetic_population_demographics
                ?.ethnicity,
            };
          })
          .map(({ __label, ...areaRaceData }) => {
            const domainMap: Record<string, string> = {
              hispanic_or_latino: 'Hispanic/Latino',
              not_hispanic_or_latino: 'Not Hispanic/Latino',
            };

            return {
              __label,
              domainY: Object.values(domainMap),
              plotData: toTidyNominal(domainMap)([areaRaceData]),
            };
          })
          .map(({ __label, domainY, plotData }, index, array) => {
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
                  label: index === array.length - 1 ? 'Percent of population' : '',
                  tickFormat: d3.format('.0%'),
                },
                x: 'fraction',
                y: 'group',
              });

              return {
                title: array.length > 1 ? __label : undefined,
                ...preset,
                color: {
                  ...preset.color,
                  legend: index === 0,
                },
              };
            };
          })}
      />

      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Educational attainment"
        legendBeforeTitle
        if={shouldRender('edu')}
        plot={(data || [])
          .filter(requireKey('statistics'))
          .map((area) => {
            return {
              __label: area.__label,
              ...area.statistics.thursday_trip__public_transit_synthetic_population_demographics
                ?.education,
            };
          })
          .map(({ __label, ...areaRaceData }) => {
            const domainMap: Record<string, string> = {
              advanced_degree: 'Advanced degree',
              bachelors_degree: 'Bachelor’s degree',
              some_college: 'Some college',
              high_school: 'High school degree',
              k_12: 'In school (K-12)',
              no_school: 'No schooling',
              under_3: 'Under 3 years old',
            };

            return {
              __label,
              domainY: Object.values(domainMap),
              plotData: toTidyNominal(domainMap)([areaRaceData]),
            };
          })
          .map(({ __label, domainY, plotData }, index, array) => {
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
                  label: index === array.length - 1 ? 'Percent of population' : '',
                  tickFormat: d3.format('.0%'),
                },
                x: 'fraction',
                y: 'group',
              });

              return {
                title: array.length > 1 ? __label : undefined,
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
