import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { getReleaseMetadata } from './release-metadata.js';

const root = new URL('../', import.meta.url);
const json = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const [pkg, lock, manifest, changelog] = await Promise.all([
  json('package.json'), json('package-lock.json'), json('source/manifest.json'),
  readFile(new URL('CHANGELOG.md', root), 'utf8'),
]);
const metadata = getReleaseMetadata({
  version: pkg.version, lockVersion: lock.version, manifestVersion: manifest.version, changelog,
  tag: process.env.RELEASE_TAG || undefined,
});
const zip = await readFile(new URL('release.zip', root));
const output = new URL('artifacts/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output);
await writeFile(new URL(metadata.filename, output), zip);
await writeFile(new URL('SHA256SUMS', output), createHash('sha256').update(zip).digest('hex') + '  ' + metadata.filename + '\n');
await writeFile(new URL('release-notes.md', output), metadata.notes);
console.log('Prepared artifacts/' + metadata.filename + ', SHA256SUMS and bilingual release notes.');
