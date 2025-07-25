/**
 * TreeMap Layout Handler - Renders job access data with responsive grid/flex layouts
 * Input: jobDataByArea array with area data
 * Output: Grid layout (3+ areas) or flex layout (1-2 areas) with shared header
 */
import { CoreFrame, Section, TreeMap } from '../components';
import { AppNavigation } from '../components/navigation';
import { useAppData } from '../hooks';
import { notEmpty } from '../utils';

export function JobAccess() {
  return (
    <CoreFrame outerStyle={{ height: '100%' }} header={<AppNavigation />} sections={Sections()} />
  );
}

function Sections() {
  const { data } = useAppData();

  const jobDataByArea = (data || [])
    .map(({ __area, __quarter, __year, statistics }) => {
      return [
        { __area, __quarter, __year },
        statistics?.thursday_trip.destination_building_use?.via_walk,
      ] as const;
    })
    .filter((x): x is [(typeof x)[0], NonNullable<(typeof x)[1]>] => notEmpty(x[1]))
    .map(([{ __area, __quarter, __year }, { type_counts, subtype_counts }]) => {
      return {
        name: `${__area} - ${__year} ${__quarter}`,
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

  const safeName = (name: unknown): string => {
    if (typeof name === 'string' && name.trim()) {
      return name.replace(/<[^>]*>/g, '').slice(0, 100);
    }
    return `Area ${Date.now()}`;
  };

  const Header = ({ isCompact }: { isCompact?: boolean }) => (
    <div
      style={{
        textAlign: 'center',
        padding: isCompact ? '5px 0 2px 0' : '20px 0 10px 0',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: isCompact ? '8px' : '20px',
      }}
    >
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#7FBE40' }}>
        Job Access Statistics
      </h2>
      <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#2E393C' }}>
        The tree maps below visualize the daily average number of people, in the selected quarter
        and region, who use various transport modes to reach jobs across different sectors.
      </p>
    </div>
  );

  if (!Array.isArray(jobDataByArea) || jobDataByArea.length === 0) {
    return [
      <Section key="job-access-empty" title="">
        <Header isCompact={true} />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>No data available for the selected filters</p>
        </div>
      </Section>,
    ];
  }
  // If there are more than 2 areas, use a grid layout
  if (jobDataByArea.length > 2) {
    return [
      <div key="treemap-container" style={{ padding: '0 20px' }}>
        <Header isCompact={false} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'auto auto',
            gap: '20px',
            minHeight: '100vh',
            width: '100%',
          }}
        >
          {jobDataByArea.slice(0, 8).map((area, index) => {
            const areaName = safeName(area?.name);
            return (
              <div
                key={`${areaName}-${index}`}
                style={{ minHeight: '400px', marginTop: index >= 2 ? '60px' : '0px' }}
              >
                <h3 style={{ marginBottom: '3px', fontSize: '14px', fontWeight: 'bold' }}>
                  {areaName}
                </h3>
                {area ? (
                  <TreeMap data={area} />
                ) : (
                  <div
                    style={{
                      height: '400px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                    }}
                  >
                    No data available
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>,
    ];
  }
  // If there are 1 or 2 areas, use a flex layout
  return [
    <Section key="job-access-with-header" title="">
      <div key="header-and-treemaps" style={{ width: '100%' }}>
        <Header isCompact={true} />
        {jobDataByArea.length === 1 ? (
          <div style={{ width: '100%' }}>
            <h3
              style={{
                marginBottom: '2px',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {safeName(jobDataByArea[0]?.name)}
            </h3>
            <div style={{ width: '800px', height: '500px' }}>
              {jobDataByArea[0] ? (
                <TreeMap data={jobDataByArea[0]} />
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                  }}
                >
                  No data available
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
            {jobDataByArea.slice(0, 4).map((area, index) => {
              const areaName = safeName(area?.name);
              return (
                <div
                  key={`${areaName}-${index}`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                  <h3
                    style={{
                      marginBottom: '2px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                    }}
                  >
                    {areaName}
                  </h3>
                  <div style={{ flex: 1 }}>
                    {area ? (
                      <TreeMap data={area} />
                    ) : (
                      <div
                        style={{
                          height: '400px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#666',
                        }}
                      >
                        No data available
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Section>,
  ];
}
