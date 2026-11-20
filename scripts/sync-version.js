import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const { version } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const path = new URL('source/manifest.json', root);
const manifest = JSON.parse(await readFile(path, 'utf8'));
await writeFile(path, JSON.stringify({ ...manifest, version }, null, 2) + '\n');
console.log('Manifest version: ' + version);
