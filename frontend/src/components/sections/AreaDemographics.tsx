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
        icon={
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M14.754 10c.966 0 1.75.784 1.75 1.75V15H16.5v.25a.75.75 0 0 1-1.5 0V13h.004v-1.25a.25.25 0 0 0-.25-.25H9.252a.25.25 0 0 0-.25.25V15H9v.25a.75.75 0 0 1-1.5 0V13h.002v-1.25c0-.966.783-1.75 1.75-1.75h5.502ZM20.5 11.75v3.5a.75.75 0 0 0 1.5 0v-3.5A1.75 1.75 0 0 0 20.25 10h-3.375c.343.415.567.932.618 1.5h2.757a.25.25 0 0 1 .25.25ZM2 15.25a.75.75 0 0 0 1.5 0v-3.5a.25.25 0 0 1 .25-.25h2.763a2.738 2.738 0 0 1 .618-1.5H3.75A1.75 1.75 0 0 0 2 11.75v3.5ZM12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM18.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM5.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM2.75 17a.75.75 0 0 0-.75.75v.5A3.75 3.75 0 0 0 5.75 22h12.5A3.75 3.75 0 0 0 22 18.25v-.5a.75.75 0 0 0-.75-.75H2.75Zm3 3.5a2.25 2.25 0 0 1-2.236-2h16.972a2.25 2.25 0 0 1-2.236 2H5.75Z"
              fill="currentColor"
            />
          </svg>
        }
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
                // require a sample size of at least 30 to display the figure
                sampleSizeIsTooSmall:
                  Object.values(plotData).reduce((acc, val) => acc + val.value, 0) < 30,
              };
            };
          })}
      />

      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Population by ethnicity"
        icon={
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M14.754 10c.966 0 1.75.784 1.75 1.75V15H16.5v.25a.75.75 0 0 1-1.5 0V13h.004v-1.25a.25.25 0 0 0-.25-.25H9.252a.25.25 0 0 0-.25.25V15H9v.25a.75.75 0 0 1-1.5 0V13h.002v-1.25c0-.966.783-1.75 1.75-1.75h5.502ZM20.5 11.75v3.5a.75.75 0 0 0 1.5 0v-3.5A1.75 1.75 0 0 0 20.25 10h-3.375c.343.415.567.932.618 1.5h2.757a.25.25 0 0 1 .25.25ZM2 15.25a.75.75 0 0 0 1.5 0v-3.5a.25.25 0 0 1 .25-.25h2.763a2.738 2.738 0 0 1 .618-1.5H3.75A1.75 1.75 0 0 0 2 11.75v3.5ZM12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM18.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM5.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM2.75 17a.75.75 0 0 0-.75.75v.5A3.75 3.75 0 0 0 5.75 22h12.5A3.75 3.75 0 0 0 22 18.25v-.5a.75.75 0 0 0-.75-.75H2.75Zm3 3.5a2.25 2.25 0 0 1-2.236-2h16.972a2.25 2.25 0 0 1-2.236 2H5.75Z"
              fill="currentColor"
            />
          </svg>
        }
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
                // require a sample size of at least 30 to display the figure
                sampleSizeIsTooSmall:
                  Object.values(plotData).reduce((acc, val) => acc + val.value, 0) < 30,
              };
            };
          })}
      />

      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Educational attainment"
        icon={
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M14.754 10c.966 0 1.75.784 1.75 1.75V15H16.5v.25a.75.75 0 0 1-1.5 0V13h.004v-1.25a.25.25 0 0 0-.25-.25H9.252a.25.25 0 0 0-.25.25V15H9v.25a.75.75 0 0 1-1.5 0V13h.002v-1.25c0-.966.783-1.75 1.75-1.75h5.502ZM20.5 11.75v3.5a.75.75 0 0 0 1.5 0v-3.5A1.75 1.75 0 0 0 20.25 10h-3.375c.343.415.567.932.618 1.5h2.757a.25.25 0 0 1 .25.25ZM2 15.25a.75.75 0 0 0 1.5 0v-3.5a.25.25 0 0 1 .25-.25h2.763a2.738 2.738 0 0 1 .618-1.5H3.75A1.75 1.75 0 0 0 2 11.75v3.5ZM12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM18.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM5.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM2.75 17a.75.75 0 0 0-.75.75v.5A3.75 3.75 0 0 0 5.75 22h12.5A3.75 3.75 0 0 0 22 18.25v-.5a.75.75 0 0 0-.75-.75H2.75Zm3 3.5a2.25 2.25 0 0 1-2.236-2h16.972a2.25 2.25 0 0 1-2.236 2H5.75Z"
              fill="currentColor"
            />
          </svg>
        }
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
                // require a sample size of at least 30 to display the figure
                sampleSizeIsTooSmall:
                  Object.values(plotData).reduce((acc, val) => acc + val.value, 0) < 30,
              };
            };
          })}
      />
    </Section>
  );
}
