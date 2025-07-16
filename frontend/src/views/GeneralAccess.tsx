import '@arcgis/map-components/dist/components/arcgis-map';
import { useMemo } from 'react';
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
import { type GeoJSONLayerInit } from '../components/common/Map/types';
import { AppNavigation } from '../components/navigation';
import {
  ComparisonModeSwitch,
  SelectedArea,
  SelectedComparisonAreas,
  SelectedComparisonSeasons,
  SelectedSeason,
  SelectTravelMethod,
  useComparisonModeState,
} from '../components/options';
import { useAppData } from '../hooks';
import { notEmpty } from '../utils';
import { createInterestAreaRenderer, createScaledSegmentsRenderer } from '../utils/renderers';

export function GeneralAccess() {
  const { data } = useAppData();

  const networkSegments = useMemo(() => {
    return (data || [])
      .map(({ network_segments }) => network_segments)
      .filter(notEmpty)
      .map((segments) => {
        return {
          title: `Network Segments`,
          data: segments,
          renderer: createScaledSegmentsRenderer(),
        } satisfies GeoJSONLayerInit;
      });
  }, [data]);

  const areaPolygons = useMemo(() => {
    return (data || [])
      .map(({ polygon }) => polygon)
      .filter(notEmpty)
      .map((polygon) => {
        return {
          title: `Area Polygon`,
          data: polygon,
          renderer: createInterestAreaRenderer(),
        } satisfies GeoJSONLayerInit;
      });
  }, [data]);

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      header={<AppNavigation />}
      sidebar={<Sidebar />}
      map={
        <div style={{ height: '100%' }}>
          <Map layers={[...networkSegments, ...areaPolygons]} />
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
      <Statistic.Number wrap label="Miles of service"></Statistic.Number>
      <Statistic.Number wrap label="Number of stops"></Statistic.Number>
      <Statistic.Number wrap label="Local funding per capita"></Statistic.Number>
      <Statistic.Number wrap label="Boardings"></Statistic.Number>
      <Statistic.Number wrap label="Alightings"></Statistic.Number>
      <Statistic.Number wrap label="Service coverage (area)"></Statistic.Number>
      <Statistic.Number
        wrap
        label="Service coverage (estimated households covered)"
      ></Statistic.Number>
    </Section>,
    <Section title="Area Demographics">
      <Statistic.Number wrap label="Population total">
        {data?.map((area) => area.population_total?.[0].population__total || 0)?.[0]?.toString()}
      </Statistic.Number>
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
      <SectionEntry>
        <div>
          <div>Population by race and ethnicity</div>
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
      <Statistic.Percent wrap label="Trips using public transit">
        {
          data?.map((area) => {
            const publicTransitTrips =
              area.statistics?.thursday_trip.methods.commute.public_transit || 0;
            const allTrips = Object.values(
              area.statistics?.thursday_trip.methods.commute || {}
            ).reduce((sum, value) => sum + (value || 0), 0);
            return (publicTransitTrips / allTrips).toFixed(2);
          })?.[0]
        }
      </Statistic.Percent>
      <Statistic.Number wrap label="Trips that could use public transit">
        {
          data?.map((area) => {
            const possibleConversions =
              area.statistics?.thursday_trip.possible_conversions.via_walk || 0;
            const allTrips = Object.values(
              area.statistics?.thursday_trip.methods.commute || {}
            ).reduce((sum, value) => sum + (value || 0), 0);
            return (possibleConversions / allTrips).toFixed(2);
          })?.[0]
        }
      </Statistic.Number>
      <Statistic.Percent wrap label="Households without a vehicle (ACS)"></Statistic.Percent>
      <Statistic.Number wrap label="Median commute time (all modes)">
        {
          data?.map((area) => {
            const medianDuration = area.statistics?.thursday_trip.median_duration.commute || 0;
            return medianDuration.toFixed(2);
          })?.[0]
        }
      </Statistic.Number>
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
  const [isComparisonEnabled] = useComparisonModeState();

  return (
    <SidebarContent>
      <h1>Options</h1>

      <h2>Filters</h2>
      <SelectedArea areasList={areasList} />
      <SelectedSeason seasonsList={seasonsList} />

      <h2>Compare</h2>
      <ComparisonModeSwitch />
      {isComparisonEnabled ? (
        <>
          <SelectedComparisonAreas areasList={areasList} />
          <SelectedComparisonSeasons seasonsList={seasonsList} />
        </>
      ) : null}

      <h2>Work and school</h2>
      <SelectTravelMethod travelMethodList={travelMethodList} />
    </SidebarContent>
  );
}
