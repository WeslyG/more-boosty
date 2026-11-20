import { filterVideoUrls, isValidMetadata, parseVideoId } from './helpers.js';

const API_URL = 'https://api.boosty.to/v1/';
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_LIMIT = 50;

const extractVideos = (data, type) => {
  if (!Array.isArray(data)) return [];
  const blocks = type === 'dialog' ? data.flatMap((message) => message?.data ?? []) : data;
  return blocks.filter((block) => block?.type === 'ok_video').flatMap((block) => {
    const videoId = parseVideoId(block.preview);
    const videoUrls = filterVideoUrls(block.playerUrls);
    return videoId && videoUrls.length ? [{ videoId, videoUrls, previewUrl: block.preview }] : [];
  });
};

// Video links live only in worker memory; nothing is written to browser storage.
export const createVideoLoader = (fetcher = fetch, now = Date.now) => {
  const cache = new Map();
  const pending = new Map();

  return async (metadata, accessToken) => {
    if (!isValidMetadata(metadata) || (accessToken != null && typeof accessToken !== 'string')) {
      throw new Error('Invalid video request');
    }

    // Partition by session so changing accounts cannot reuse another user's links.
    const key = JSON.stringify([metadata.type, metadata.blogName, metadata.id, accessToken]);
    for (const [key, entry] of cache) {
      if (entry.expires <= now()) cache.delete(key);
    }
    if (cache.has(key)) return cache.get(key).videos;
    if (pending.has(key)) return pending.get(key);

    const request = (async () => {
      const endpoint = metadata.type === 'post'
        ? 'blog/' + encodeURIComponent(metadata.blogName) + '/post/' + encodeURIComponent(metadata.id) + '?component_limit=0'
        : 'dialog/' + encodeURIComponent(metadata.id) + '/message/?limit=300&reverse=true&offset=' + Number.MAX_SAFE_INTEGER;
      const response = await fetcher(API_URL + endpoint, {
        headers: accessToken ? { Authorization: 'Bearer ' + accessToken } : {},
        credentials: 'omit',
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Could not load video links');
      const json = await response.json();
      if (!Array.isArray(json.data)) throw new Error('Unexpected video response');
      const videos = extractVideos(json.data, metadata.type);
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
      cache.set(key, { videos, expires: now() + CACHE_TTL });
      return videos;
    })();
    pending.set(key, request);
    try {
      return await request;
    } finally {
      pending.delete(key);
    }
  };
};
