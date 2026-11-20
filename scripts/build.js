import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const manifest = JSON.parse(await readFile('source/manifest.json', 'utf8'));
await rm('distribution', { recursive: true, force: true });
await mkdir('distribution', { recursive: true });
await build({
  entryPoints: ['source/content/content.js', 'source/background/background.js'],
  outbase: 'source',
  outdir: 'distribution',
  bundle: true,
  format: 'iife',
  target: 'chrome109',
  legalComments: 'none',
});
await cp('source/content/content.css', 'distribution/content/content.css');
await cp('source/assets', 'distribution/assets', { recursive: true });
await cp('source/_locales', 'distribution/_locales', { recursive: true });
await cp('LICENSE', 'distribution/LICENSE');
await writeFile('distribution/manifest.json', JSON.stringify({ ...manifest, version }, null, 2) + '\n');
console.log('Built More Boosty ' + version + ' in distribution/');
