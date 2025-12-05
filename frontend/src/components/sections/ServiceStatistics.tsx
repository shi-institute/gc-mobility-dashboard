import { useLocation } from 'react-router';
import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility, useToggleSectionItemVisibility } from '../../hooks';
import { notEmpty, shouldRenderStatistic } from '../../utils';
import { Button, Section, SectionEntry, Statistic } from '../common';
import { StatisticContainer } from '../common/Statistic/StatisticContainer';
import { TAB_3_FRAGMENT } from '../navigation';

export function ServiceStatistics() {
  const { data } = useAppData();
  const { search } = useLocation();

  const ridershipDataExists = data?.some((area) => area.ridership) || false;

  const [visibleSections, , visibleTabs] = useSectionsVisibility();
  const { editMode, handleClick } = useToggleSectionItemVisibility('ServiceStatistics');
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds.ServiceStatistics,
    editMode
  );

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

  return (
    <Section title="Greenlink Service Statistics">
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
        if={shouldRender('mos')}
        onClick={handleClick('mos')}
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
        if={shouldRender('nostop')}
        onClick={handleClick('nostop')}
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
        if={shouldRender('lf')}
        onClick={handleClick('lf')}
      />
      {ridershipDataExists ? (
        <>
          <Statistic.Number
            wrap
            label="Boardings"
            description={(() => {
              if (data?.length === 1) {
                const year = data[0]?.__year;
                const quarter = data[0]?.__quarter;
                if (year && quarter) {
                  const season = `${quarter === 'Q2' ? 'January-June' : 'July-December'} ${year}`;
                  return `Passengers getting on a bus ${season}`;
                }
              }

              return 'Sum of passengers getting on a bus during the specified time period';
            })()}
            data={data?.map((area) => {
              const boardings = area.ridership?.area.map((stop) => stop.boarding) || [];
              const boardingsTotal = boardings.reduce((sum, value) => sum + (value || 0), 0);

              return {
                label: area.__label.replace('Q2', 'Jan-June').replace('Q4', 'July-Dec'),
                value: boardingsTotal,
              };
            })}
            if={shouldRender('on')}
            onClick={handleClick('on')}
          />
          <Statistic.Number
            wrap
            label="Alightings"
            description={(() => {
              if (data?.length === 1) {
                const year = data[0]?.__year;
                const quarter = data[0]?.__quarter;
                if (year && quarter) {
                  const season = `${quarter === 'Q2' ? 'January-June' : 'July-December'} ${year}`;
                  return `Passengers getting off a bus ${season}`;
                }
              }

              return 'Sum of passengers getting off a bus during the specified time period';
            })()}
            data={data?.map((area) => {
              const alightings = area.ridership?.area.map((stop) => stop.alighting) || [];
              const alightingsTotal = alightings.reduce((sum, value) => sum + (value || 0), 0);

              return {
                label: area.__label.replace('Q2', 'Jan-June').replace('Q4', 'July-Dec'),
                value: alightingsTotal,
              };
            })}
            if={shouldRender('off')}
            onClick={handleClick('off')}
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
        if={shouldRender('servsqmi')}
        onClick={handleClick('servsqmi')}
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
        if={shouldRender('hhacc')}
        onClick={handleClick('hhacc')}
      />
      {shouldRender('jadl') && (!visibleTabs || visibleTabs.includes(TAB_3_FRAGMENT)) ? (
        <SectionEntry f={{ gridColumn: 'span 2' }}>
          <StatisticContainer
            onClick={handleClick('jadl')}
            style={{ opacity: shouldRender('jadl') === 'partial' ? 0.5 : 1 }}
          >
            <div>
              <div style={{ fontSize: '0.875rem' }}>
                What jobs could be served by transit in this area if it had full coverage?
              </div>
              <Button href={'#/job-access' + jobAccessSearch}>
                Explore industry/sector of employment
              </Button>
            </div>
          </StatisticContainer>
        </SectionEntry>
      ) : null}
    </Section>
  );
}
