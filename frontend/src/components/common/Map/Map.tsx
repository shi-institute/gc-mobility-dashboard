import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js';
import WebTileLayer from '@arcgis/core/layers/WebTileLayer.js';
import '@arcgis/map-components/components/arcgis-expand';
import '@arcgis/map-components/components/arcgis-layer-list';
import '@arcgis/map-components/components/arcgis-legend';
import '@arcgis/map-components/components/arcgis-placement';
import '@arcgis/map-components/components/arcgis-scale-range-slider';
import '@arcgis/map-components/dist/components/arcgis-map';
import { useEffect, useRef, useState } from 'react';
import { notEmpty } from '../../../utils';
import type { GeoJSONLayerInit } from './types';

interface MapProps {
  layers: (GeoJSONLayerInit | WebTileLayer | VectorTileLayer)[];
}

export function Map(props: MapProps) {
  const mapElem = useRef<HTMLArcgisMapElement>(null);

  // track when the map is ready or is replaced
  const [map, setMap] = useState<__esri.Map | null>(null);
  useEffect(() => {
    if (!mapElem.current) {
      return;
    }

    mapElem.current.addEventListener('arcgisViewReadyChange', () => {
      setMap(mapElem.current?.map ?? null);
    });
  }, [mapElem.current]);

  useEffect(() => {
    if (!map) {
      return;
    }

    // process each layer initializer
    const objectUrls: string[] = [];
    const layersToAdd = props.layers.filter(notEmpty).map((layerInit) => {
      if (layerInit instanceof WebTileLayer || layerInit instanceof VectorTileLayer) {
        return layerInit;
      }

      if (layerInit.data instanceof URL) {
        return new GeoJSONLayer({
          ...layerInit,
          url: layerInit.data.toString(),
        });
      }

      // if the data is a GeoJSON object, we need to create a blob URL
      const blob = new Blob([JSON.stringify(layerInit.data)], { type: 'application/json' });
      const objectUrl = URL.createObjectURL(blob);
      objectUrls.push(objectUrl);

      return new GeoJSONLayer({
        ...layerInit,
        url: objectUrl,
      });
    });

    // add the provided layers to the map
    const addedLayers = map.layers.addMany(layersToAdd);

    // cleanup
    return () => {
      // remove all layers that were previosly when the component unmounts or rerenders
      map.layers.removeMany(addedLayers);

      // revoke the object URLs to free up memory
      objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [map, props.layers]);

  return (
    <div style={{ height: '100%' }}>
      {/* start centered on Greenville at a zoom level that shows most of the city */}
      <arcgis-map basemap="gray-vector" zoom={12} center="-82.4, 34.85" ref={mapElem}>
        <arcgis-expand
          close-on-esc
          position="bottom-left"
          mode="floating"
          expandIcon="legend"
          collapseIcon="chevrons-right"
          expandTooltip="View Legend"
          collapseTooltip="Hide Legend"
        >
          <arcgis-placement>
            <div style={{ width: '300px' }}>
              <h2
                style={{
                  fontSize: 'var(--calcite-font-size-0)',
                  fontWeight: 'var(--calcite-font-weight-medium)',
                  padding: '8px 8px 0px',
                  margin: 8,
                }}
              >
                Legend
              </h2>
              <arcgis-legend position="manual" />
              <arcgis-expand label="Layers">
                <arcgis-layer-list
                  position="manual"
                  drag-enabled
                  show-errors
                  show-filter
                  show-temporary-layer-indicators
                  visibility-appearance="checkbox"
                />
              </arcgis-expand>
            </div>
          </arcgis-placement>
        </arcgis-expand>
      </arcgis-map>
    </div>
  );
}
