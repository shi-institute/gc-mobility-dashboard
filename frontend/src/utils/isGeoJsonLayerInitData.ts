import { isGeoJSON } from './isGeoJson';

/**
 * Checks that the input value is a valid data input for a GeoJSONLayerInit class.
 */
export function isGeoJsonLayerInitData(toCheck: unknown): toCheck is URL | GeoJSON {
  return toCheck instanceof URL || isGeoJSON(toCheck);
}
