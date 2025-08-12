import styled from '@emotion/styled';
import * as d3 from 'd3';
import { CoreFrame, Section, SidebarContent, TreeMap } from '../components';
import { AppNavigation } from '../components/navigation';
import { ComparisonModeSwitch, SelectedArea, SelectedSeason } from '../components/options';
import { useAppData } from '../hooks';
import { notEmpty } from '../utils';

export function JobAccess() {
  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      sectionsStyle={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(300px, 100%, 600px), 1fr))',
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
  const { jobDataByArea, domain, colorScheme } = useJobData();

  return [
    ...jobDataByArea.map((areaData) => {
      return (
        <Section title={areaData.name} noGrid flexParent>
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
  const { data } = useAppData();

  const jobDataByArea = (data || [])
    .map(({ __area, __quarter, __year, __label, statistics }) => {
      return [
        { __area, __quarter, __year, __label },
        statistics?.thursday_trip.destination_building_use?.via_walk,
      ] as const;
    })
    .filter((x): x is [(typeof x)[0], NonNullable<(typeof x)[1]>] => notEmpty(x[1]))
    .map(([{ __label }, { type_counts, subtype_counts }]) => {
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
    });

  const domain =
    jobDataByArea[0]?.children.map((d) => d.name).sort((a, b) => a.localeCompare(b)) || [];
  const colorScheme = [
    ...d3.schemeObservable10.slice(0, 6).toReversed(),
    ...d3.schemeObservable10.slice(6),
  ];

  return { jobDataByArea, domain, colorScheme };
}

interface HeaderProps {}

function Header(props: HeaderProps) {
  const { domain, colorScheme } = useJobData();

  return (
    <HeaderComponent {...props}>
      <h2>Job Access Summaries</h2>
      <p>
        The tree maps below visualize the daily average number of people who use any transport modes
        to reach their jobs, grouped by job sector.
      </p>
      <div className="swatches">
        {domain.map((name, index) => {
          const color = colorScheme[index % colorScheme.length];

          return (
            <div className="swatch">
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

const HeaderComponent = styled.div<HeaderProps>`
  text-align: center;
  padding: 0.5rem 0 1.5rem 0;
  border-bottom: 1px solid lightgray;

  /* span the entire grid width */
  grid-column: 1 / -1;

  h2 {
    margin: 0;
    color: var(--color-green1);
  }

  p {
    margin: 0.5rem 0;
    font-size: 14px;
    color: var(--text-primary);
  }

  .swatches {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0rem 0.5rem;
    margin-top: 0.5rem;
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
  const { areasList, seasonsList } = useAppData();

  return (
    <SidebarContent>
      <h1>Options</h1>

      <h2>Filters</h2>
      <SelectedArea areasList={areasList} />
      <SelectedSeason seasonsList={seasonsList} />

      <h2>Compare</h2>
      <ComparisonModeSwitch />
    </SidebarContent>
  );
}
