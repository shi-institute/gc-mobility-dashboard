import { cp, readdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { join as joinPath, resolve as resolvePath } from 'path';
import { promisify } from 'util';
import { deflate as _deflate } from 'zlib';
// import { deflate as _deflate } from 'pako';

const fileExtensionsToMove = ['.json', '.geojson', '.deflate'];
const pipelineDataDir = resolvePath(import.meta.dirname, '../data-pipeline/data');
const publicDataDir = resolvePath(import.meta.dirname, './public/data');
const shouldLog = true;

console.log('Copying data-pipeline/data to frontend/public/data...');

/** @type {Console['log']} */
let originalConsoleLog;
if (!shouldLog) {
  originalConsoleLog = console.log;
  console.log = () => {};
}

await cp(pipelineDataDir, publicDataDir, {
  recursive: true,
  force: true,
  filter: (source, destination) => {
    // always copy directories
    const isDirectory = !source.split('/').pop().includes('.');
    if (isDirectory) {
      return true;
    }

    // only allow moving certain file types
    const isApprovedExtension = fileExtensionsToMove.some((ext) => source.endsWith(ext));
    if (!isApprovedExtension) {
      return false;
    }

    // only copy time series Census ACS 5-year data
    if (source.includes('census_acs_5year')) {
      return source.endsWith('time_series.json');
    }

    return true;
  },
});
await deflateJsonFiles(publicDataDir);
const areaNames = await buildAreaIndex(publicDataDir + '/replica');
if (areaNames.length) {
  await buildSeasonIndex(publicDataDir + '/replica/' + areaNames[0] + '/thursday_trip');
}

if (!shouldLog) {
  console.log = originalConsoleLog;
}

console.log('Done copying and processing data');

async function deflate(data) {
  return promisify(_deflate)(JSON.stringify(data));
}

/**
 * Deflates JSON files in a directory and its subdirectories.
 *
 * @param {string} directory
 */
async function deflateJsonFiles(directory) {
  const fileNames = await readdir(directory);

  const promises = fileNames.map(async (fileName) => {
    const filePath = joinPath(directory, fileName);
    const deflatedFilePath = filePath
      .replace('.json', '.json.deflate')
      .replace('.geojson', '.geojson.deflate');
    const stats = await stat(filePath);

    if (stats.isDirectory()) {
      await deflateJsonFiles(filePath);
      return;
    }

    if (!['.json', '.geojson'].some((ext) => fileName.endsWith(ext))) {
      return;
    }

    const json = await readFile(filePath, 'utf8');
    const data = JSON.parse(json);

    const deflatedData = await deflate(data);
    await writeFile(deflatedFilePath, deflatedData).catch(console.error);
    await unlink(filePath); // delete the original file
    console.log(`Deflated JSON file: ${deflatedFilePath}`);
  });

  await Promise.allSettled(promises);
}

/**
 * Builds an index of areas from the list of folder names in data/replica.
 *
 * @param {string} directory
 */
async function buildAreaIndex(directory) {
  console.log(`Building area index from directory: ${directory}`);
  const items = await readdir(directory);

  const areaNames = [];
  for await (const item of items) {
    const itemPath = joinPath(directory, item);
    const stats = await stat(itemPath);

    if (stats.isDirectory()) {
      areaNames.push(item);
    }
  }

  // write the area names to a text file
  const areaIndex = areaNames.join('\n');
  const areaIndexPath = joinPath(directory, 'area_index.txt');
  await writeFile(areaIndexPath, areaIndex, 'utf8');
  console.log(`Area index written to: ${areaIndexPath}`);

  return areaNames;
}

/**
 * Builds an index of seasons from the first area in data/replica.
 *
 * @param {string} directory
 */
async function buildSeasonIndex(directory) {
  console.log(`Building seasons index from directory: ${directory}`);
  const items = await readdir(directory);

  const seasonNames = [];
  for await (const item of items) {
    if (item.includes('.json')) {
      seasonNames.push(
        item
          .replace('south_atlantic_', '')
          .replace('_thursday_trip.json.deflate', '')
          .split('_')
          .reverse()
          .join(':')
      );
    }
  }

  // write the season quarter-year pairs to a text file
  const seasonIndex = seasonNames.join('\n');
  const seasonIndexPath = joinPath(directory, '../../season_index.txt');
  await writeFile(seasonIndexPath, seasonIndex, 'utf8');
  console.log(`Season index written to: ${seasonIndexPath}`);
}
