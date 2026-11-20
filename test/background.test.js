import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const result = await build({
  entryPoints: ['source/background/background.js'], bundle: true, write: false, format: 'iife',
});
const script = result.outputFiles[0].text;

test('message handler rejects foreign senders and returns errors through the response channel', async () => {
  let listener;
  let calls = 0;
  runInNewContext(script, {
    chrome: { runtime: { id: 'extension-id', onMessage: { addListener: (fn) => { listener = fn; } } } },
    fetch: async () => { calls++; throw new Error('unavailable'); },
    URL, AbortSignal,
  });
  const sender = { id: 'extension-id', url: 'https://boosty.to/author/posts/id' };
  const message = { action: 'retrieveContentData', metadata: { type: 'post', blogName: 'author', id: 'id' } };
  for (const foreign of [{ ...sender, id: 'other' }, { ...sender, url: 'https://boosty.to.evil.example/' }, {}]) {
    assert.equal(listener(message, foreign, () => assert.fail('no response expected')), undefined);
  }
  assert.equal(listener({ action: 'saveTimestamp' }, sender, () => assert.fail('no response expected')), undefined);
  const response = await new Promise((resolve) => {
    assert.equal(listener(message, sender, resolve), true);
  });
  assert.equal(response.error, 'Could not load video links');
  assert.equal(calls, 1);
});
