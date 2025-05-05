import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router } from 'react-router';
import App from './App.tsx';

const mountElementId = document.currentScript?.getAttribute('mountid') || 'gcmd-root';
const mountElement = document.getElementById(mountElementId);

if (!mountElement) {
  throw new Error(`Mount element with ID "${mountElementId}" not found.`);
}

// attach a shadow DOM to the mount element
const shadowRoot = mountElement.attachShadow({ mode: 'open' });

// configure emotion to use the shadow DOM
const emotionCache = createCache({
  key: 'gcmd',
  container: shadowRoot,
});

// render the app into the shadow DOM
createRoot(shadowRoot).render(
  <StrictMode>
    <CacheProvider value={emotionCache}>
      <Router>
        <App />
      </Router>
    </CacheProvider>
  </StrictMode>
);
