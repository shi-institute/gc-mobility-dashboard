import '@arcgis/map-components/dist/components/arcgis-map';
import { useMemo } from 'react';
import { CoreFrame, Map, SidebarContent } from '../components';
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
  const { data, loading, errors } = useAppData();

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
                        if (typeof value === 'object' && value !== null) {
                          return [
                            key,
                            Object.fromEntries(
                              Object.entries(value).map(([k, v]) => {
                                if (Array.isArray(v)) {
                                  return [k, `Array(${v.length})`];
                                }
                                return [k, v];
                              })
                            ),
                          ];
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
