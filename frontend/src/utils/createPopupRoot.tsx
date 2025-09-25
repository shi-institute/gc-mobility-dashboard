import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { createRoot } from 'react-dom/client';

/**
 * Use this when rendering react components into a popup managed by the ArcGIS SDK.
 */
export function createPopupRoot(container: HTMLElement) {
  container.style.all = 'initial';

  const shadowElem = container.ownerDocument.createElement('div');
  container.appendChild(shadowElem);

  // const shadowRoot = shadowElem.attachShadow({ mode: 'open' });
  const emotionCache = createCache({
    key: 'gcmd-arcgis',
    container: shadowElem.ownerDocument.querySelector('#gcmd-root')?.shadowRoot ?? undefined,
  });

  const root = createRoot(shadowElem);

  return {
    render(children: React.ReactNode) {
      root.render(
        <CacheProvider value={emotionCache}>
          <link rel="stylesheet" href={new URL('../assets/theme.css', import.meta.url).href} />
          {children}
        </CacheProvider>
      );

      return container;
    },
    unmount() {
      root.unmount();
      if (shadowElem.parentNode) {
        shadowElem.parentNode.removeChild(shadowElem);
      }
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}
