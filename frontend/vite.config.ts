import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const buildUUID = crypto.randomUUID();

  return {
    define: {
      __GCMD_DATA_ORIGIN__: JSON.stringify(env.GCMD_DATA_ORIGIN || '.'),
      __GCMD_DATA_PATH__: JSON.stringify(env.GCMD_DATA_PATH ?? '/data'),
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
    build: {
      rollupOptions: {
        output: {
          // place all of the file for distribution in a unique folder for each build
          entryFileNames: `[name].js`,
          chunkFileNames: `${buildUUID}/assets/[name]-[hash].js`,
          assetFileNames: `${buildUUID}/assets/[name]-[hash].[ext]`,
        },
      },
    },
  };
});
