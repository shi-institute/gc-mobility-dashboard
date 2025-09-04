import { useSearchParams } from 'react-router';
import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility, useToggleSectionItemVisibility } from '../../hooks';
import { notEmpty, shouldRenderStatistic } from '../../utils';
import { Section, Statistic } from '../common';
import { useComparisonModeState } from '../options';

export function Coverage() {
  const { scenarios } = useAppData();
  const { data: scenariosData } = scenarios;

  const [isComparing] = useComparisonModeState();
  const [searchParams] = useSearchParams();
  const selectedRouteIds = (searchParams.get('futures')?.split(',').filter(notEmpty) || []).slice(
    0,
    isComparing ? undefined : 1
  );
  const futures = (scenariosData?.futureRoutes || []).filter((future) =>
    selectedRouteIds.includes(future.__routeId)
  );

  const [visibleSections] = useSectionsVisibility();
  const { editMode, handleClick } = useToggleSectionItemVisibility('Future.Coverage');
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds['Future.Coverage'],
    editMode
  );

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
    </Section>
  );
}
