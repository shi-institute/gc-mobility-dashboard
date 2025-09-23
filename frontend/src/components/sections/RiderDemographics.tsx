import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility, useToggleSectionItemVisibility } from '../../hooks';
import { requireKey, shouldRenderStatistic, toTidyNominal } from '../../utils';
import { Section, Statistic } from '../common';

export function RiderDemographics() {
  const { data } = useAppData();

  const [visibleSections] = useSectionsVisibility();
  const { editMode, handleClick } = useToggleSectionItemVisibility('RiderDemographics');
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds.RiderDemographics,
    editMode
  );

  return (
    <Section title="Rider Demographics">
      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Riders by race"
        icon={
          <svg
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.75 5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z"
              fill="currentColor"
            />
            <path
              d="M4 5.75A3.75 3.75 0 0 1 7.75 2h8.5A3.75 3.75 0 0 1 20 5.75V9.5h1.227a.75.75 0 0 1 0 1.5H20v8.75a1.75 1.75 0 0 1-1.75 1.75h-1.5A1.75 1.75 0 0 1 15 19.75V18.5H9v1.25a1.75 1.75 0 0 1-1.75 1.75h-1.5A1.75 1.75 0 0 1 4 19.75V11H2.75a.75.75 0 0 1 0-1.5H4V5.75ZM16.5 18.5v1.25c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25V18.5h-2Zm-11 0v1.25c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25V18.5h-2Zm2.25-15A2.25 2.25 0 0 0 5.5 5.75V12h13V5.75a2.25 2.25 0 0 0-2.25-2.25h-8.5ZM9 15a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm7 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
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
                  label: index === array.length - 1 ? 'Percent of rider population' : '',
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
        label="Riders by ethnicity"
        icon={
          <svg
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.75 5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z"
              fill="currentColor"
            />
            <path
              d="M4 5.75A3.75 3.75 0 0 1 7.75 2h8.5A3.75 3.75 0 0 1 20 5.75V9.5h1.227a.75.75 0 0 1 0 1.5H20v8.75a1.75 1.75 0 0 1-1.75 1.75h-1.5A1.75 1.75 0 0 1 15 19.75V18.5H9v1.25a1.75 1.75 0 0 1-1.75 1.75h-1.5A1.75 1.75 0 0 1 4 19.75V11H2.75a.75.75 0 0 1 0-1.5H4V5.75ZM16.5 18.5v1.25c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25V18.5h-2Zm-11 0v1.25c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25V18.5h-2Zm2.25-15A2.25 2.25 0 0 0 5.5 5.75V12h13V5.75a2.25 2.25 0 0 0-2.25-2.25h-8.5ZM9 15a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm7 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
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
                  label: index === array.length - 1 ? 'Percent of rider population' : '',
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
        label="Rider educational attainment"
        legendBeforeTitle
        icon={
          <svg
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.75 5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z"
              fill="currentColor"
            />
            <path
              d="M4 5.75A3.75 3.75 0 0 1 7.75 2h8.5A3.75 3.75 0 0 1 20 5.75V9.5h1.227a.75.75 0 0 1 0 1.5H20v8.75a1.75 1.75 0 0 1-1.75 1.75h-1.5A1.75 1.75 0 0 1 15 19.75V18.5H9v1.25a1.75 1.75 0 0 1-1.75 1.75h-1.5A1.75 1.75 0 0 1 4 19.75V11H2.75a.75.75 0 0 1 0-1.5H4V5.75ZM16.5 18.5v1.25c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25V18.5h-2Zm-11 0v1.25c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25V18.5h-2Zm2.25-15A2.25 2.25 0 0 0 5.5 5.75V12h13V5.75a2.25 2.25 0 0 0-2.25-2.25h-8.5ZM9 15a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm7 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              fill="currentColor"
            />
          </svg>
        }
        if={shouldRender('edu')}
        onClick={handleClick('edu')}
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
                  label: index === array.length - 1 ? 'Percent of rider population' : '',
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
