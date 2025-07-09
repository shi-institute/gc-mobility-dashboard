import '@arcgis/map-components/dist/components/arcgis-map';
import { CoreFrame, SidebarContent } from '../components';
import { AppNavigation } from '../components/navigation';
import {
  ComparisonModeSwitch,
  SelectedArea,
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
      map={
        <div style={{ height: '100%' }}>
          <arcgis-map basemap="topo-vector" zoom={12} center="-82.4, 34.85"></arcgis-map>
        </div>
      }
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
      <h2>Compare</h2>
      <ComparisonModeSwitch />
      <h2>Filters</h2>
      <SelectedArea areasList={areasList} />
      <SelectedSeason seasonsList={seasonsList} />
    </SidebarContent>
  );
}
