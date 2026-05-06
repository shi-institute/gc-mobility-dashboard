/**
 * Provides access to known attributes on the root element of the app.
 *
 * These attributes are consumer-provided options that control how the
 * app behaves.
 */
export function getRootAttributes() {
  const rootElement = document.getElementById('gcmd-root');

  const homePathAttrValue = rootElement?.getAttribute('data-home-path') || undefined;
  const homePathAdapted = ensureTrailingHashSlash(homePathAttrValue);
  const homePath =
    homePathAdapted === './#/'
      ? window.location.pathname + window.location.search + '#/'
      : homePathAdapted; // for data-home-path=".", resolve to current path

  const helpPathAttrValue = rootElement?.getAttribute('data-help-path') || undefined;
  const helpPathAdapted = ensureTrailingHashSlash(helpPathAttrValue);
  const helpPath =
    helpPathAdapted === './#/'
      ? window.location.pathname + window.location.search + '#/'
      : helpPathAdapted; // for data-help-path=".", resolve to current path

  const dataOriginAttrValue = rootElement?.getAttribute('data-origin') || __GCMD_DATA_ORIGIN__;
  const dataPathAttrValue = rootElement?.getAttribute('data-path') || __GCMD_DATA_PATH__;

  return {
    homePath,
    externalFAQsPath: helpPath,
    dataOrigin: dataOriginAttrValue,
    dataPath: dataPathAttrValue,
  };
}

function ensureTrailingHashSlash(
  path: string | undefined
): `${string}/#/` | `${string}#/` | undefined {
  if (!path) return undefined;

  const hasQuery = path.includes('?');
  const marker = hasQuery ? '#/' : '/#/';
  const splitOn = hasQuery ? '#/' : '/#/';

  if (path.endsWith(marker)) {
    return path as `${string}#/` | `${string}/#/`;
  }

  if (path.endsWith(marker.slice(0, -1))) {
    return `${path}/` as `${string}#/` | `${string}/#/`;
  }

  if (path.includes(splitOn)) {
    return `${path.split(splitOn)[0]}${marker}` as `${string}#/` | `${string}/#/`;
  }

  if (hasQuery && path.includes('#')) {
    return `${path.split('#')[0]}#/` as `${string}#/`;
  }

  return `${path}${marker}` as `${string}#/` | `${string}/#/`;
}
