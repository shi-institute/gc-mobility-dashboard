import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: [
          [
            '@emotion/babel-plugin',
            {
              sourceMap: true,
              autoLabel: 'always',
              labelFormat: '-[dirname]-[local]',
              cssPropOptimization: true,
            },
          ],
        ],
      },
    }),
  ],
  appType: 'spa',
  base: './',
});
