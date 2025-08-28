import styled from '@emotion/styled';
import * as d3 from 'd3';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { CoreFrame, PageHeader, Section, SidebarContent, TreeMap } from '../components';
import { AppNavigation } from '../components/navigation';
import { SelectedJobAccessArea } from '../components/options';
import { useAppData } from '../hooks';
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
          setSearchParams(searchParams, { replace: true });
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
  const { jobDataByArea, domain, colorScheme, loading, errors } = useJobData();

  if (loading && !jobDataByArea) {
    return [
      <div key="placeholder-loading">
        <p>Loading...</p>
      </div>,
    ];
  }

  if (errors) {
    return [
      <div key="placeholder-error">
        <p>Error: {errors.join(', ')}</p>
      </div>,
    ];
  }

  return [
    ...jobDataByArea.map((areaData, index) => {
      return (
        <Section title={areaData.name} noGrid flexParent key={index}>
          <TreeMap
            data={areaData}
            style={{ flexGrow: 1, flexShrink: 1 }}
            domain={domain}
            colorScheme={colorScheme}
          />
        </Section>
      );
    }),
  ];
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
      ],
    };
  }

  const jobDataByArea = (data || [])
    .map(({ __area, __quarter, __year, __label, statistics }) => {
      return [
        { __area, __quarter, __year, __label },
        statistics?.thursday_trip.destination_building_use?.via_walk,
      ] as const;
    })
    .filter((x): x is [(typeof x)[0], NonNullable<(typeof x)[1]>] => notEmpty(x[1]))
    .map(toJobData);

  const futureJobDataByArea = futures
    .map(({ __label, stats }) => {
      const viaWalk = stats?.destination_building_use?.via_walk;
      if (!viaWalk) {
        return null;
      }

      return [{ __label }, viaWalk] as [
        { __label: string },
        NonNullable<NonNullable<FutureRouteStatistics['destination_building_use']>['via_walk']>
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

  return (
    <HeaderComponent {...props}>
      <h2>What Jobs Are Here?</h2>
      <p>
        These tree maps visualize the daily average number of people who use any transport mode to
        reach their job in the selected area(s), grouped by job sector.
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
