import Query from '@arcgis/core/rest/support/Query.js';
import { isEsriGraphic } from '..';
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
    target?: EsriHighlightTarget | { field: string; values: EsriHighlightTarget };
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
    const resolvedTarget = await (async (): Promise<EsriHighlightTarget | null> => {
      // if the target is is one or more objectIds, we can use it directly
      if (
        Array.isArray(target) ||
        isEsriGraphic(target) ||
        typeof target === 'number' ||
        typeof target === 'string'
      ) {
        return target;
      }

      // otherwise, we need to resolve the objectIds by querying the layer for
      // the specified field and values

      const field = target.field;
      const values = target.values;
      const query = constructComparableQuery(layerView, { field, values });
      if (!query) {
        return null;
      }

      // ensure that the layer view supports querying features
      if (!('queryFeatures' in layerView) || typeof layerView.queryFeatures !== 'function') {
        console.warn(
          `LayerView of type ${layerView.layer.type} does not support querying features.`
        );
        return null;
      }
      const queryFeatures: __esri.FeatureLayerView['queryFeatures'] =
        layerView.queryFeatures.bind(layerView);

      const { features } = await queryFeatures(query, { signal: abortableOptions?.signal });
      const featureIds = features.map((feature) => feature.getObjectId()).filter(notEmpty);

      if (
        !featureIds.every((id) => typeof id === 'number') &&
        !featureIds.every((id) => typeof id === 'string')
      ) {
        console.warn(
          `LayerView of type ${layerView.layer.type} returned features with mixed or invalid objectId types.`
        );
        return null;
      }

      return featureIds;
    })();
    if (!resolvedTarget) {
      return null;
    }
    const handle = highlightLayerFeatures(layerView, resolvedTarget, abortableOptions);
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
function constructComparableQuery(
  layerView: __esri.LayerView,
  target?: EsriHighlightTarget | { field: string; values: EsriHighlightTarget }
) {
  // Prefer manually specified field. If the field is not specified,
  // use the layer's objectIdField if it exists.
  let field =
    typeof target === 'object' && 'field' in target && typeof target.field === 'string'
      ? target.field
      : undefined;
  if (!field) {
    field =
      'objectIdField' in layerView.layer && typeof layerView.layer.objectIdField === 'string'
        ? layerView.layer.objectIdField
        : undefined;
  }
  if (!field) {
    return undefined;
  }

  // Prefer manually specified values. If the values are not specified, use the target directly.
  const resolvedTarget =
    typeof target === 'object' && 'values' in target && Array.isArray(target.values)
      ? target.values
      : (target as EsriHighlightTarget | undefined);

  if (!resolvedTarget) {
    const allFeaturesQuery = new Query({ where: '1=1' });
    return allFeaturesQuery;
  }

  // handle single id target
  if (typeof resolvedTarget === 'number' || typeof resolvedTarget === 'string') {
    return new Query({ where: `${field} = ${resolvedTarget}` });
  }

  // handle array of ids target
  if (
    Array.isArray(resolvedTarget) &&
    (resolvedTarget.every((t) => typeof t === 'number') ||
      resolvedTarget.every((t) => typeof t === 'string'))
  ) {
    return new Query({ where: `${field} IN (${toSqlList(resolvedTarget)})` });
  }

  // handle featureset target
  if (Array.isArray(resolvedTarget) && resolvedTarget.every((t) => isEsriGraphic(t))) {
    const targetObjectIds = resolvedTarget.map((feature) => feature.getObjectId()).filter(notEmpty);
    if (targetObjectIds.length === 0) {
      return undefined;
    }
    return new Query({ where: `${field} IN (${toSqlList(targetObjectIds)})` });
  }

  // handle single feature target
  if (isEsriGraphic(resolvedTarget)) {
    const targetObjectId = resolvedTarget.getObjectId?.();
    if (!targetObjectId) {
      return undefined;
    }
    return new Query({ where: `${field} = ${targetObjectId}` });
  }
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
