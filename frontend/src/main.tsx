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

// render the app into the shadow DOM
createRoot(shadowRoot).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>
);
