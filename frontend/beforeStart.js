import { cp, mkdir, readdir, rm, stat, unlink } from 'fs/promises';
import { join as joinPath, resolve as resolvePath } from 'path';

const pipelineDataDir = resolvePath(import.meta.dirname, '../data-pipeline/data');
const publicDataDir = resolvePath(import.meta.dirname, './public/data');

console.log('Copying data-pipeline/data to frontend/public/data...');

// delete current contents of public/data (except .gitkeep)
const filesToDelete = (await readdir(publicDataDir)).filter((file) => file !== '.gitkeep');
let deletedCount = 0;

await Promise.all(
  filesToDelete.map(async (file) => {
    const filePath = joinPath(publicDataDir, file);
    const isDirectory = (await stat(filePath)).isDirectory();
    if (isDirectory) {
      await rm(filePath, { recursive: true });
    } else {
      await unlink(filePath);
    }
    deletedCount++;
    const percent = ((deletedCount / filesToDelete.length) * 100).toFixed(0);
    process.stdout.write(`\r\x1b[KDeleting old files: ${percent}%`);
  })
);
process.stdout.write('\n'); // new line after completion

// list files to copy so we can show progress
process.stdout.write('Identifying files to copy...\r');
const filesToCopy = await getFilesToCopy(joinPath(pipelineDataDir, '__public'), publicDataDir);
process.stdout.write(`Found ${filesToCopy.length} files to copy.`);
process.stdout.write('\n');

// copy files from data-pipeline/data/__public to frontend/public/data
for (const item of filesToCopy) {
  const index = filesToCopy.indexOf(item) + 1;
  const percent = ((index / filesToCopy.length) * 100).toFixed(0);
  process.stdout.write(
    `\r\x1b[KCopying files: ${percent}% (${index}/${filesToCopy.length}) (${item.source})`
  );

  if (item.isDirectory) {
    await rm(item.destination, { recursive: true, force: true }).catch(() => {}); // ensure destination directory is clean/creatable
    await mkdir(item.destination, { recursive: true });
  } else {
    await cp(item.source, item.destination, { force: true });
  }
}
process.stdout.write('\n'); // new line after completion

console.log('Copy complete.');

/**
 * @param {string} sourceDir
 * @param {string} destDir
 * @returns {Promise<Array<{source: string; destination: string; isDirectory: boolean;}>>}
 */
async function getFilesToCopy(sourceDir, destDir) {
  let files = [];
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = joinPath(sourceDir, entry.name);
    const destinationPath = joinPath(destDir, entry.name);

    if (entry.isDirectory()) {
      files.push({
        source: sourcePath,
        destination: destinationPath,
        isDirectory: true,
      });
      files = files.concat(await getFilesToCopy(sourcePath, destinationPath));
    } else {
      files.push({
        source: sourcePath,
        destination: destinationPath,
        isDirectory: false,
      });
    }
  }
  return files;
}
