import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  define: {
    __GCMD_DATA_ORIGIN__: JSON.stringify(process.env.GCMD_DATA_ORIGIN || '.'),
    __GCMD_DATA_PATH__: JSON.stringify(process.env.GCMD_DATA_PATH ?? '/data'),
  },
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
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/public/data/**'],
    },
  },
});
