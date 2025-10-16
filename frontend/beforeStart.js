import { cp, readdir, rm, stat, unlink } from 'fs/promises';
import { join as joinPath, resolve as resolvePath } from 'path';

const pipelineDataDir = resolvePath(import.meta.dirname, '../data-pipeline/data');
const publicDataDir = resolvePath(import.meta.dirname, './public/data');

console.log('Copying data-pipeline/data to frontend/public/data...');

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
      await rm(filePath, { recursive: true });
    } else {
      await unlink(filePath);
    }
  })
);

// copy data-pipeline/data/__public to frontend/public/data
await cp(joinPath(pipelineDataDir, '__public'), publicDataDir, {
  recursive: true,
  force: true,
  dereference: true,
});

console.log('Copy complete.');
