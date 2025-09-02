import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility, useToggleSectionItemVisibility } from '../../hooks';
import { requireKey, shouldRenderStatistic, toTidyNominal } from '../../utils';
import { Section, Statistic } from '../common';

export function AreaDemographics() {
  const { data } = useAppData();

  const [visibleSections] = useSectionsVisibility();
  const { editMode, handleClick } = useToggleSectionItemVisibility('AreaDemographics');
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds.AreaDemographics,
    editMode
  );

  return (
    <Section title="Area Demographics">
      {(() => {
        if (data?.length === 1) {
          const censusData = data[0]!.census_acs_5year;
          const censusYearRange = censusData?.[0]?.YEAR;

          return (
            <Statistic.Number
              wrap
              label={
                `Population estimate` + (censusYearRange ? ` (ACS ${censusYearRange})` : ' (ACS)')
              }
              data={data?.map((area) => ({
                label: area.__label,
                value:
                  censusData
                    ?.map((item) => item.population__total)
                    .reduce((sum, value) => sum + (value || 0), 0) || NaN,
              }))}
              if={shouldRender('pop')}
              onClick={handleClick('pop')}
            />
          );
        }

        return (
          <Statistic.Number
            wrap
            label="Population estimate (ACS)"
            data={data?.map((area) => ({
              label: area.__label,
              value:
                area.census_acs_5year
                  ?.map((item) => item.population__total)
                  .reduce((sum, value) => sum + (value || 0), 0) || NaN,
            }))}
            if={shouldRender('pop')}
            onClick={handleClick('pop')}
          />
        );
      })()}

      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Population by race"
        legendBeforeTitle
        if={shouldRender('race')}
        onClick={handleClick('race')}
        plot={(data || [])
          .filter(requireKey('statistics'))
          .map((area) => {
            return {
              __label: area.__label,
              ...area.statistics.synthetic_demographics.race,
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
        onClick={handleClick('eth')}
        plot={(data || [])
          .filter(requireKey('statistics'))
          .map((area) => {
            return {
              __label: area.__label,
              ...area.statistics.synthetic_demographics.ethnicity,
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
        onClick={handleClick('edu')}
        plot={(data || [])
          .filter(requireKey('statistics'))
          .map((area) => {
            return {
              __label: area.__label,
              ...area.statistics.synthetic_demographics.education,
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
