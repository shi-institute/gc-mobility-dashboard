/**
 * Whether the given object is a feature set.
 */
export function isEsriGraphic(toCheck: unknown): toCheck is __esri.Graphic {
  return (
    !!toCheck &&
    typeof toCheck === 'object' &&
    !Array.isArray(toCheck) &&
    'geometry' in toCheck &&
    'attributes' in toCheck
  );
}
