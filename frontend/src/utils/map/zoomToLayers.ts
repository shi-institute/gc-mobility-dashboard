import * as unionOperator from '@arcgis/core/geometry/operators/unionOperator.js';
import { notEmpty } from '../notEmpty';

/**
 * Zooms the map view to the combined extent of the specified layers.
 *
 * Provide layers as an array of layer IDs or an object containing the layer ID
 * and a `Query` for filtering the layer before getting the extent.
 *
 * Example usage:
 * ```ts
 * import Query from "@arcgis/core/rest/support/Query.js";
 * import { mapUtils } from "$utils";
 *
 * await mapUtils.zoomToLayers(view, [
 *   { id: 'layerId2', query: new Query({ where: 'population > 100' }) }
 * ]);
 * ```
 */
export async function zoomToLayers(
  view: __esri.MapView,
  layersToFocus: string[] | { id: string; query?: __esri.Query }[]
): Promise<void> {
  const layersToFocusIds = isStringArray(layersToFocus)
    ? layersToFocus
    : layersToFocus.map((l) => l.id);

  const layers = view.map?.allLayers;
  if (!layers || layersToFocus.length === 0) {
    return;
  }

  const foundLayers = layers.filter((layer) => layersToFocusIds.includes(layer.id)).toArray();
  if (!foundLayers || foundLayers.length === 0) {
    return;
  }

  const promises =
    foundLayers
      .map((layer): Promise<{ count: number; extent: __esri.Extent }> | null => {
        return layer.when(() => {
          if (!('queryExtent' in layer) || typeof layer.queryExtent != 'function') {
            return null;
          }

          const query = isStringArray(layersToFocus)
            ? undefined
            : layersToFocus.find((l) => l.id === layer.id)?.query;

          return (layer as unknown as __esri.FeatureLayerView).queryExtent(query) as Promise<{
            count: number;
            extent: __esri.Extent;
          }>;
        });
      })
      .filter(notEmpty) || [];

  const layerExtents = await Promise.all(promises);

  const extentUnion = unionOperator.executeMany(layerExtents.map(({ extent }) => extent));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  view.goTo(extentUnion, { animate: true, duration: prefersReducedMotion ? 0 : 1000 });
}

function isStringArray(arr: any[]): arr is string[] {
  return arr.every((item) => typeof item === 'string');
}
