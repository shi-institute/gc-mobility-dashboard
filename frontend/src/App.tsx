import styled from '@emotion/styled';
import { useMemo } from 'react';
import { Route, Routes, useLocation, useSearchParams } from 'react-router';
import { CoreFrameContext, createCoreFrameContextValue } from './components';
import {
  COMPONENTS_ROUTE_FRAGMENT,
  TAB_2_FRAGMENT,
  TAB_3_FRAGMENT,
  TAB_4_FRAGMENT,
  TAB_5_FRAGMENT,
} from './components/navigation';
import { AppDataContext, AppDataHookParameters, createAppDataContext } from './hooks/useAppData';
import { notEmpty } from './utils';
import {
  DevModeComponentsAll,
  EssentialServicesAccess,
  FutureOpportunities,
  GeneralAccess,
  JobAccess,
  RoadsVsTransit,
} from './views';

export default function App() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();

  const comparisonEnabled = useMemo(() => {
    return searchParams.get('compare') === '1';
  }, [searchParams]);

  const areas = useMemo(() => {
    const areas =
      searchParams
        .get('areas')
        ?.split(',')
        .map((str) => str.trim()) ?? [];

    // only use the first area if comparison is not enabled
    return comparisonEnabled ? areas : areas.slice(0, 1);
  }, [searchParams, comparisonEnabled]);
  const seasons = useMemo(() => {
    const seasons = (searchParams.get('seasons')?.split(',') || [])
      .map((str) => {
        const parts = str
          .trim()
          .split(':')
          .map((v) => v.trim());

        if (parts.length !== 2) {
          console.warn(`Invalid season format: ${str}. Expected format is 'Q2:2020'`);
          return undefined;
        }

        return parts as [string, string];
      })
      .filter(notEmpty)
      .map(([quarter, year]) => [quarter, parseInt(year)] as const)
      .filter((v): v is ['Q2' | 'Q4', number] => {
        const quarter = v[0];
        const year = v[1];
        return ['Q2', 'Q4'].includes(quarter) && year >= 2019;
      }) satisfies Parameters<typeof createAppDataContext>['1'];

    // only use the first season if comparison is not enabled
    return comparisonEnabled ? seasons : seasons.slice(0, 1);
  }, [searchParams, comparisonEnabled]);

  const [jobAccessAreasOverride, jobAccessSeasonsOverride] = useMemo(() => {
    const jobAreas = searchParams.get('jobAreas')?.split(',').filter(notEmpty) || [];

    const regularAreas = Array.from(
      new Set(
        jobAreas
          .filter((jobArea) => !jobArea.toLowerCase().includes('future'))
          .map((jobArea) => jobArea.split('::')[0])
          .filter(notEmpty)
      )
    );

    const seasons = Array.from(
      new Set(
        jobAreas
          .filter((jobArea) => !jobArea.toLowerCase().includes('future'))
          .map((jobArea) => jobArea.split('::')[1])
          .filter(notEmpty)
      )
    )
      .map((str) => {
        const parts = str
          .trim()
          .split(':')
          .map((v) => v.trim());

        if (parts.length !== 2) {
          console.warn(`Invalid season format: ${str}. Expected format is 'Q2:2020'`);
          return undefined;
        }

        return parts as [string, string];
      })
      .filter(notEmpty)
      .map(([quarter, year]) => [quarter, parseInt(year)] as const)
      .filter((v): v is ['Q2' | 'Q4', number] => {
        const quarter = v[0];
        const year = v[1];
        return ['Q2', 'Q4'].includes(quarter) && year >= 2019;
      }) satisfies Parameters<typeof createAppDataContext>['1'];

    const futures = jobAreas
      .filter((jobArea) => jobArea.toLowerCase().includes('future'))
      .map((value) => value.split('::')[0])
      .filter(notEmpty);

    return [regularAreas, seasons, futures] as const;
  }, [searchParams]);

  const roadsVsTransitSeasonsOverride: (typeof seasons)[number][] = useMemo(() => {
    return [['Q4', 2024]];
  }, []);

  const travelMethod = useMemo(() => {
    const found = searchParams.get('travelMethod') ?? undefined;

    const validMethods = [
      'biking',
      'carpool',
      'commercial',
      'on_demand_auto',
      'other_travel_mode',
      'private_auto',
      'public_transit',
      'walking',
    ];

    if (!found) {
      return undefined;
    }

    if (!validMethods.includes(found)) {
      console.warn(
        `Invalid travel method: ${found}. Valid methods are: ${validMethods.join(', ')}`
      );
      return undefined;
    }

    return found as AppDataHookParameters['travelMethod'];
  }, [searchParams]);

  const isOnJobAccessPage = pathname === TAB_3_FRAGMENT;
  const isOnRoadsVsTransitPage = pathname === TAB_5_FRAGMENT;

  const resolvedAreas = isOnJobAccessPage ? jobAccessAreasOverride : areas;
  const resolvedSeasons = isOnJobAccessPage
    ? jobAccessSeasonsOverride
    : isOnRoadsVsTransitPage
    ? roadsVsTransitSeasonsOverride
    : seasons;

  return (
    <AppWrapper>
      <AppDataContext.Provider
        value={createAppDataContext(resolvedAreas, resolvedSeasons, travelMethod)}
      >
        <CoreFrameContext.Provider value={createCoreFrameContextValue()}>
          {import.meta.env.DEV ? <PlaceholderGreenvilleConnectsWebsiteHeader /> : null}

          <Routes>
            <Route index Component={GeneralAccess} />
            <Route path={TAB_2_FRAGMENT} Component={FutureOpportunities} />
            <Route path={TAB_3_FRAGMENT} Component={JobAccess} />
            <Route path={TAB_4_FRAGMENT} Component={EssentialServicesAccess} />
            <Route path={TAB_5_FRAGMENT} Component={RoadsVsTransit} />

            {import.meta.env.DEV ? (
              <Route path={COMPONENTS_ROUTE_FRAGMENT} element={<DevModeComponentsAll />} />
            ) : null}
          </Routes>
        </CoreFrameContext.Provider>
      </AppDataContext.Provider>
    </AppWrapper>
  );
}

const AppWrapper = styled.div`
  display: flex;
  flex-direction: column;
  inline-size: 100%;
  block-size: 100%;
  overflow: hidden;
  box-sizing: border-box;

  max-height: 100vh;
  overflow: auto;

  > div:last-of-type {
    flex-grow: 1;
  }
`;

const PlaceholderGreenvilleConnectsWebsiteHeader = styled.div`
  block-size: 4rem;
  inline-size: 100%;
  background-color: var(--color-green2);
  flex-grow: 0;
  flex-shrink: 0;
`;
