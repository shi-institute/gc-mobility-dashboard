import esriConfig from '@arcgis/core/config.js';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils.js';
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
import { IconButton } from '../IconButton/IconButton';
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
    const layersToAdd = props.layers
      .filter(notEmpty)
      .map((layerInit) => {
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
      })
      .filter(notEmpty);

    esriConfig.log.interceptors.push((level, module, ...args) => {
      // supress messages due to stale blob URLs
      if (level === 'error' && module === 'esri.layers.GeoJSONLayer') {
        const error = args[2].error;
        const isStaleBlobError =
          error.name === 'request:server' &&
          error.details.url.startsWith('blob:') &&
          error.message === 'Failed to fetch';
        return isStaleBlobError; // true = supress
      }

      return false;
    });

    // add the provided layers to the map
    const addedLayers = map.layers.addMany(layersToAdd);

    // set the reactive layer info that we can waycj
    const setLayerInfo = () => {
      const layerInfo = map.allLayers
        .map((layer) => ({
          title: layer.title,
          id: layer.id,
          visible: layer.visible ?? false,
          layer,
        }))
        .toArray();
      setLayers(layerInfo);
    };
    setLayerInfo(); // ensure it runs at least once

    // watch for changes to the layers and update the layer info
    const watchHandles: IHandle[] = [];
    addedLayers.map((layer) => {
      const handle = reactiveUtils.watch(
        // each array element indicates a property to watch
        () => [layer.title, layer.id, layer.visible],
        () => {
          setLayerInfo();
        }
      );
      watchHandles.push(handle);
    });

    // cleanup
    return () => {
      // remove all layers that were previosly when the component unmounts or rerenders
      map.layers.removeMany(addedLayers);

      // remove all watch handles
      watchHandles.forEach((handle) => handle.remove());

      // revoke the object URLs to free up memory
      objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [map, props.layers]);

  // manage the reactive layer info
  const [layers, setLayers] = useState<
    ReadonlyArray<
      Readonly<{
        title: string | nullish;
        id: string;
        visible: boolean;
        layer: __esri.Layer;
      }>
    >
  >();

  const serviceAreaLayers = {
    walk: layers?.find((layer) => layer.id.startsWith('walk-service-area__')),
    bike: layers?.find((layer) => layer.id.startsWith('bike-service-area__')),
    paratransit: layers?.find((layer) => layer.id.startsWith('paratransit-service-area__')),
  };

  function toggleServiceAreaLayer(layerToShow: 'walk' | 'bike' | 'paratransit') {
    // get the current visibility
    const isVisible = serviceAreaLayers[layerToShow]?.visible;

    // hide allservice area layers
    Object.values(serviceAreaLayers).forEach((layerInfo) => {
      if (layerInfo) {
        layerInfo.layer.visible = false;
      }
    });

    // toggle the clicked layer
    if (serviceAreaLayers[layerToShow]) {
      serviceAreaLayers[layerToShow].layer.visible = !isVisible;
    }
  }

  return (
    <div style={{ height: '100%' }}>
      {/* start centered on Greenville at a zoom level that shows most of the city */}
      <arcgis-map basemap="topo-vector" zoom={12} center="-82.4, 34.85" ref={mapElem}>
        {serviceAreaLayers.walk ? (
          <arcgis-placement position="top-left">
            <IconButton
              title="Show walk service area"
              onClick={() => toggleServiceAreaLayer('walk')}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.998 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="currentColor" />
                <path
                  d="M5.998 12a6 6 0 1 1 12 0 6 6 0 0 1-12 0Zm6-4.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z"
                  fill="currentColor"
                />
                <path
                  d="M1.996 12c0-5.524 4.478-10.002 10.002-10.002C17.522 1.998 22 6.476 22 12c0 5.524-4.478 10.002-10.002 10.002-5.524 0-10.002-4.478-10.002-10.002Zm10.002-8.502a8.502 8.502 0 1 0 0 17.004 8.502 8.502 0 0 0 0-17.004Z"
                  fill="currentColor"
                />
              </svg>
            </IconButton>
          </arcgis-placement>
        ) : null}

        {serviceAreaLayers.bike ? (
          <arcgis-placement position="top-left">
            <IconButton
              title="Show bike service area"
              onClick={() => toggleServiceAreaLayer('bike')}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12.75 3a.75.75 0 0 0 0 1.5h1.427l.955 3.5H8.5V5.75A.75.75 0 0 0 7.75 5h-3a.75.75 0 0 0 0 1.5H7v2.188L6.698 10.5a4.25 4.25 0 1 0 4.298 4.065l4.656-4.657.274 1.003a4.25 4.25 0 1 0 1.447-.394l-1.9-6.964A.75.75 0 0 0 14.75 3h-2Zm3.58 9.394.696 2.553a.75.75 0 1 0 1.448-.394L17.777 12a2.75 2.75 0 1 1-1.447.394Zm-5.765.48a4.263 4.263 0 0 0-2.387-2.128L8.385 9.5h5.554l-3.374 3.374Zm-2.64-.611c.71.336 1.254.968 1.471 1.737h-1.76l.289-1.737Zm-1.48-.246-.435 2.61a.75.75 0 0 0 .74.873h2.646a2.751 2.751 0 1 1-2.95-3.483Z"
                  fill="currentColor"
                />
              </svg>
            </IconButton>
          </arcgis-placement>
        ) : null}

        {serviceAreaLayers.paratransit ? (
          <arcgis-placement position="top-left">
            <IconButton
              title="Show paratransit service area"
              onClick={() => toggleServiceAreaLayer('paratransit')}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M8 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM17 15a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM10.75 5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z"
                  fill="currentColor"
                />
                <path
                  d="M7.75 2A3.75 3.75 0 0 0 4 5.75V9.5H2.75a.75.75 0 1 0 0 1.5H4v8.75c0 .966.783 1.75 1.75 1.75h1.5A1.75 1.75 0 0 0 9 19.75V18.5h6v1.25c0 .966.784 1.75 1.75 1.75h1.5A1.75 1.75 0 0 0 20 19.75V11h1.227a.75.75 0 0 0 0-1.5H20V5.75A3.75 3.75 0 0 0 16.25 2h-8.5ZM18.5 18.5v1.25a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25V18.5h2Zm0-1.5h-13v-4h13v4Zm-13 2.75V18.5h2v1.25a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25Zm0-14A2.25 2.25 0 0 1 7.75 3.5h8.5a2.25 2.25 0 0 1 2.25 2.25v5.75h-13V5.75Z"
                  fill="currentColor"
                />
              </svg>
            </IconButton>
          </arcgis-placement>
        ) : null}

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
