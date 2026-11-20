import assert from 'node:assert/strict';
import test from 'node:test';
import { createVideoLoader } from '../source/global/boostyApi.js';

const metadata = { type: 'post', blogName: 'author', id: 'post-id' };
const block = {
  type: 'ok_video',
  preview: 'https://images.boosty.to/image/video-id',
  playerUrls: [{ type: 'high', url: 'https://video.example/720.mp4' }],
};
const response = (data = [block]) => ({ ok: true, json: async () => ({ data }) });

test('API filters video blocks and sends credentials only to the Boosty API', async () => {
  const calls = [];
  const load = createVideoLoader(async (...args) => { calls.push(args); return response([
    { type: 'text', content: 'text' }, null, block, { type: 'ok_video' },
  ]); });
  const videos = await load(metadata, 'session-token');
  assert.deepEqual(videos, [{
    videoId: 'video-id', videoUrls: block.playerUrls, previewUrl: block.preview,
  }]);
  assert.equal(calls[0][0], 'https://api.boosty.to/v1/blog/author/post/post-id?component_limit=0');
  assert.deepEqual(calls[0][1].headers, { Authorization: 'Bearer session-token' });
  assert.equal(calls[0][1].credentials, 'omit');
  assert.equal(calls[0][1].redirect, 'error');
  assert.ok(calls[0][1].signal instanceof AbortSignal);
});

test('concurrent players share a request; cache expires and is isolated by session', async () => {
  let calls = 0;
  let clock = 0;
  const load = createVideoLoader(async () => { calls++; return response(); }, () => clock);
  await Promise.all([load(metadata, 'one'), load(metadata, 'one')]);
  assert.equal(calls, 1);
  await load(metadata, 'one');
  assert.equal(calls, 1);
  await load(metadata, 'two');
  assert.equal(calls, 2);
  clock = 300001;
  await load(metadata, 'one');
  assert.equal(calls, 3);
});

test('cache is bounded', async () => {
  let calls = 0;
  const load = createVideoLoader(async () => { calls++; return response(); });
  for (let index = 0; index < 51; index++) await load({ ...metadata, id: String(index) }, null);
  await load({ ...metadata, id: '0' }, null);
  assert.equal(calls, 52);
});

test('HTTP, malformed JSON and network failures do not poison retries', async () => {
  for (const fail of [
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ error: 'bad' }) }),
    async () => { throw new Error('network down'); },
    async () => ({ ok: true, json: async () => { throw new SyntaxError('bad json'); } }),
  ]) {
    let calls = 0;
    const load = createVideoLoader(async () => ++calls === 1 ? fail() : response());
    await assert.rejects(load(metadata, null));
    assert.equal((await load(metadata, null)).length, 1);
    assert.equal(calls, 2);
  }
});

test('invalid requests are rejected before fetch', async () => {
  const load = createVideoLoader(() => assert.fail('must not fetch'));
  await assert.rejects(load({ ...metadata, blogName: '../private' }, 'token'));
  await assert.rejects(load(metadata, { token: 'invalid' }));
});

test('dialog content is flattened and public requests omit authorization', async () => {
  const load = createVideoLoader(async (url, options) => {
    assert.match(url, /\/dialog\/123\/message\/\?limit=300&reverse=true&offset=/);
    assert.deepEqual(options.headers, {});
    return response([{ data: [block] }, null, { data: [{ type: 'text' }] }]);
  });
  assert.equal((await load({ type: 'dialog', id: '123' }, null)).length, 1);
});
