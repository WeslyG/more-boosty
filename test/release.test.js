import assert from 'node:assert/strict';
import test from 'node:test';
import { checkCommitMessage } from '../scripts/check-commit.js';
import { getReleaseMetadata } from '../scripts/release-metadata.js';

const changelog = '# Changes\n\n## [Unreleased]\n\n### Русский\n\n- Future work.\n\n### English\n\n- Future work.\n\n## [0.1.0] - 2026-11-20\n\n### Русский\n\n- Готовые изменения.\n\n### English\n\n- Ready changes.\n\n## [0.0.1] - 2026-01-01\n\n- Old release.\n';
const metadata = {
  version: '0.1.0', manifestVersion: '0.1.0', lockVersion: '0.1.0', changelog,
};

test('commit convention supports scopes, breaking changes and bodies', () => {
  for (const message of [
    'feat(ui): add preview links', 'fix: handle missing players',
    'refactor(api)!: change the response format', 'docs: update instructions\n\nExplain why.',
    'ci(release): publish verified archives',
  ]) assert.doesNotThrow(() => checkCommitMessage(message));
  assert.doesNotThrow(() => checkCommitMessage("Merge branch 'main'", { allowMerge: true }));
});

test('invalid PR titles and commit headers are rejected', () => {
  for (const message of [
    '', 'update readme', 'Fix: handle players', 'fix(ui): ', 'fix(ui): description ',
    'fix(ui) add links', 'feat: ' + 'x'.repeat(95), "Merge branch 'main'",
  ]) assert.throws(() => checkCommitMessage(message));
  assert.doesNotThrow(() => checkCommitMessage('fix: ' + 'x'.repeat(95)));
});

test('release notes include only the exact version in both languages', () => {
  const release = getReleaseMetadata(metadata);
  assert.equal(release.tag, 'v0.1.0');
  assert.equal(release.filename, 'more-boosty-v0.1.0.zip');
  assert.match(release.notes, /Готовые изменения/);
  assert.match(release.notes, /Ready changes/);
  assert.doesNotMatch(release.notes, /Future work|Old release/);
  assert.deepEqual(getReleaseMetadata({ ...metadata, changelog: changelog.replaceAll('\n', '\r\n') }), release);
});

test('release tag and all version sources must agree', () => {
  for (const input of [
    { tag: 'v0.2.0' }, { tag: 'v0.1.0; echo bad' }, { manifestVersion: '0.0.0' },
    { lockVersion: '0.0.0' }, { version: '0.1.0-beta.1' }, { version: '01.1.0' },
    { version: '65536.1.0' }, { version: '0.0.0' },
  ]) assert.throws(() => getReleaseMetadata({ ...metadata, ...input }));
});

test('missing, duplicate, undated or empty-language release notes stop publication', () => {
  for (const changed of [
    '', changelog.replace('0.1.0', '0.2.0'),
    changelog + '\n## [0.1.0] - 2026-11-20\n\n- Duplicate.',
    changelog.replace('## [0.1.0] - 2026-11-20', '## [0.1.0]'),
    changelog.replace('2026-11-20', '2026-02-30'),
    changelog.replace('### English\n\n- Ready changes.', '### English'),
    changelog.replace('### Русский\n\n- Готовые изменения.', '### Русский'),
  ]) assert.throws(() => getReleaseMetadata({ ...metadata, changelog: changed }));
});
