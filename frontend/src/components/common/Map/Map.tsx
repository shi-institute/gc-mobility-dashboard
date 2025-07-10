import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';
import '@arcgis/map-components/dist/components/arcgis-map';
import { useEffect, useRef } from 'react';
import type { GeoJSONLayerInit } from './types';

interface MapProps {
  layers: GeoJSONLayerInit[];
}

export function Map(props: MapProps) {
  const mapElem = useRef<HTMLArcgisMapElement>(null);

  useEffect(() => {
    if (!mapElem.current) {
      return;
    }

    const map = mapElem.current.map;
    if (!map) {
      return;
    }

    // process each layer initializer
    const objectUrls: string[] = [];
    const layersToAdd = props.layers.map((layerInit) => {
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
  }, [mapElem.current, props.layers]);

  return (
    <div style={{ height: '100%' }}>
      {/* start centered on Greenville at a zoom level that shows most of the city */}
      <arcgis-map basemap="topo-vector" zoom={12} center="-82.4, 34.85" ref={mapElem} />
    </div>
  );
}
