# Greenville Connects Mobility Dashboard Frontend

This directory contains the frontend code for the Greenville Connects Mobility Dashboard (GCMD) project. The frontend is built using Vite and React and is responsible for rendering the user interface and handling user interactions.

## Building

To build the frontend, ensure you have Node.js and npm installed. Then, run the following commands in the `frontend` directory:

```bash
npm install
npm run build
```

This will create a production-ready build of the frontend in the `dist` directory, including an `index.html` file and all necessary assets. Generated assets are placed in a unique folder identified by a UUID to avoid caching issues.

## Injecting into an existing webpage

The frontend operates entirely within a single HTML shadow root, which allows it to be embedded into an existing webpage without interfering with the host page's styles or scripts. To inject the frontend into an existing webpage, you can add the following HTML snippet to the host page:

```html
<div id="gcmd-root"></div>
<script type="module" src="path/to/frontend/dist/index.js"></script>
```

Replace `path/to/frontend/dist/index.js` with the actual path to the built frontend JavaScript entrypoint file. The file is located inside the `dist` directory created during the build process.

### Showing a loading indicator

To provide a better user experience while the frontend is loading, you can add a loading indicator inside the `gcmd-root` div. This indicator will be displayed until the frontend has fully loaded and rendered its content.

<details>
<summary>Show example loading indicator code</summary>

```html
<div id="gcmd-root">
  <!-- you can include a loading indicator that will appear while the dashboard javascript downloads -->
  <div class="loading-dashboard-indicator">
    <svg width="32" height="32" viewBox="0 0 16 16" role="status">
      <circle cx="50%" cy="50%" r="7" strokeDasharray="3" />
    </svg>
    Loading dashboard
  </div>
</div>
<script type="module" src="path/to/frontend/dist/index.js"></script>

<style>
  .loading-dashboard-indicator {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    font-size: 1rem;
    font-weight: 500;
  }
  .loading-dashboard-indicator svg circle {
    fill: none;
    stroke: #3d9356;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-dasharray: 43.97;
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
    transition: all var(--wui-control-normal-duration) linear;
    animation: progress-ring-animation 2s linear infinite;
  }
  @keyframes progress-ring-animation {
    0% {
      stroke-dasharray: 0.01px 43.97px;
      transform: rotate(0);
    }

    50% {
      stroke-dasharray: 21.99px 21.99px;
      transform: rotate(450deg);
    }

    100% {
      stroke-dasharray: 0.01px 43.97px;
      transform: rotate(3turn);
    }
  }
</style>
```

</details>

\
A functional example can be seeing at https://jsfiddle.net/Jack_Buehner/75xsnbac/22/.

## Environment variables

The frontend uses environment variables to configure certain aspects of its behavior. These variables can be set in a `.env` file in the `frontend` directory. The following variables are used:

- `GCMD_DATA_ORIGIN`: The base URL where the GCMD data is hosted. Defaults to the same origin as the frontend (`"."`)
- `GCMD_DATA_PATH`: The path to the GCMD data on the server. Defaults to the data directory at the same path as the frontend. (`/data`)

If you plan to deploy the data to a different location than the built version of the frontend, you will need to set these variables accordingly. For example, if you are hosting the data at https://example.com/data/greenville-connects-mobility-dashboard/pipeline-output, you would set:

```
GCMD_DATA_ORIGIN=https://example.com
GCMD_DATA_PATH=/data/greenville-connects-mobility-dashboard/pipeline-output
```

If you are injecting the frontend into an existing webpage and need to override the data path, you can do so by setting the 'data-origin`and`data-path`attributes on the`gcmd-root` div:

```html
<div
  id="gcmd-root"
  data-origin="https://example.com"
  data-path="/data/greenville-connects-mobility-dashboard/pipeline-output"
></div>
```

## Important cache considerations

The `index.html` and `index.js` files must not be cached by browsers or CDNs. These files contain references to the unique asset paths generated during the build process. If these files are cached, users may receive outdated references to assets that no longer exist, leading to broken functionality. To prevent caching issues, ensure that your server or CDN is configured to set appropriate cache-control headers for these files, such as `Cache-Control: no-cache` or `Cache-Control: max-age=0, must-revalidate`.

On AWS, you can set these headers when uploading the files to S3. Make sure you only set these headers for the `index.html` and `index.js` files, and not for the asset files, which can be cached for longer periods to improve performance and costs.

> [!CAUTION]
> Failure to set the correct cache-control headers for these files may result in broken functionality for users that cannot be easily resolved without clearing their browser cache.
> **Do not forget to set these headers.**
