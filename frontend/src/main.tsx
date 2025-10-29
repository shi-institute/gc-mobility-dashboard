import { SourceHttp } from '@chunkd/source-http';
import { Cotar } from '@cotar/core';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import 'groupby-polyfill/lib/polyfill.js';
import { inflate } from 'pako';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router } from 'react-router';
import App from './App.tsx';

const mountElementId = 'gcmd-root';
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

// Override the global fetch function to intercept requests for files inside .tar files
// and serve them using the Cotar library.
// This allows us to treat .tar files like file systems and only fetch the files we need
// instead of downloading the entire .tar file.
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let url = typeof input === 'string' || input instanceof URL ? input : input.url;
  if (typeof url === 'string') {
    url = new URL(url, window.location.href);
  }

  // intercept requests for contents inside .tar files,
  // assuming that they are cloud-optimized tar files
  if (
    url.pathname.includes('.tar') &&
    !url.pathname.endsWith('.tar.index') &&
    !url.pathname.endsWith('.tar')
  ) {
    // separate the path to the .tar file and the path inside the .tar
    const parts = url.pathname.split('/').filter(Boolean);
    const tarExtensionIndex = parts.findIndex((part) => part.endsWith('.tar'));
    if (tarExtensionIndex <= 0 || tarExtensionIndex >= parts.length) {
      throw new Error('Invalid .tar URL structure.', {
        cause: { href: url.href, parts, tarExtensionIndex },
      });
    }
    const tarPathname = parts.slice(0, tarExtensionIndex + 1).join('/');
    const filePathInsideTar = parts.slice(tarExtensionIndex + 1).join('/');

    // create a Cotar instance for the .tar file that can fetch specific files
    const tarUrl = new URL(url);
    tarUrl.pathname = tarPathname;
    tarUrl.searchParams.set('__path', filePathInsideTar);
    const tarSource = new SourceHttp(tarUrl.href);
    const tarIndexUrl = new URL(tarUrl.href);
    tarIndexUrl.pathname += '.index';
    tarIndexUrl.search = '';
    const tarIndexSource = new SourceHttp(tarIndexUrl.href);

    // fetch the specific file from the .tar and return it as a Response
    return Cotar.fromTarIndex(tarSource, tarIndexSource)
      .then(async (cotar) => {
        return cotar
          .get(filePathInsideTar)
          .then((arrayBuffer) => {
            if (!arrayBuffer) {
              return new Response(null, { status: 404, statusText: 'Not Found' });
            }

            // if the file is gzipped, decompress it before returning
            // since the browser would normally do this automatically
            // if the server set the right headers and it was not in
            // the .tar file
            const isGzipped = filePathInsideTar.endsWith('.gz');
            if (isGzipped) {
              const inflatedUint8Array = inflate(arrayBuffer);
              const inflatedArrayBuffer = new Uint8Array(inflatedUint8Array).buffer;
              return new Response(inflatedArrayBuffer, { status: 200, statusText: 'OK' });
            }

            return new Response(arrayBuffer, { status: 200, statusText: 'OK' });
          })
          .catch((error) => {
            console.log('Error fetching from .tar:', error);
            return new Response(error, { status: 500, statusText: 'Internal Server Error' });
          });
      })
      .catch((error) => {
        if (error.message.includes('invalid magic found')) {
          return new Response('Not a valid .tar file', { status: 404, statusText: 'Not Found' });
        }
        console.log('Error loading .tar index:', error);
        return new Response(error, { status: 500, statusText: 'Internal Server Error' });
      });
  }

  return originalFetch(input, init);
};

// render the app into the shadow DOM
createRoot(shadowRoot).render(
  <StrictMode>
    <link rel="stylesheet" href={new URL('./assets/theme.css', import.meta.url).href} />

    <CacheProvider value={emotionCache}>
      <Router>
        <App />
      </Router>
    </CacheProvider>
  </StrictMode>
);
