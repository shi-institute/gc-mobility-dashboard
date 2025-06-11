import styled from '@emotion/styled';
import { useMemo } from 'react';
import { Route, Routes, useSearchParams } from 'react-router';
import { CoreFrameContext, createCoreFrameContextValue } from './components';
import {
  COMPONENTS_ROUTE_FRAGMENT,
  TAB_2_FRAGMENT,
  TAB_3_FRAGMENT,
  TAB_4_FRAGMENT,
  TAB_5_FRAGMENT,
} from './components/navigation';
import { AppDataContext, createAppDataContext } from './hooks/useAppData';
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

  const areas = useMemo(
    () =>
      searchParams
        .get('areas')
        ?.split(',')
        .map((str) => str.trim()) ?? [],
    [searchParams]
  );
  const seasons = useMemo(
    () =>
      (searchParams.get('seasons')?.split(',') || [])
        .map((str) => {
          return str
            .trim()
            .split(':')
            .map((v) => v.trim());
        })
        .map(([quarter, year]) => [quarter, parseInt(year)] as const)
        .filter((v): v is ['Q2' | 'Q4', number] => {
          const quarter = v[0];
          const year = v[1];
          return ['Q2', 'Q4'].includes(quarter) && year >= 2019;
        }) satisfies Parameters<typeof createAppDataContext>['1'],
    [searchParams]
  );

  return (
    <AppWrapper>
      <AppDataContext value={createAppDataContext(areas, seasons)}>
        <CoreFrameContext value={createCoreFrameContextValue()}>
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
        </CoreFrameContext>
      </AppDataContext>
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
