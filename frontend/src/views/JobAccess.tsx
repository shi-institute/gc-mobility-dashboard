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
          // {
          //   name: 'Residential',
          //   children: [
          //     {
          //       name: 'Single Family',
          //       value: subtype_counts?.single_family || 0,
          //     },
          //     {
          //       name: 'Multi Family',
          //       value: subtype_counts?.multi_family || 0,
          //     },
          //   ],
          // },
          {
            name: 'Other',
            value: type_counts?.other || 0,
          },
          // {
          //   name: 'Open Space',
          //   value: type_counts?.open_space || 0,
          // },
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

  return jobDataByArea.map((area) => {
    return (
      <Section key={area.name} title={area.name}>
        <TreeMap data={area} />
      </Section>
    );
  });
}
