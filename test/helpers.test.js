import assert from 'node:assert/strict';
import test from 'node:test';
import { filterVideoUrls, isHttpsUrl, isValidMetadata, parseVideoId, postMetadata } from '../source/global/helpers.js';

test('quality links are safe, unique, sorted and include every supported quality', () => {
  assert.deepEqual(filterVideoUrls([
    null,
    { type: 'low', url: 'https://video.example/360.mp4' },
    { type: 'full_hd', url: 'https://video.example/1080.mp4' },
    { type: 'full_hd', url: 'https://video.example/duplicate.mp4' },
    { type: 'high', url: 'javascript:alert(1)' },
    { type: 'hls', url: 'https://video.example/playlist.m3u8' },
    { type: 'medium', url: '' },
  ]).map((item) => item.type), ['full_hd', 'low']);
  assert.deepEqual(filterVideoUrls(null), []);
  assert.equal(isHttpsUrl('https://user:secret@example.com/video'), false);
  assert.equal(isHttpsUrl('data:text/html,hello'), false);
});

test('video IDs accept supported preview formats and handle missing previews', () => {
  assert.equal(parseVideoId('https://images.boosty.to/videoPreview?id=123'), '123');
  assert.equal(parseVideoId('https://images2.boosty.to/image/abc?size=large'), 'abc');
  for (const url of [null, '', 'broken', 'https://images.boostyXto/image/abc', 'https://evilimages.boosty.to/a']) {
    assert.equal(parseVideoId(url), null);
  }
});

test('post metadata ignores queries and trailing slashes, and rejects other origins', () => {
  const post = { type: 'post', blogName: 'author', id: 'post-id' };
  assert.deepEqual(postMetadata('/author/posts/post-id/?from=feed#comments'), post);
  assert.deepEqual(postMetadata('https://boosty.to/author/posts/post-id'), post);
  assert.equal(postMetadata('https://other.example/author/posts/post-id'), null);
  assert.equal(postMetadata('/author'), null);
});

test('metadata cannot introduce arbitrary API paths', () => {
  assert.equal(isValidMetadata({ type: 'post', blogName: 'some-author', id: 'ab-123' }), true);
  assert.equal(isValidMetadata({ type: 'dialog', id: '123' }), true);
  for (const value of [null, {}, { type: 'post', id: 'x', blogName: '../dialog' }, { type: 'dialog', id: '../x' }]) {
    assert.equal(isValidMetadata(value), false);
  }
});
