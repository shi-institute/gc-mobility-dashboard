import Query from '@arcgis/core/rest/support/Query.js';
import { notEmpty } from '../notEmpty';
import { requireKey } from '../requireKey';
import { toSqlList } from '../toSqlList';
import { getLayerById } from './getLayerById';

type EsriHighlightTarget = Parameters<__esri.GeoJSONLayerView['highlight']>[0];
type EsriHighlightOptions = Parameters<__esri.GeoJSONLayerView['highlight']>[1];

/**
 * Highlights the features for the specified layers.
 *
 * If a layer is not found or does not support highlighting, it is skipped.
 * Existing highlights are cleared before applying new ones.
 *
 * If the target for a layer is undefined, all features in that layer will be
 * highlighted.
 *
 * @param spec An array of objects specifying the layer ID, target features,
 *             and highlight options.
 * @returns An array objects containing the highlight handle and layer view for each
 *          successfully highlighted layer.
 */
export async function highlightFeatures(
  mapView: __esri.MapView,
  specs: {
    layerId: Parameters<typeof getLayerById>[1];
    target?: EsriHighlightTarget;
    options?: EsriHighlightOptions & { signal?: AbortSignal };
  }[]
) {
  // highlight each valid layer as specified
  const promisedMaybeHandles = specs.map(async ({ layerId, target, options: abortableOptions }) => {
    // find the layer view
    const [, layerView] = getLayerById(mapView, layerId);
    if (!layerView) {
      return null;
    }

    // construct a comparable WHERE clause (for the ability to query the highlighted features later)
    const targetQuery = constructComparableQuery(layerView, target);

    // if no target is specified, highlight all features in the layer
    if (target === undefined) {
      const handle = await highlightLayer(layerView, abortableOptions);
      return { handle, layerView, targetQuery };
    }

    // otherwise, highlight the specified features
    const handle = highlightLayerFeatures(layerView, target, abortableOptions);
    return { handle, layerView, targetQuery };
  });

  // resolve the promises and remove the nulls
  const handles = (await Promise.all(promisedMaybeHandles))
    .filter(notEmpty)
    .filter(requireKey('handle'));
  return handles;
}

/**
 * Converts a highlight target into a Query that can be used to query the same features.
 *
 * If the target cannot be converted, this function will return `undefined`.
 */
function constructComparableQuery(layerView: __esri.LayerView, target?: EsriHighlightTarget) {
  if (
    !('objectIdField' in layerView.layer) ||
    !layerView.layer.objectIdField ||
    typeof layerView.layer.objectIdField !== 'string'
  ) {
    return undefined;
  }

  if (!target) {
    const allFeaturesQuery = new Query({ where: '1=1' });
    return allFeaturesQuery;
  }

  // handle single id target
  if (typeof target === 'number' || typeof target === 'string') {
    return new Query({ where: `${layerView.layer.objectIdField} = ${target}` });
  }

  // handle array of ids target
  if (
    Array.isArray(target) &&
    target.every((t) => typeof t === 'number' || typeof t === 'string')
  ) {
    return new Query({ where: `${layerView.layer.objectIdField} IN (${toSqlList(target)})` });
  }

  // handle featureset target
  if (Array.isArray(target)) {
    const targetObjectIds = target.map((feature) => feature.getObjectId()).filter(notEmpty);
    if (targetObjectIds.length === 0) {
      return undefined;
    }
    return new Query({
      where: `${layerView.layer.objectIdField} IN (${toSqlList(targetObjectIds)})`,
    });
  }

  // handle single feature target
  const targetObjectId = target.getObjectId?.();
  if (!targetObjectId) {
    return undefined;
  }
  return new Query({ where: `${layerView.layer.objectIdField} = ${targetObjectId}` });
}

/**
 * Highlights specific features of a layer.
 *
 * If no features are specified, no highlighting is applied.
 */
function highlightLayerFeatures(
  layerView: __esri.LayerView,
  target: EsriHighlightTarget,
  options?: EsriHighlightOptions
) {
  // ensure that the layer view supports highlighting
  if (!('highlight' in layerView) || typeof layerView.highlight !== 'function') {
    console.warn(`LayerView of type ${layerView.layer.type} does not support highlighting.`);
    return null;
  }

  // do not attempt to highlight if there are no target features
  if ((Array.isArray(target) && target.length === 0) || (!Array.isArray(target) && !target)) {
    return null;
  }

  // return the highlight handle
  return layerView.highlight(target, options) as __esri.Handle;
}

/**
 * Highlights all features in a layer.
 */
async function highlightLayer(
  layerView: __esri.LayerView,
  options?: EsriHighlightOptions & { signal?: AbortSignal }
) {
  // ensure that the layer view supports highlighting
  if (!('highlight' in layerView) || typeof layerView.highlight !== 'function') {
    console.warn(`LayerView of type ${layerView.layer.type} does not support highlighting.`);
    return null;
  }
  const highlight: __esri.FeatureLayerView['highlight'] = layerView.highlight.bind(layerView);

  // ensure that the layer view supports querying features
  if (!('queryFeatures' in layerView) || typeof layerView.queryFeatures !== 'function') {
    console.warn(`LayerView of type ${layerView.layer.type} does not support querying features.`);
    return null;
  }
  const queryFeatures: __esri.FeatureLayerView['queryFeatures'] =
    layerView.queryFeatures.bind(layerView);

  // get the ids of all features in the layer, then highlight them, and then return the highlight handles
  return await queryFeatures(undefined, { signal: options?.signal }).then(({ features }) => {
    if (features.length === 0) {
      return null;
    }
    return highlight(features, options) as __esri.Handle;
  });
}
