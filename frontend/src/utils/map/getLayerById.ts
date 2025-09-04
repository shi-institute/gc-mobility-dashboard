/**
 * Finds a layer and its layer view by layer id from an ArcGIS `MapView`.
 * @param mapView  `__esri.MapView`
 * @param layerId A layer ID (from `layer.id`) or a search function that accepts an array of layers and returns a layer.
 * @returns A tuple containing the layer and its layer view, or a tuple of `null` if not found.
 */
export function getLayerById(
  mapView: __esri.MapView,
  layerId: string | ((layers: __esri.Layer[]) => __esri.Layer | undefined)
) {
  if (!mapView || !mapView.map) {
    return [null, null] as const;
  }

  // if the layer id is a function, treat it as a finder function
  if (typeof layerId === 'function') {
    const maybeLayer = layerId(mapView.map.layers.toArray());
    if (!maybeLayer) {
      return [null, null] as const;
    }
    layerId = maybeLayer.id;
  }

  const layer = mapView.map.findLayerById(layerId);
  if (!layer) {
    console.warn(`Layer with ID ${layerId} not found in the map.`);
    return [null, null] as const;
  }

  const layerView = mapView.allLayerViews.find((lv) => lv.layer.id === layerId);
  if (!layerView) {
    console.warn(`LayerView for layer ID ${layerId} not found.`);
    return [layer, null] as const;
  }

  return [layer, layerView] as const;
}
