import '@arcgis/map-components/dist/components/arcgis-map';
import { useState } from 'react';
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
import { notEmpty, requireKey, toTidyNominal } from '../utils';

export function GeneralAccess() {
  const { data } = useAppData();
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const {
    networkSegments,
    areaPolygons,
    routes,
    stops,
    walkServiceAreas,
    cyclingServiceAreas,
    paratransitServiceAreas,
  } = useMapData(data, mapView);

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
            ].filter(notEmpty)}
            onMapReady={(_, view) => {
              setMapView(view);
            }}
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

  const ridershipDataExists = data?.some((area) => area.ridership) || false;

  const jobAccessSearch = (() => {
    const currentSearchParams = new URLSearchParams(search);

    const selectedAreas = currentSearchParams.get('areas')?.split(',').filter(notEmpty) || [];
    const selectedSeasons = currentSearchParams.get('seasons')?.split(',').filter(notEmpty) || [];

    const selectedSeasonAreas = selectedAreas.flatMap((area) => {
      return selectedSeasons.map((season) => `${area}::${season}`);
    });

    currentSearchParams.set('jobAreas', selectedSeasonAreas.join(','));
    return currentSearchParams.toString() ? `?${currentSearchParams.toString()}` : '';
  })();

  return [
    <DeveloperDetails data={data} />,
    <Section title="Service Statistics">
      <Statistic.Number
        wrap
        label="Miles of service"
        data={data?.map((area) => {
          const meters_distance = area.coverage?.routes_distance_meters || 0;
          const miles_distance = meters_distance / 1609.344; // convert meters to miles

          return {
            label: area.__label,
            value: miles_distance.toFixed(2),
          };
        })}
        unit="miles"
      />
      <Statistic.Number
        wrap
        label="Number of stops"
        data={data?.map((area) => {
          return {
            label: area.__label,
            value: area.coverage?.stops_count || NaN,
          };
        })}
      />
      <Statistic.Money
        wrap
        label="Local funding"
        perCapita
        data={data?.map((area) => {
          const localFunding =
            area.operating_funds?.find((fund) => fund.Source === 'Local Government')?.Value ?? NaN;
          const population = area.census_acs_5year__county_total_population || NaN;

          return {
            label: area.__label,
            value: localFunding / population,
          };
        })}
      />
      {ridershipDataExists ? (
        <>
          <Statistic.Number
            wrap
            label="Boardings"
            data={data?.map((area) => {
              const boardings = area.ridership?.map((stop) => stop.boarding) || [];
              const boardingsTotal = boardings.reduce((sum, value) => sum + (value || 0), 0);

              return {
                label: area.__label,
                value: boardingsTotal,
              };
            })}
          />
          <Statistic.Number
            wrap
            label="Alightings"
            data={data?.map((area) => {
              const alightings = area.ridership?.map((stop) => stop.alighting) || [];
              const alightingsTotal = alightings.reduce((sum, value) => sum + (value || 0), 0);

              return {
                label: area.__label,
                value: alightingsTotal,
              };
            })}
          />
        </>
      ) : null}
      <Statistic.Number
        wrap
        label="Service coverage"
        data={data?.map((area) => {
          const meters_area = area.coverage?.walk_service_area_area_square_meters || 0;
          const miles_area = meters_area / 1609.344 / 1609.344; // convert square meters to square miles

          return {
            label: area.__label,
            value: miles_area.toFixed(2),
          };
        })}
        unit="square miles"
      />
      <Statistic.Percent
        wrap
        label="Household access"
        data={data?.map((area) => {
          const area_households = area.statistics?.synthetic_demographics.households || 0;
          const area_households_covered =
            area.statistics?.synthetic_demographics.households_in_service_area?.walk || 0;

          return {
            label: area.__label,
            value: ((area_households_covered / area_households) * 100).toFixed(1),
          };
        })}
      />
    </Section>,
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
          />
        );
      })()}

      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Population by race"
        legendBeforeTitle
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
              };
            };
          })}
      />

      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Population by ethnicity"
        legendBeforeTitle
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
              };
            };
          })}
      />

      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Educational attainment"
        legendBeforeTitle
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
              };
            };
          })}
      />
    </Section>,

    <Section title="Rider Demographics">
      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Population by race"
        legendBeforeTitle
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
              };
            };
          })}
      />

      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Population by ethnicity"
        legendBeforeTitle
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
              };
            };
          })}
      />

      <Statistic.Figure
        wrap={{ f: { gridColumn: '1 / -1' } }}
        label="Educational attainment"
        legendBeforeTitle
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
              };
            };
          })}
      />
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
            value: ((publicTransitTrips / allTrips) * 100).toFixed(2),
          };
        })}
      />
      <Statistic.Percent
        wrap
        label="Trips that could use public transit"
        data={data?.map((area) => {
          const possibleConversions =
            area.statistics?.thursday_trip.possible_conversions.via_walk || 0;
          const allTrips = Object.values(area.statistics?.thursday_trip.methods.__all || {}).reduce(
            (sum, value) => sum + (value || 0),
            0
          );

          return {
            label: area.__label,
            value: ((possibleConversions / allTrips) * 100).toFixed(2),
          };
        })}
      />
      <Statistic.Percent
        wrap
        label="Households without a vehicle (ACS)"
        data={data?.map((area) => {
          const households =
            area.census_acs_5year
              ?.map((item) => item.households__total)
              .reduce((sum, value) => sum + (value || 0), 0) || NaN;
          const householdsNoVehicle =
            area.census_acs_5year
              ?.map((item) => item.households__no_vehicle)
              .reduce((sum, value) => sum + (value || 0), 0) || NaN;

          return {
            label: area.__label,
            value: ((householdsNoVehicle / households) * 100).toFixed(2),
          };
        })}
      />
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
          <Button href={'#/job-access' + jobAccessSearch}>
            Explore industry/sector of employment
          </Button>
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
