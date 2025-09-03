import styled from '@emotion/styled';
import { useEffect, useMemo } from 'react';
import { Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Button, CoreFrameContext, createCoreFrameContextValue } from './components';
import {
  COMPONENTS_ROUTE_FRAGMENT,
  LANDING_PAGE_FRAGMENT,
  TAB_1_FRAGMENT,
  TAB_2_FRAGMENT,
  TAB_3_FRAGMENT,
  TAB_4_FRAGMENT,
  TAB_5_FRAGMENT,
} from './components/navigation';
import { useSectionsVisibility } from './hooks';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const [, , visibleTabs] = useSectionsVisibility();

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

  const resolvedAreas = isOnJobAccessPage ? jobAccessAreasOverride : areas;
  const resolvedSeasons = isOnJobAccessPage ? jobAccessSeasonsOverride : seasons;

  const editMode = searchParams.get('edit') === 'true';

  // add an event listener to trigger edit mode: Meta + Shift + E
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'E' && event.shiftKey && event.metaKey) {
        if (editMode) {
          searchParams.delete('edit');
        } else {
          searchParams.set('edit', 'true');
        }
        setSearchParams(searchParams, { replace: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchParams, setSearchParams, editMode]);

  const subsetTitle = searchParams.get('subsetTitle') ?? 'Currently viewing a subset';
  const setSubsetTitle = (title: string) => {
    if (title.trim().length === 0) {
      searchParams.delete('subsetTitle');
    } else {
      searchParams.set('subsetTitle', title.trim());
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <AppWrapper>
      <AppDataContext.Provider
        value={createAppDataContext(resolvedAreas, resolvedSeasons, travelMethod)}
      >
        {editMode ? (
          <Banner>
            <h1>You are currently in edit mode</h1>
            <p>
              Click any statistic to show/hide it. Hidden elements will be 50% transparent while in
              edit mode but will be hidden when not in edit mode.
            </p>
            <p>Tabs without visible items will be hidden outside of edit mode.</p>
            <p>Press Meta + Shift + E to exit edit mode.</p>
          </Banner>
        ) : null}
        {searchParams.has('sections') ? (
          <Banner flex>
            <p>
              <span
                contentEditable={editMode}
                onBlur={(evt) => setSubsetTitle(evt.currentTarget.textContent || '')}
              >
                {subsetTitle}
              </span>
              {editMode ? <span> (⬅️ type to edit title)</span> : null}
            </p>
            <Button
              solidSurfaceColor="#e0e0e0"
              onClick={() => {
                searchParams.delete('sections');
                searchParams.delete('subsetTitle');
                setSearchParams(searchParams, { replace: true });
              }}
            >
              View all data
            </Button>
          </Banner>
        ) : null}
        <CoreFrameContext.Provider value={createCoreFrameContextValue()}>
          {import.meta.env.DEV ? <PlaceholderGreenvilleConnectsWebsiteHeader /> : null}

          <Routes>
            {!visibleTabs || visibleTabs.includes(TAB_1_FRAGMENT) ? (
              <Route index Component={GeneralAccess} />
            ) : null}
            {!visibleTabs || visibleTabs.includes(TAB_2_FRAGMENT) ? (
              <Route path={TAB_2_FRAGMENT} Component={FutureOpportunities} />
            ) : null}
            {!visibleTabs || visibleTabs.includes(TAB_3_FRAGMENT) ? (
              <Route path={TAB_3_FRAGMENT} Component={JobAccess} />
            ) : null}
            {!visibleTabs || visibleTabs.includes(TAB_4_FRAGMENT) ? (
              <Route path={TAB_4_FRAGMENT} Component={EssentialServicesAccess} />
            ) : null}
            {!visibleTabs || visibleTabs.includes(TAB_5_FRAGMENT) ? (
              <Route path={TAB_5_FRAGMENT} Component={RoadsVsTransit} />
            ) : null}

            {import.meta.env.DEV ? (
              <Route path={COMPONENTS_ROUTE_FRAGMENT} element={<DevModeComponentsAll />} />
            ) : null}

            {/* 404 route */}
            <Route path="*" Component={Error404} />
          </Routes>
        </CoreFrameContext.Provider>
      </AppDataContext.Provider>
    </AppWrapper>
  );
}

function Error404() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  const [, , visibleTabs] = useSectionsVisibility();

  // If the current path fragment is in the list of valid routes but the 404
  // page is showing, that means that the tab is hidden due to section visibility.
  // In that case, if there are any visible tabs, redirect to the first visible tab.
  // Otherwise, just show the 404 page.
  const validPaths = [
    LANDING_PAGE_FRAGMENT,
    TAB_1_FRAGMENT,
    TAB_2_FRAGMENT,
    TAB_3_FRAGMENT,
    TAB_4_FRAGMENT,
    TAB_5_FRAGMENT,
  ];
  if (validPaths.includes(pathname) && visibleTabs && visibleTabs.length > 0) {
    navigate(visibleTabs[0] + search, { replace: true });
  }

  return (
    <div style={{ margin: '1rem' }}>
      <h1 style={{ margin: 0 }}>404</h1>
      <p style={{ margin: 0 }}>Not found</p>
      <br />
      <Button href={'#' + LANDING_PAGE_FRAGMENT + search}>Go to main page</Button>
    </div>
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

const Banner = styled.aside<{ flex?: boolean }>`
  background-color: var(--color-secondary);
  color: #e0e0e0;
  padding: 0.5rem 1rem;
  box-shadow: inset 0 -1px 0 0 rgb(255 255 255 / 10%);

  ${({ flex }) => {
    if (flex) {
      return `
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      `;
    }
  }}

  h1 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }

  p {
    font-size: 0.875rem;
    margin: 0;
  }

  button {
    color: var(--text-primary);
    background-color: hsla(0, 0%, 100%, 0.06);
    height: 1.825rem;
    font-size: 0.75rem;
    font-weight: 400;
    padding: 0 1em;

    --text-primary: hsl(0, 0%, 100%);
    --text-secondary: hsla(0, 0%, 100%, 0.77);

    --subtle-fill-secondary: hsla(0, 0%, 100%, 0.09);
    --subtle-fill-tertiary: hsla(0, 0%, 100%, 0.03);

    --control-stroke-default: hsla(0, 0%, 100%, 0.07);
    --control-stroke-secondary-overlay: hsla(0, 0%, 0%, 2.32%);
  }
`;
