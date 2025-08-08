import AdmZip from 'adm-zip';
import { cp, readdir, readFile, rmdir, stat, unlink, writeFile } from 'fs/promises';
import { join as joinPath, resolve as resolvePath } from 'path';
import { promisify } from 'util';
import { deflate as _deflate } from 'zlib';
// import { deflate as _deflate } from 'pako';

const fileExtensionsToMove = ['.json', '.geojson', '.deflate', '.vectortiles'];
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

// delete current contents of public/data (except .gitkeep)
const files = await readdir(publicDataDir);
await Promise.all(
  files.map(async (file) => {
    if (file === '.gitkeep') {
      return;
    }
    const filePath = joinPath(publicDataDir, file);
    const isDirectory = (await stat(filePath)).isDirectory();
    if (isDirectory) {
      await rmdir(filePath, { recursive: true });
    } else {
      await unlink(filePath);
    }
  })
);

// copy approved files from data-pipeline/data to public/data
await cp(pipelineDataDir, publicDataDir, {
  recursive: true,
  force: true,
  dereference: true,
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

// recursively delete empty directories in public/data
await deleteEmptyDirectories(publicDataDir);

// compress JSON files in public/data
await deflateJsonFiles(publicDataDir);

// unzip .vectortiles files in public/data
await unzipVectorTiles(publicDataDir);

// build an index of areas and seasons
const areaNames = await buildAreaIndex(publicDataDir + '/replica');
if (areaNames.length) {
  await buildSeasonIndex(publicDataDir + '/replica/' + areaNames[0] + '/statistics');
}

if (!shouldLog) {
  console.log = originalConsoleLog;
}

console.log('Done copying and processing data');

async function deflate(data) {
  return promisify(_deflate)(JSON.stringify(data));
}

/**
 * Recursively deletes empty directories in the specified directory.
 * This function will traverse the directory structure and remove any
 * directories that do not contain any files or subdirectories of files.
 *
 * @param {string} directory
 */
async function deleteEmptyDirectories(directory) {
  const items = await readdir(directory);
  const promises = items.map(async (item) => {
    const itemPath = joinPath(directory, item);
    const stats = await stat(itemPath);
    if (stats.isDirectory()) {
      await deleteEmptyDirectories(itemPath);
      const subItems = await readdir(itemPath);
      if (subItems.length === 0) {
        await rmdir(itemPath);
        console.log(`Deleted empty directory: ${itemPath}`);
      }
    }
  });
  await Promise.all(promises);
}

/**
 * Deflates JSON files in a directory and its subdirectories.
 *
 * @param {string} directory
 */
async function deflateJsonFiles(directory) {
  const fileNames = await readdir(directory);

  for await (const fileName of fileNames) {
    try {
      const filePath = joinPath(directory, fileName);
      const deflatedFilePath = filePath
        .replace('.json', '.json.deflate')
        .replace('.geojson', '.geojson.deflate');
      const stats = await stat(filePath);

      if (stats.isDirectory()) {
        await deflateJsonFiles(filePath);
        continue;
      }

      if (
        !['.json', '.geojson'].some((ext) => fileName.endsWith(ext)) ||
        directory.includes('VectorTileServer')
      ) {
        continue;
      }

      const json = await readFile(filePath, 'utf8');
      const data = JSON.parse(json);

      const deflatedData = await deflate(data);
      await writeFile(deflatedFilePath, deflatedData).catch(console.error);
      await unlink(filePath); // delete the original file
      console.log(`Deflated JSON file: ${deflatedFilePath}`);
    } catch (error) {
      console.error(`Error processing file ${fileName} in directory ${directory}:`, error);
    }
  }
}

/**
 * Recurisvely look for .vectortiles files in a directory and its subdirectories.
 *
 * If found, unzip them (they are zip files) and move them to the same directory.
 */
async function unzipVectorTiles(directory) {
  const fileNames = await readdir(directory);

  for await (const fileName of fileNames) {
    try {
      const filePath = joinPath(directory, fileName);
      const stats = await stat(filePath);

      if (stats.isDirectory()) {
        await unzipVectorTiles(filePath);
        continue;
      }

      if (!fileName.endsWith('.vectortiles')) {
        continue;
      }

      // extract to a folder with the same name as the file (without .vectortiles)
      const zip = new AdmZip(filePath);
      const unzipPath = filePath.replace('.vectortiles', '');
      zip.extractAllTo(unzipPath, true);

      // delete the original .vectortiles file
      await unlink(filePath);

      console.log(`Extracted vector tiles to: ${unzipPath}`);
    } catch (error) {
      console.error(`Error processing file ${fileName} in directory ${directory}:`, error);
    }
  }
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
  for await (const item of items.filter((item) => !!item)) {
    if (item.includes('.geojson') || item.includes('.json')) {
      seasonNames.push(
        item
          .replace('replica__', '')
          .split('__')[0]
          .replace('south_atlantic_', '')
          .replace('.geojson.deflate', '')
          .replace('.json.deflate', '')
          .split('_')
          .reverse()
          .join(':')
      );
    }
  }

  const uniqueSeasonNames = Array.from(new Set(seasonNames));

  // write the season quarter-year pairs to a text file
  const seasonIndex = uniqueSeasonNames.join('\n');
  const seasonIndexPath = joinPath(directory, '../../season_index.txt');
  await writeFile(seasonIndexPath, seasonIndex, 'utf8');
  console.log(`Season index written to: ${seasonIndexPath}`);
}
