import '@arcgis/map-components/dist/components/arcgis-map';
import { useLocation } from 'react-router';
import {
  Button,
  CoreFrame,
  DeveloperDetails,
  Map,
  Section,
  SectionEntry,
  SidebarContent,
  Statistic,
} from '../components';
import { AppNavigation } from '../components/navigation';
import {
  ComparisonModeSwitch,
  SelectedArea,
  SelectedSeason,
  SelectTravelMethod,
} from '../components/options';
import { useAppData, useMapData } from '../hooks';
import { notEmpty } from '../utils';

export function GeneralAccess() {
  const { data } = useAppData();
  const {
    networkSegments,
    areaPolygons,
    routes,
    stops,
    walkServiceAreas,
    cyclingServiceAreas,
    paratransitServiceAreas,
  } = useMapData(data);

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      header={<AppNavigation />}
      sidebar={<Sidebar />}
      map={
        <div style={{ height: '100%' }}>
          <Map
            layers={[
              ...networkSegments,
              paratransitServiceAreas,
              cyclingServiceAreas,
              walkServiceAreas,
              routes,
              stops,
              ...areaPolygons,
            ]}
          />
        </div>
      }
      sections={Sections()}
    />
  );
}

function Sections() {
  const { data, loading, errors, travelMethodList } = useAppData();
  const { search } = useLocation();

  if (loading) {
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
    <DeveloperDetails data={data} />,
    <Section title="Service Statistics">
      <Statistic.Number wrap label="Miles of service" data={[]} />
      <Statistic.Number wrap label="Number of stops" data={[]} />
      <Statistic.Number wrap label="Local funding per capita" data={[]} />
      <Statistic.Number wrap label="Boardings" data={[]} />
      <Statistic.Number wrap label="Alightings" data={[]} />
      <Statistic.Number wrap label="Service coverage (area)" data={[]} />
      <Statistic.Number wrap label="Service coverage (estimated households covered)" data={[]} />
    </Section>,
    <Section title="Area Demographics">
      <Statistic.Number
        wrap
        label="Population total"
        data={data?.map((area) => ({
          label: area.__label,
          value: area.population_total?.[0].population__total || 0,
        }))}
      />
      <SectionEntry>
        <div>
          <div>Population by race and ethnicity</div>
          <pre>
            {JSON.stringify(
              data?.map((area) => area.race_ethnicity?.[0]).filter(notEmpty) || [],
              null,
              2
            )}
          </pre>
        </div>
      </SectionEntry>
      <SectionEntry>
        <div>
          <div>Educational attainment</div>
          <pre>
            {JSON.stringify(
              data?.map((area) => area.educational_attainment?.[0]).filter(notEmpty) || [],
              null,
              2
            )}
          </pre>
        </div>
      </SectionEntry>
    </Section>,
    <Section title="Rider Demographics">
      <SectionEntry
        s={{ gridColumn: '1 / 3' }}
        m={{ gridColumn: '1 / 4' }}
        l={{ gridColumn: '1 / 5' }}
      >
        <div>
          <div>Population by race and ethnicity</div>
          <Statistic.Figure
            options={(Plot, d3) => {
              const raceMap: Record<string, string> = {
                black_african_american: 'Black',
                white: 'White',
                asian: 'Asian',
                other_race_alone: 'Other',
                two_or_more_races: 'Two or more',
              };

              const plotData =
                data
                  ?.map((area) => ({
                    __label: area.__label,
                    ...(area.statistics?.synthetic_demographics.race || {}),
                    // ...(area.statistics?.synthetic_demographics.ethnicity || {}),
                  }))
                  .flatMap(({ __label, ...rest }) => {
                    const totalSyntheticPopulation =
                      Object.values(rest).reduce((sum, value) => sum + (value || 0), 0) || 0;

                    return Object.entries(rest).map(([key, value]) => ({
                      areaSeason: __label,
                      group: raceMap[key] || key,
                      syntheticPopulation: value,
                      fractionSyntheticPopulation: (value || 0) / totalSyntheticPopulation,
                    }));
                  })
                  .filter(notEmpty) || [];

              const raceDomain = Object.values(raceMap);

              console.log(plotData);

              // return null;
              return {
                color: {
                  legend: true,
                  domain: raceDomain,
                },
                fy: {
                  // hide area/season axis label
                  label: null,
                  // gap between each facet
                  padding: 0.3,
                },
                y: {
                  label: 'Race',
                  // hide the axis - the legend will suffice
                  axis: null,
                  domain: raceDomain,
                },
                x: {
                  label: 'Percent of race',
                  tickFormat: d3.format('.0%'),
                  domain: [0, 0.8],
                  grid: true,
                  tickSpacing: 50,
                },
                marginLeft: 0,
                marginTop: 20,
                marks: [
                  Plot.barX(plotData, {
                    x: 'fractionSyntheticPopulation',
                    y: 'group',
                    fy: 'areaSeason',
                    fill: 'group',
                    title: (d) => d.areaSeason,
                    sort: { x: 'y' },
                    strokeWidth: 20,
                  }),

                  // line at the start of the bars
                  Plot.ruleX([0]),

                  // bar labels
                  Plot.text(plotData, {
                    x: 'fractionSyntheticPopulation',
                    y: 'group',
                    fy: 'areaSeason',
                    text: (d) => {
                      const showPercent = d.fractionSyntheticPopulation > 0.05;

                      return showPercent
                        ? `${d3.format('.0%')(d.fractionSyntheticPopulation)}`
                        : '';
                    },
                    dx: -6,
                    textAnchor: 'end',
                    fill: 'white',
                    stroke: 'black',
                    strokeOpacity: 0.14,
                  }),

                  // place area/season labels at the top of each group of bars
                  Plot.text(
                    plotData.map((d) => d.areaSeason),
                    {
                      x: 0,
                      fy: (d) => d,
                      frameAnchor: 'top',
                      textAnchor: 'start',
                      text: (d) => d,
                      dy: -20,
                      dx: 0,
                      fontWeight: 400,
                      fontSize: 14,
                    }
                  ),
                ],
              };
            }}
          />
          <pre>
            {JSON.stringify(
              data
                ?.map((area) => ({
                  ...(area.statistics?.synthetic_demographics.race || {}),
                  ...(area.statistics?.synthetic_demographics.ethnicity || {}),
                }))
                .filter(notEmpty) || [],
              null,
              2
            )}
          </pre>
        </div>
      </SectionEntry>
      <SectionEntry>
        <div>
          <div>Educational attainment</div>
          <pre>
            {JSON.stringify(
              data
                ?.map((area) => area.statistics?.synthetic_demographics.education)
                .filter(notEmpty) || [],
              null,
              2
            )}
          </pre>
        </div>
      </SectionEntry>
    </Section>,
    <Section title="Work and School">
      <SectionEntry
        s={{ gridColumn: '1 / 3' }}
        m={{ gridColumn: '1 / 4' }}
        l={{ gridColumn: '1 / 5' }}
      >
        <div>
          <SelectTravelMethod travelMethodList={travelMethodList} />
        </div>
      </SectionEntry>
      <Statistic.Percent
        wrap
        label="Trips using public transit"
        data={data?.map((area) => {
          const publicTransitTrips =
            area.statistics?.thursday_trip.methods.commute.public_transit || 0;
          const allTrips = Object.values(
            area.statistics?.thursday_trip.methods.commute || {}
          ).reduce((sum, value) => sum + (value || 0), 0);

          return {
            label: area.__label,
            value: (publicTransitTrips / allTrips).toFixed(2),
          };
        })}
      />
      <Statistic.Percent
        wrap
        label="Trips that could use public transit"
        data={data?.map((area) => {
          const possibleConversions =
            area.statistics?.thursday_trip.possible_conversions.via_walk || 0;
          const allTrips = Object.values(
            area.statistics?.thursday_trip.methods.commute || {}
          ).reduce((sum, value) => sum + (value || 0), 0);

          return {
            label: area.__label,
            value: (possibleConversions / allTrips).toFixed(2),
          };
        })}
      />
      <Statistic.Percent wrap label="Households without a vehicle (ACS)" data={[]} />
      <Statistic.Number
        wrap
        label="Median commute time (all modes)"
        unit="minutes"
        data={data?.map((area) => {
          const medianDuration = area.statistics?.thursday_trip.median_duration.commute || 0;
          return { label: area.__label, value: medianDuration.toFixed(2) };
        })}
      />
      <SectionEntry
        s={{ gridColumn: '1 / 3' }}
        m={{ gridColumn: '1 / 4' }}
        l={{ gridColumn: '1 / 5' }}
      >
        <div>
          <Button href={'#/job-access' + search}>Explore industry/sector of employment</Button>
        </div>
      </SectionEntry>
    </Section>,
  ].filter(notEmpty);
}

function Sidebar() {
  const { areasList, seasonsList, travelMethodList } = useAppData();

  return (
    <SidebarContent>
      <h1>Options</h1>

      <h2>Filters</h2>
      <SelectedArea areasList={areasList} />
      <SelectedSeason seasonsList={seasonsList} />

      <h2>Compare</h2>
      <ComparisonModeSwitch />

      <h2>Work & School</h2>
      <SelectTravelMethod travelMethodList={travelMethodList} />
    </SidebarContent>
  );
}
