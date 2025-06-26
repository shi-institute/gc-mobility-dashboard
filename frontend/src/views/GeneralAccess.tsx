import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';
import '@arcgis/map-components/dist/components/arcgis-map';
import { useEffect, useRef } from 'react';
import Wkt from 'wicket';
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
import { notEmpty } from '../utils';

const wkt = new Wkt.Wkt();

export function GeneralAccess() {
  const { data, loading, errors } = useAppData();

  const networkSegments = (data || [])
    .map((chunk) => {
      return {
        __area: chunk.__area,
        __quarter: chunk.__quarter,
        __year: chunk.__year,
        geojson: {
          type: 'FeatureCollection',
          features:
            chunk.network_segments?.map(({ geometry, ...properties }) => {
              return {
                type: 'Feature',
                id: properties.stableEdgeId,
                properties: {
                  ...properties,
                  __area: chunk.__area,
                  __quarter: chunk.__quarter,
                  __year: chunk.__year,
                },
                geometry: wkt.read(geometry).toJson(),
              };
            }) || [],
        },
      };
    })
    .filter(notEmpty);

  const mapElem = useRef<HTMLArcgisMapElement>(null);

  useEffect(() => {
    if (!mapElem.current) {
      return;
    }

    const map = mapElem.current.map;
    if (!map) {
      return;
    }

    // store object urls to destroy them later
    const objectUrls: string[] = [];

    // add network segments as a set of feature layers
    networkSegments.forEach((segment) => {
      const blob = new Blob([JSON.stringify(segment.geojson)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);

      const layer = new GeoJSONLayer({
        url,
        title: `Network Segments - ${segment.__area} - ${segment.__quarter} ${segment.__year}`,
        popupTemplate: {
          title: '{stableEdgeId}',
          content: `
            <strong>Area:</strong> {__area}<br>
            <strong>Quarter:</strong> {__quarter}<br>
            <strong>Year:</strong> {__year}<br>
            <strong>Stable Edge ID:</strong> {stableEdgeId}<br>
          `,
        },
      });

      map.layers.add(layer);
    });

    console.log(map);
    console.log(map.allLayers);

    return () => {
      // clean up object URLs
      objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      // remove all layers from the map
      map.layers.removeAll();
    };
  }, [mapElem.current, networkSegments]);

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      header={<AppNavigation />}
      sidebar={<Sidebar />}
      map={
        <div style={{ height: '100%' }}>
          <arcgis-map
            basemap="topo-vector"
            zoom={12}
            center="-82.4, 34.85"
            ref={mapElem}
          ></arcgis-map>
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
