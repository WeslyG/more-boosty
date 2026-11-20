import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const files = {};
const collect = async (path = '') => {
  const entries = await readdir('distribution/' + path, { withFileTypes: true });
  entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  for (const entry of entries) {
    const name = path + entry.name;
    if (entry.isDirectory()) await collect(name + '/');
    else files[name] = new Uint8Array(await readFile('distribution/' + name));
  }
};
await collect();
await writeFile('release.zip', zipSync(files, { mtime: new Date(1980, 0, 1) }));
console.log('Created release.zip');
