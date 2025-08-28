import * as unionOperator from '@arcgis/core/geometry/operators/unionOperator.js';
import { notEmpty } from './notEmpty';

/**
 * Zooms the map view to the combined extent of the specified layers.
 */
export async function zoomToLayers(view: __esri.MapView, layersToFocusIds: string[]) {
  const layers = view.map?.allLayers;
  if (!layers || layersToFocusIds.length === 0) {
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
          return layer.queryExtent() as Promise<{ count: number; extent: __esri.Extent }>;
        });
      })
      .filter(notEmpty) || [];

  const layerExtents = await Promise.all(promises);

  const extentUnion = unionOperator.executeMany(layerExtents.map(({ extent }) => extent));

  view.goTo(extentUnion, { animate: true, duration: 1000 });
}
