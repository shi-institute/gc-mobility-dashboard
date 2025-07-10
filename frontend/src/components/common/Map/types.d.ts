import EsriGeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';

export interface GeoJSONLayerInit extends Partial<Omit<EsriGeoJSONLayer, 'url'>> {
  /**
   * The URL or GeoJSON data to load into the layer.
   */
  data: URL | GeoJSON;
}
