import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';

const files = unzipSync(new Uint8Array(await readFile(new URL('../release.zip', import.meta.url))));
const text = (path) => {
  assert.ok(files[path], 'Missing package file: ' + path);
  return new TextDecoder('utf-8', { fatal: true }).decode(files[path]);
};
const manifest = JSON.parse(text('manifest.json'));
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, version);
assert.match(version, /^\d{1,5}(\.\d{1,5}){0,3}$/);
assert.ok(version.split('.').every((part) => Number(part) <= 65535));
assert.ok(manifest.name.length > 0 && manifest.name.length <= 75);
assert.deepEqual(manifest.permissions ?? [], []);
assert.deepEqual(manifest.host_permissions, ['https://api.boosty.to/*']);
assert.equal(manifest.background.type, 'module');
assert.equal(manifest.background.service_worker, 'background/background.js');
assert.equal(manifest.content_scripts.length, 1);
assert.deepEqual(manifest.content_scripts[0].matches, ['https://boosty.to/*']);
assert.equal(manifest.content_scripts[0].world ?? 'ISOLATED', 'ISOLATED');
assert.equal(manifest.externally_connectable, undefined);
assert.equal(manifest.web_accessible_resources, undefined);
const csp = manifest.content_security_policy.extension_pages;
for (const rule of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "connect-src https://api.boosty.to"]) {
  assert.ok(csp.split(';').map((part) => part.trim()).includes(rule), 'Missing CSP directive: ' + rule);
}
assert.doesNotMatch(csp, /unsafe-|https?:[^;]*script|data:/);
const references = [
  manifest.background.service_worker,
  ...manifest.content_scripts.flatMap((entry) => [...entry.js, ...entry.css]),
  ...Object.values(manifest.icons),
];
for (const path of references) assert.ok(files[path], 'Missing manifest reference: ' + path);
const icon = Buffer.from(files[manifest.icons['128']]);
assert.equal(icon.toString('hex', 0, 8), '89504e470d0a1a0a');
assert.equal(icon.readUInt32BE(16), 128);
assert.equal(icon.readUInt32BE(20), 128);

let localeKeys;
let listingKeys;
for (const path of Object.keys(files).filter((path) => /^_locales\/[^/]+\/messages\.json$/.test(path))) {
  const messages = JSON.parse(text(path));
  const keys = Object.keys(messages).sort();
  if (localeKeys) assert.deepEqual(keys, localeKeys, 'Locale keys must match');
  localeKeys = keys;
  for (const entry of Object.values(messages)) assert.ok(typeof entry.message === 'string' && entry.message.length > 0);
  assert.ok(messages.description.message.length <= 132, 'Description exceeds 132 characters');
  for (const key of [
    'extension_notice_title', 'privacy_notice', 'load_video_links', 'loading_video_links',
    'retry_video_links', 'video_links_unavailable', 'video_quality', 'download_video',
    'download_preview', 'download_quality',
  ]) {
    assert.ok(messages[key], path + ' is missing ' + key);
  }
  const locale = path.split('/')[1];
  const listing = JSON.parse(await readFile(new URL('../store/' + locale + '/listing.json', import.meta.url), 'utf8'));
  if (listingKeys) assert.deepEqual(Object.keys(listing).sort(), listingKeys, 'Store locale fields must match');
  listingKeys = Object.keys(listing).sort();
  assert.equal(listing.name, manifest.name);
  assert.equal(listing.short_description, messages.description.message);
  for (const key of ['description', 'single_purpose', 'host_permission_justification']) assert.ok(listing[key]?.trim());
  assert.equal(listing.uses_remote_code, false);
  assert.match(listing.privacy_policy_url, /^https:\/\//);
  const screenshot = Buffer.from(await readFile(new URL('../store/' + locale + '/' + listing.screenshot, import.meta.url)));
  assert.equal(screenshot.readUInt32BE(16), 1280);
  assert.equal(screenshot.readUInt32BE(20), 800);
}
assert.ok(files['_locales/' + manifest.default_locale + '/messages.json']);
const permittedFiles = /^(manifest\.json|LICENSE|assets\/icon(?:24)?\.png|(?:background\/background|content\/content)\.js|content\/content\.css|_locales\/(?:en|ru)\/messages\.json)$/;
assert.ok(files.LICENSE, 'MIT license must be included');
for (const path of Object.keys(files)) {
  assert.match(path, permittedFiles, 'Unexpected packaged file: ' + path);
  if (!path.endsWith('.js')) continue;
  const code = text(path);
  assert.doesNotMatch(code, /\beval\s*\(|\bnew\s+Function\s*\(|\bimportScripts\s*\(|\bimport\s*\(/, 'Dynamic code execution: ' + path);
  assert.doesNotMatch(code, /sourceMappingURL|unsafe-eval|chrome\.(?:storage|cookies|history|notifications|alarms)\b/, 'Unexpected runtime capability: ' + path);
}
console.log('Package checks passed: MV3, narrow permissions, CSP, local code, versions, locales, PNG and ZIP structure.');
