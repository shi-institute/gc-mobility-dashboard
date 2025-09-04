import esriConfig from '@arcgis/core/config.js';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils.js';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js';
import WebTileLayer from '@arcgis/core/layers/WebTileLayer.js';
import * as symbolUtils from '@arcgis/core/symbols/support/symbolUtils.js';
import '@arcgis/map-components/components/arcgis-expand';
import '@arcgis/map-components/components/arcgis-layer-list';
import '@arcgis/map-components/components/arcgis-legend';
import '@arcgis/map-components/components/arcgis-placement';
import '@arcgis/map-components/components/arcgis-scale-range-slider';
import '@arcgis/map-components/dist/components/arcgis-map';
import styled from '@emotion/styled';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRect } from '../../../hooks';
import { debounce, notEmpty } from '../../../utils';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { ParatransitIcon } from '../IconButton/ParatransitIcon';
import { WalkshedIcon } from '../IconButton/WalkshedIcon';
import type { GeoJSONLayerInit } from './types';

interface MapProps {
  layers: (GeoJSONLayerInit | WebTileLayer | VectorTileLayer)[];
  onMapReady?: (map: __esri.Map, view: __esri.MapView) => void;
  neverShowExpandedLayersListOnLoad?: boolean;
}

export function Map(props: MapProps) {
  const mapElem = useRef<HTMLArcgisMapElement>(null);
  const { height: mapHeight, width: mapWidth } = useRect(mapElem);

  // track when the map is ready or is replaced
  const [map, setMap] = useState<__esri.Map | null>(null);
  useEffect(() => {
    if (!mapElem.current) {
      return;
    }

    mapElem.current.addEventListener('arcgisViewReadyChange', () => {
      setMap(mapElem.current?.map ?? null);

      if (mapElem.current?.map && mapElem.current?.view) {
        props.onMapReady?.(mapElem.current.map, mapElem.current.view);
      }
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
        .filter(
          (
            layer
          ): layer is
            | __esri.GeoJSONLayer
            | __esri.WebTileLayer
            | __esri.VectorTileLayer
            | __esri.FeatureLayer =>
            layer.type === 'geojson' ||
            layer.type === 'web-tile' ||
            layer.type === 'vector-tile' ||
            layer.type === 'feature'
        )
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
        layer:
          | __esri.GeoJSONLayer
          | __esri.WebTileLayer
          | __esri.VectorTileLayer
          | __esri.FeatureLayer;
      }>
    >
  >();

  // manage the symbols
  const [symbols, setSymbols] = useState<
    (NonNullable<typeof layers>[0] & { symbolHTML: HTMLElement | null | undefined })[]
  >([]);
  const updateSymbols = useCallback(async (_layers: typeof layers) => {
    const newSymbols: typeof symbols = [];

    for await (const layer of _layers || []) {
      if (
        layer.visible === false ||
        !('legendEnabled' in layer.layer) ||
        !layer.layer.legendEnabled
      ) {
        continue;
      }

      if (
        !('renderer' in layer.layer) ||
        !layer.layer.renderer ||
        typeof layer.layer.renderer !== 'object'
      ) {
        continue;
      }

      if (!('symbol' in layer.layer.renderer) || !layer.layer.renderer.symbol) {
        continue;
      }

      const symbol = layer.layer.renderer.symbol as __esri.SymbolUnion;
      const isLine = symbol.type === 'simple-line';
      const layerSymbolHTML = symbolUtils.renderPreviewHTML(symbol, { size: isLine ? 2 : 16 });

      newSymbols.push({
        ...layer,
        symbolHTML: await layerSymbolHTML,
      });
    }

    newSymbols.reverse();
    setSymbols(newSymbols);
  }, []);
  const updateSymbolsDebounced = useMemo(() => debounce(updateSymbols, 250), [updateSymbols]);
  useEffect(() => {
    updateSymbolsDebounced(layers);
  }, [layers]);

  const serviceAreaLayers = {
    walk: layers?.filter((layer) => layer.id.startsWith('walk-service-area__')) || [],
    bike: layers?.filter((layer) => layer.id.startsWith('bike-service-area__')) || [],
    paratransit: layers?.filter((layer) => layer.id.startsWith('paratransit-service-area__')) || [],
  };

  function toggleServiceAreaLayer(layerToShow: 'walk' | 'bike' | 'paratransit') {
    // get the current visibility
    const isVisible = serviceAreaLayers[layerToShow]?.every((layer) => layer.visible) ?? false;

    // hide all service area layers
    Object.values(serviceAreaLayers)
      .flatMap((l) => l)
      .forEach((layerInfo) => {
        if (layerInfo) {
          layerInfo.layer.visible = false;
        }
      });

    // toggle the clicked layer
    if (serviceAreaLayers[layerToShow]) {
      serviceAreaLayers[layerToShow].forEach((layerInfo) => {
        if (layerInfo) {
          layerInfo.layer.visible = !isVisible;
        }
      });
    }
  }

  const quickToggleLayers = {
    stops: layers?.filter((layer) => layer.id.startsWith('stops__')) || [],
  };

  function quickToggleLayer(layerToShow: 'stops') {
    // get the current visibility
    const isVisible = quickToggleLayers[layerToShow]?.every((layer) => layer.visible) ?? false;

    // toggle the clicked layer
    if (quickToggleLayers[layerToShow]) {
      quickToggleLayers[layerToShow].forEach((layerInfo) => {
        if (layerInfo) {
          layerInfo.layer.visible = !isVisible;
        }
      });
    }
  }

  function consolidateSymbols(_symbols: typeof symbols) {
    let futureStopsAlreadyAdded = false;
    let futureRoutesAlreadyAdded = false;
    let futureWalkServiceAreaAlreadyAdded = false;
    let futureBikeServiceAreaAlreadyAdded = false;
    let futureParatransitServiceAreaAlreadyAdded = false;

    let areaBoundaryLayerAdded = false;
    let foundMultipleAreaBoundaryLayers = false;

    if (!_symbols || !_symbols.length) {
      return [];
    }

    return _symbols
      .filter((symbol) => {
        if (!symbol.title) {
          return true;
        }

        if (symbol.id.startsWith('stops__future__')) {
          if (futureStopsAlreadyAdded) {
            return false;
          } else {
            futureStopsAlreadyAdded = true;
            return true;
          }
        }

        if (symbol.id.startsWith('future_route__')) {
          if (futureRoutesAlreadyAdded) {
            return false;
          } else {
            futureRoutesAlreadyAdded = true;
            return true;
          }
        }

        if (symbol.id.startsWith('area-polygon__')) {
          if (areaBoundaryLayerAdded) {
            foundMultipleAreaBoundaryLayers = true;
            return false;
          } else {
            areaBoundaryLayerAdded = true;
            return true;
          }
        }

        if (symbol.id.startsWith('walk-service-area__future__')) {
          if (futureWalkServiceAreaAlreadyAdded) {
            return false;
          } else {
            futureWalkServiceAreaAlreadyAdded = true;
            return true;
          }
        }

        if (symbol.id.startsWith('bike-service-area__future__')) {
          if (futureBikeServiceAreaAlreadyAdded) {
            return false;
          } else {
            futureBikeServiceAreaAlreadyAdded = true;
            return true;
          }
        }

        if (symbol.id.startsWith('paratransit-service-area__future__')) {
          if (futureParatransitServiceAreaAlreadyAdded) {
            return false;
          } else {
            futureParatransitServiceAreaAlreadyAdded = true;
            return true;
          }
        }

        return true;
      })
      .map((symbol) => {
        if (symbol.id.startsWith('stops__future__')) {
          return {
            ...symbol,
            title: 'Future Stops',
          };
        }

        if (symbol.id.startsWith('future_route__')) {
          return {
            ...symbol,
            title: 'Future Routes',
          };
        }

        if (symbol.id.startsWith('area-polygon__')) {
          return {
            ...symbol,
            title: foundMultipleAreaBoundaryLayers
              ? 'Selected Areas Boundaries'
              : 'Selected Area Boundary',
          };
        }

        if (symbol.id.startsWith('walk-service-area__future__')) {
          return {
            ...symbol,
            title: 'Future Route Walk Service Area',
          };
        }

        if (symbol.id.startsWith('bike-service-area__future__')) {
          return {
            ...symbol,
            title: 'Future Route Bike Service Area',
          };
        }

        if (symbol.id.startsWith('paratransit-service-area__future__')) {
          return {
            ...symbol,
            title: 'Future Route Paratransit Service Area',
          };
        }

        return symbol;
      });
  }

  const [showLayerList, setShowLayerList] = useState<boolean | null>(
    props.neverShowExpandedLayersListOnLoad ? false : null
  );
  useEffect(() => {
    if (showLayerList === null && mapHeight > 0 && mapWidth > 0 && symbols && symbols.length) {
      setShowLayerList(mapHeight !== null && mapHeight > 600 && mapWidth > 420);
    }
  }, [showLayerList, mapHeight, mapWidth, symbols, setShowLayerList]);

  return (
    <div style={{ height: '100%' }}>
      {/* start centered on Greenville at a zoom level that shows most of the city */}
      <arcgis-map basemap="topo-vector" zoom={12} center="-82.4, 34.85" ref={mapElem}>
        <arcgis-placement position="top-left">
          <SegmentedControlContainer>
            {serviceAreaLayers.walk.length ? (
              <arcgis-placement position="top-left">
                <IconButton
                  title="Show walk service area"
                  onClick={() => toggleServiceAreaLayer('walk')}
                  active={serviceAreaLayers.walk.every((layer) => layer.visible)}
                >
                  <WalkshedIcon />
                </IconButton>
              </arcgis-placement>
            ) : null}
            {serviceAreaLayers.bike.length ? (
              <arcgis-placement position="top-left">
                <IconButton
                  title="Show bike service area"
                  onClick={() => toggleServiceAreaLayer('bike')}
                  active={serviceAreaLayers.bike.every((layer) => layer.visible)}
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
            {serviceAreaLayers.paratransit.length ? (
              <arcgis-placement position="top-left">
                <IconButton
                  title="Show paratransit service area"
                  onClick={() => toggleServiceAreaLayer('paratransit')}
                  active={serviceAreaLayers.paratransit.every((layer) => layer.visible)}
                >
                  <ParatransitIcon />
                </IconButton>
              </arcgis-placement>
            ) : null}
          </SegmentedControlContainer>
        </arcgis-placement>

        {quickToggleLayers.stops.length ? (
          <arcgis-placement position="top-left">
            <IconButton
              title="Toggle bus stop visibility"
              onClick={() => quickToggleLayer('stops')}
              active={quickToggleLayers.stops.every((layer) => layer.visible)}
              solidSurfaceColor="#fff"
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

        <arcgis-placement position="bottom-left">
          <div>
            {showLayerList ? (
              <LayerListContainer mapHeight={mapHeight}>
                <IconButton
                  className="collapse-button"
                  onClick={() => setShowLayerList(false)}
                  title="Hide Layers List"
                >
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="m4.21 4.387.083-.094a1 1 0 0 1 1.32-.083l.094.083L12 10.585l6.293-6.292a1 1 0 1 1 1.414 1.414L13.415 12l6.292 6.293a1 1 0 0 1 .083 1.32l-.083.094a1 1 0 0 1-1.32.083l-.094-.083L12 13.415l-6.293 6.292a1 1 0 0 1-1.414-1.414L10.585 12 4.293 5.707a1 1 0 0 1-.083-1.32l.083-.094-.083.094Z"
                      fill="currentColor"
                    />
                  </svg>
                </IconButton>
                <section>
                  {consolidateSymbols(symbols).map((layer) => {
                    if (!layer.symbolHTML) {
                      return null;
                    }

                    return (
                      <article key={layer.id}>
                        <div
                          className="symbol"
                          dangerouslySetInnerHTML={{ __html: layer.symbolHTML.outerHTML }}
                        />
                        <h1>{layer.title}</h1>
                      </article>
                    );
                  })}
                </section>
                <div className="footer">
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
              </LayerListContainer>
            ) : (
              <Button onClick={() => setShowLayerList(true)} solidSurfaceColor="#fff">
                Legend
              </Button>
            )}
          </div>
        </arcgis-placement>
      </arcgis-map>
    </div>
  );
}

const SegmentedControlContainer = styled.div`
  display: flex;
  flex-direction: row;
  background: white;
  border-radius: var(--button-radius);

  box-shadow: inset 0 0 0 0.063em var(--control-stroke-default),
    inset 0 -0.063em 0 0 var(--control-stroke-secondary-overlay),
    0 0.25em 0.75em 0.25em var(--control-stroke-default);

  & button:not(:hover):not(:active) {
    box-shadow: none;
  }
`;

const LayerListContainer = styled.aside<{ mapHeight: number | null }>`
  background-color: white;
  border-radius: var(--surface-radius);
  display: flex;
  flex-direction: column;
  position: relative;
  max-height: ${({ mapHeight }) => (mapHeight ? `${mapHeight - 80}px` : '300px')};

  box-shadow: inset 0 0 0 0.063em var(--control-stroke-default),
    inset 0 -0.063em 0 0 var(--control-stroke-secondary-overlay),
    0 0.25em 0.75em 0.25em var(--control-stroke-default);

  section {
    max-height: ${({ mapHeight }) => (mapHeight ? `${mapHeight - 80}px` : '300px')};
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    padding-right: 3rem;
  }

  article {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.75rem;
    min-height: 24px;

    .symbol {
      text-align: center;
      flex-grow: 0;
      flex-shrink: 0;
      display: contents;

      div {
        display: inline-block;
      }

      img,
      svg {
        max-height: 24px;
        max-width: 24px;
        object-fit: contain;
      }
    }

    h1 {
      font-size: 0.875rem;
      font-weight: 400;
      margin: 0;
      line-height: 1.2;
    }
  }

  article:first-of-type h1 {
    width: calc(100% - 64px);
  }

  .collapse-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 1;
    background-color: transparent;
    border: none;
    padding: 0.25rem;
    cursor: default;

    &:hover {
      background-color: var(--subtle-fill-secondary);
    }

    svg {
      fill: var(--text-secondary);
      width: 1rem;
      height: 1rem;
    }
  }

  .footer {
    padding: 1rem;
    border-top: 1px solid lightgray;
  }

  .esri-widget--button {
    width: 160px;
    position: relative;
    cursor: default;
    &:focus-within {
      outline: Highlight auto 1px;
      outline: -webkit-focus-ring-color auto 1px;
      outline-offset: 2px;
    }
    .esri-collapse__icon {
      display: none;
    }
    &::after {
      content: 'Manage map layers';
      position: absolute;
      inset: 0;

      appearance: none;
      font-family: inherit;
      font-weight: 500;
      font-size: 0.875rem;
      display: inline-flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      padding: 0 1rem;
      height: 32px;
      box-sizing: border-box;
      border: none;
      box-shadow: inset 0 0 0 1px var(--control-stroke-default),
        inset 0 -1px 0 0 var(--control-stroke-secondary-overlay);
      border-radius: var(--button-radius);
      text-decoration: none;
      color: var(--text-primary);
      user-select: none;
      background-color: #fff;
      flex-wrap: nowrap;
      transition: var(--wui-control-faster-duration);
    }

    &:hover:not(.disabled)::after {
      background-color: var(--subtle-fill-secondary);
    }

    &:active:not(.disabled)::after {
      background-color: var(--subtle-fill-tertiary);
      color: var(--text-secondary);
      box-shadow: inset 0 0 0 1px var(--control-stroke-default);
    }
  }
`;
