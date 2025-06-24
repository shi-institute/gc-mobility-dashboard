import { CoreFrame, SidebarContent } from '../components';
import { AppNavigation } from '../components/navigation';
import {
  ComparisonModeSwitch,
  SelectedArea,
  SelectedComparisonAreas,
  SelectedComparisonSeasons,
  SelectedSeason,
  useComparisonModeState,
} from '../components/options';
import { useAppData } from '../hooks';

export function GeneralAccess() {
  const { data, loading, errors } = useAppData();

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      header={<AppNavigation />}
      sidebar={<Sidebar />}
      sections={[
        <div key="placeholder">
          {loading ? (
            <p>Loading...</p>
          ) : errors ? (
            <p>Error: {errors.join(', ')}</p>
          ) : (
            <div>
              <h2>General Access Data</h2>
              <pre>
                {JSON.stringify(
                  (data || []).map((o) =>
                    Object.fromEntries(
                      Object.entries(o).map(([key, value]) => {
                        if (Array.isArray(value)) {
                          return [key, `Array(${value.length})`];
                        }
                        return [key, value];
                      })
                    )
                  ),
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>,
      ]}
    />
  );
}

function Sidebar() {
  const { areasList, seasonsList } = useAppData();
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
    </SidebarContent>
  );
}
