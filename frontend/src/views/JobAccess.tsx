import styled from '@emotion/styled';
import { CoreFrame, Section, TreeMap } from '../components';
import { AppNavigation } from '../components/navigation';
import { useAppData } from '../hooks';
import { notEmpty } from '../utils';

export function JobAccess() {
  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      sectionsStyle={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
        gridAutoRows: 'minmax(200px, 1fr)',
      }}
      header={<AppNavigation />}
      sectionsHeader={<Header />}
      sections={Sections()}
    />
  );
}

function Sections() {
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

  if (!Array.isArray(jobDataByArea) || jobDataByArea.length === 0) {
    return [
      <div style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No data available for the selected filters</p>
      </div>,
    ];
  }

  return [
    ...jobDataByArea.map((areaData) => {
      return (
        <Section title={areaData.name} noGrid flexParent>
          <TreeMap data={areaData} style={{ flexGrow: 1, flexShrink: 1 }} />
        </Section>
      );
    }),
  ];
}

interface HeaderProps {}

function Header(props: HeaderProps) {
  return (
    <HeaderComponent {...props}>
      <h2>Job Access Statistics</h2>
      <p>
        The tree maps below visualize the daily average number of people, in the selected quarter
        and region, who use various transport modes to reach jobs across different sectors.
      </p>
    </HeaderComponent>
  );
}

const HeaderComponent = styled.div<HeaderProps>`
  text-align: center;
  padding: 0.5rem 0 1.5rem 0;
  border-bottom: 1px solid #e5e5e5;

  /* span the entire grid width */
  grid-column: 1 / -1;

  h2 {
    margin: 0;
    color: var(--color-green1);
  }

  p {
    margin: 8px 0 0;
    font-size: 14px;
    color: var(--text-primary);
  }
`;
