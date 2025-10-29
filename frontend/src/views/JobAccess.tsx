import styled from '@emotion/styled';
import * as d3 from 'd3';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import {
  Button,
  CoreFrame,
  IconButton,
  manualSectionIds,
  PageHeader,
  renderManualSection,
  renderSections,
  Section,
  SidebarContent,
  TreeMap,
} from '../components';
import { DismissIcon } from '../components/common/IconButton/DismssIcon';
import { TreeMapEntry } from '../components/common/TreeMap/TreeMap';
import { AppNavigation } from '../components/navigation';
import { SelectedJobAccessArea } from '../components/options';
import { useAppData, useLocalStorage, useSectionsVisibility } from '../hooks';
import { notEmpty } from '../utils';

export function JobAccess() {
  const { loading, scenarios } = useAppData();

  // if no areas or seasons are selected, use the ones from tab 1
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (!searchParams.get('jobAreas')) {
      const areas = searchParams.get('areas');
      const seasons = searchParams.get('seasons');
      if (areas && seasons) {
        const jobAreas = areas
          .split(',')
          .filter(notEmpty)
          .flatMap((area) =>
            seasons
              .split(',')
              .filter(notEmpty)
              .map((season) => `${area}::${season}`)
          );
        if (jobAreas.length > 0) {
          searchParams.set('jobAreas', jobAreas.join(','));
          setTimeout(() => {
            setSearchParams(searchParams, { replace: true });
          }, 0);
        }
      }
    }
  }, [searchParams, setSearchParams]);

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      loading={loading || scenarios.loading}
      sectionsStyle={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(300px, 100%, 600px), 1fr))',
        gap: '0.5rem 1rem',
        gridAutoRows: 'minmax(200px, 1fr)',
      }}
      header={<AppNavigation />}
      sectionsHeader={<Header />}
      sections={Sections()}
      sidebar={<Sidebar />}
    />
  );
}

function Sections() {
  const [visibleSections, setVisibleSections] = useSectionsVisibility();
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === 'true';

  const { jobDataByArea, domain, colorScheme } = useJobData();

  const render = renderManualSection.bind(null, visibleSections, 'jobsTreeMap');

  return renderSections([
    (() => {
      if (!editMode) {
        return null;
      }

      if (visibleSections?.[manualSectionIds.jobsTreeMap]) {
        return (
          <Button
            onClick={() => {
              setVisibleSections((prev) => {
                const newVisibleSections = { ...prev };
                delete newVisibleSections[manualSectionIds.jobsTreeMap];
                return newVisibleSections;
              });
            }}
          >
            Hide this tab
          </Button>
        );
      }

      return (
        <Button
          onClick={() => {
            setVisibleSections((prev) => ({
              ...prev,
              [manualSectionIds.jobsTreeMap]: [''],
            }));
          }}
        >
          Show this tab
        </Button>
      );
    })(),
    ...jobDataByArea.map((areaData, index) => {
      const sum = (function calculateSum(node: TreeMapEntry): number {
        if ('value' in node && typeof node.value === 'number') {
          return node.value;
        }
        if ('children' in node && Array.isArray(node.children)) {
          return node.children.reduce((acc, child) => acc + calculateSum(child), 0);
        }
        return 0;
      })(areaData);

      return render(
        <Section
          title={areaData.name}
          description={`${sum} sampled commutes`}
          noGrid
          flexParent
          key={index}
        >
          <TreeMap
            data={areaData}
            style={{ flexGrow: 1, flexShrink: 1 }}
            domain={domain}
            colorScheme={colorScheme}
          />
        </Section>
      );
    }),
  ]);
}

