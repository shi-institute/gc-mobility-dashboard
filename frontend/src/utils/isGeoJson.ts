/**
 * Checks that the input value is probably valid GeoJSON.
 */
export function isGeoJSON(toCheck: unknown): toCheck is GeoJSON {
  return (
    !!toCheck &&
    typeof toCheck === 'object' &&
    'type' in toCheck &&
    toCheck.type === 'FeatureCollection' &&
    'features' in toCheck &&
    Array.isArray(toCheck.features) &&
    toCheck.features &&
    toCheck.features.every(
      (feature) =>
        feature &&
        typeof feature === 'object' &&
        'type' in feature &&
        feature.type === 'Feature' &&
        'geometry' in feature &&
        feature.geometry &&
        typeof feature.geometry === 'object' &&
        'type' in feature.geometry &&
        typeof feature.geometry.type === 'string' &&
        'coordinates' in feature.geometry &&
        Array.isArray(feature.geometry.coordinates)
    )
  );
}
