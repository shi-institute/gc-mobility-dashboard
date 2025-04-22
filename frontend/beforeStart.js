import { cp, readdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { join as joinPath, resolve as resolvePath } from 'path';
import { promisify } from 'util';
import { deflate as _deflate } from 'zlib';
// import { deflate as _deflate } from 'pako';

const fileExtensionsToRemove = ['.tmp', '.variables'];
const pipelineDataDir = resolvePath(import.meta.dirname, '../data-pipeline/data');
const publicDataDir = resolvePath(import.meta.dirname, './public/data');
const shouldLog = false;

console.log('Copying data-pipeline/data to frontend/public/data...');

/** @type {Console['log']} */
let originalConsoleLog;
if (!shouldLog) {
  originalConsoleLog = console.log;
  console.log = () => {};
}

await cp(pipelineDataDir, publicDataDir, { recursive: true, force: true });
await removeFileTypes(publicDataDir, fileExtensionsToRemove);
await discardNonTimeSeriesACS5(publicDataDir + '/census_acs_5year');
await deflateJsonFiles(publicDataDir);

if (!shouldLog) {
  console.log = originalConsoleLog;
}

console.log('Done copying and processing data');

/**
 * Removes files with specified extensions from a directory and its subdirectories.
 *
 * @param {string} directory
 * @param {string[]} extensions
 */
async function removeFileTypes(directory, extensions) {
  const fileNames = await readdir(directory);

  const promises = fileNames.map(async (fileName) => {
    const filePath = joinPath(directory, fileName);
    const stats = await stat(filePath);

    if (stats.isDirectory()) {
      await removeFileTypes(filePath, extensions);
      return;
    }

    if (extensions.some((ext) => fileName.endsWith(ext))) {
      await unlink(filePath);
      console.log(`Deleted file: ${filePath}`);
      return;
    }
  });

  await Promise.allSettled(promises);
}

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
 * Deletes all files in a directory and subdirectories
 * except for the 'time_series.json' file.
 *
 * @param {string} directory
 */
async function discardNonTimeSeriesACS5(directory) {
  const fileNames = await readdir(directory);

  const promises = fileNames.map(async (fileName) => {
    const filePath = joinPath(directory, fileName);
    const stats = await stat(filePath);

    if (stats.isDirectory()) {
      await discardNonTimeSeriesACS5(filePath);
      return;
    }

    if (fileName === 'time_series.json') {
      return;
    }

    await unlink(filePath);
    console.log(`Deleted file: ${filePath}`);
  });

  await Promise.allSettled(promises);
}