function useJobData() {
  const { data, loading, errors, scenarios } = useAppData();

  const [searchParams] = useSearchParams();
  const selectedRouteIds = (searchParams.get('jobAreas')?.split(',').filter(notEmpty) || [])
    .filter((jobArea) => jobArea.toLowerCase().includes('future'))
    .map((value) => value.split('::')[0])
    .filter(notEmpty);
  const futures = (scenarios.data?.futureRoutes || []).filter((future) =>
    selectedRouteIds.includes(future.__routeId)
  );

  function toJobData(
    data: [
      { __label: string },
      {
        type_counts: ReplicaDesinationUseTypeStatistics;
        subtype_counts: ReplicaDesinationUseSubTypeStatistics;
      }
    ]
  ) {
    const [{ __label }, { type_counts, subtype_counts }] = data;

    return {
      name: __label,
      children: [
        {
          name: 'Transportation Utilities',
          value: type_counts?.transportation_utilities || 0,
        },
        {
          name: 'Other',
          value: type_counts?.other || 0,
        },
        {
          name: 'Industrial',
          value: type_counts?.industrial || 0,
        },
        {
          name: 'Commercial',
          children: [
            {
              name: 'Retail',
              value: subtype_counts?.retail || 0,
            },
            {
              name: 'Office',
              value: subtype_counts?.office || 0,
            },
            {
              name: 'Non-Retail Attraction',
              value: subtype_counts?.non_retail_attraction || 0,
            },
          ],
        },
        {
          name: 'Civic Institutional',
          children: [
            {
              name: 'Other Civic Institutional',
              value: subtype_counts?.civic_institutional || 0,
            },
            {
              name: 'Education',
              value: subtype_counts?.education || 0,
            },
            {
              name: 'Healthcare',
              value: subtype_counts?.healthcare || 0,
            },
          ],
        },
        {
          name: 'Agriculture',
          value: type_counts?.agriculture || 0,
        },
      ] as TreeMapEntry[],
    };
  }

  const jobAreas = searchParams.get('jobAreas')?.split(',').filter(notEmpty) || [];
  const regularSeasonAreas = Array.from(
    new Set(
      jobAreas
        .filter((jobArea) => !jobArea.toLowerCase().includes('future'))
        .map((area) => area.split('::'))
        .filter((parts): parts is [string, string] => parts.length === 2)
        .map(([area, season]) => [area, ...season.split(':')])
        .filter((parts): parts is [string, string, string] => parts.length === 3)
    )
  );
  const jobDataByArea = (data || [])
    .filter(({ __area, __quarter, __year }) => {
      // check if this area and season is in the selected regularSeasonAreas
      return regularSeasonAreas.some(([area, season, year]) => {
        return __area === area && __quarter === season && __year === parseInt(year);
      });
    })
    .map(({ __area, __quarter, __year, __label, statistics }) => {
      return [
        { __area, __quarter, __year, __label },
        statistics?.thursday_trip.destination_building_use__by_tour_type?.commute?.via_walk,
      ] as const;
    })
    .filter((x): x is [(typeof x)[0], NonNullable<(typeof x)[1]>] => notEmpty(x[1]))
    .map(toJobData);

  const futureJobDataByArea = futures
    .map(({ __label, stats }) => {
      const viaWalk = stats?.destination_building_use__by_tour_type?.commute?.via_walk;
      if (!viaWalk) {
        return null;
      }

      return [{ __label }, viaWalk] as [
        { __label: string },
        ReplicaDestinationUseTypeStatisticsVia['via_walk']
      ];
    })
    .filter(notEmpty)
    .map(toJobData);

  const combinedJobData = [...jobDataByArea, ...futureJobDataByArea];

  const domain =
    combinedJobData[0]?.children.map((d) => d.name).sort((a, b) => a.localeCompare(b)) || [];
  const colorScheme = [
    ...d3.schemeObservable10.slice(0, 6).toReversed(),
    ...d3.schemeObservable10.slice(6),
  ];

  return {
    jobDataByArea: combinedJobData,
    domain,
    colorScheme,
    loading: loading || scenarios.loading,
    errors: errors || scenarios.errors,
  };
}

interface HeaderProps {}

function Header(props: HeaderProps) {
  const { domain, colorScheme } = useJobData();

  const [showAside, setShowAside] = useLocalStorage('aside--tab-3', true);

  return (
    <HeaderComponent {...props}>
      <h2>How can transit help the economy?</h2>
      <p>
        These tree maps visualize the sampled* daily average number of people who use any transport
        mode to reach their job in the selected area(s), grouped by job sector.
        {showAside ? null : (
          <>
            {' '}
            <button className="showAside" onClick={() => setShowAside(true)}>
              More info
            </button>
          </>
        )}
      </p>
      <div className="swatches">
        {domain.map((name, index) => {
          const color = colorScheme[index % colorScheme.length];

          return (
            <div className="swatch" key={name}>
              <svg width={16} height={16}>
                <rect width={16} height={16} rx={3} ry={3} fill={color} />
              </svg>
              <span>{name}</span>
            </div>
          );
        })}
      </div>
      {showAside ? (
        <aside>
          <h1>About this tab</h1>
          <IconButton onClick={() => setShowAside(false)}>
            <DismissIcon size={16} />
          </IconButton>
          <p>
            Employment is among the most crucial benefits of transit. More buses, more places, more
            often means more access to jobs and economic mobility.
          </p>
          <p>
            See the industries that create the most jobs in each area. You’ll see we aren’t lacking
            for jobs, but we are lacking for reliable transportation to those jobs.
          </p>
          <p className="footnote">
            *Sample data are from <a href="https://www.replicahq.com/">Replica</a>. Sample
            population is less than full population, but it is a representative sample that
            preserves proportions.
          </p>
        </aside>
      ) : null}
    </HeaderComponent>
  );
}

const HeaderComponent = styled(PageHeader)<HeaderProps>`
  .swatches {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0rem 0.5rem;
    margin: 0.5rem 0.5rem 1rem;
  }

  .swatch {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: var(--text-primary);
  }
`;

function Sidebar() {
  const { areasList, seasonsList, scenarios } = useAppData();
  const futureRouteIds = (scenarios.data?.futureRoutes || []).map((future) => future.__routeId);

  const jobAccessAreasList = [
    areasList.flatMap((area) => {
      return seasonsList.map((season) => `${area}::${season}`);
    }),
    futureRouteIds.map((futureRouteId) => `${futureRouteId}::future`),
  ].flat();

  return (
    <SidebarContent>
      <h1>Options</h1>

      <h2>Filters</h2>
      <SelectedJobAccessArea areasList={jobAccessAreasList} forceCompare />
    </SidebarContent>
  );
}
