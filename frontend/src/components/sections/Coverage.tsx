import { useLocation, useSearchParams } from 'react-router';
import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility, useToggleSectionItemVisibility } from '../../hooks';
import { notEmpty, shouldRenderStatistic } from '../../utils';
import { Button, Section, SectionEntry, Statistic } from '../common';
import { StatisticContainer } from '../common/Statistic/StatisticContainer';
import { TAB_3_FRAGMENT } from '../navigation';
import { useComparisonModeState } from '../options';

export function Coverage() {
  const { scenarios } = useAppData();
  const { data: scenariosData } = scenarios;
  const { search } = useLocation();

  const [isComparing] = useComparisonModeState();
  const [searchParams] = useSearchParams();
  const selectedRouteIds = (searchParams.get('futures')?.split(',').filter(notEmpty) || []).slice(
    0,
    isComparing ? undefined : 1
  );
  const futures = (scenariosData?.futureRoutes || []).filter((future) =>
    selectedRouteIds.includes(future.__routeId)
  );

  const [visibleSections, , visibleTabs] = useSectionsVisibility();
  const { editMode, handleClick } = useToggleSectionItemVisibility('Future.Coverage');
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds['Future.Coverage'],
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
    <Section title="Coverage">
      <Statistic.Number
        wrap
        label="Route length"
        if={shouldRender('l')}
        data={futures.map(({ stats, __routeId }) => {
          const meters_distance = stats?.route_distance_meters || 0;
          const miles_distance = meters_distance / 1609.344; // convert meters to miles

          return {
            label: __routeId,
            value: miles_distance.toFixed(2),
          };
        })}
        unit="miles"
        onClick={handleClick('l')}
      />
      <Statistic.Number
        wrap
        label="Route stops"
        if={shouldRender('st')}
        data={futures.map(({ stats, __routeId }) => {
          return {
            label: __routeId,
            value: stats?.stops_count ?? NaN,
          };
        })}
        onClick={handleClick('st')}
      />
      <Statistic.Number
        wrap
        label="Service coverage"
        if={shouldRender('cov')}
        data={futures.map(({ stats, __routeId }) => {
          const meters_area = stats?.walk_service_area_area_square_meters || 0;
          const miles_area = meters_area / 1609.344 / 1609.344; // convert square meters to square miles

          return {
            label: __routeId,
            value: miles_area.toFixed(2),
          };
        })}
        unit="square miles"
        onClick={handleClick('cov')}
      />
      {shouldRender('jadl') && (!visibleTabs || visibleTabs.includes(TAB_3_FRAGMENT)) ? (
        <SectionEntry f={{ gridColumn: 'span 2' }}>
          <StatisticContainer
            onClick={handleClick('jadl')}
            style={{ opacity: shouldRender('jadl') === 'partial' ? 0.5 : 1 }}
          >
            <div>
              <div style={{ fontSize: '0.875rem' }}>
                What sectors could be served by this new route?
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
