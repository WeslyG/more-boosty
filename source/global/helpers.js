const qualities = ['ultra_hd', 'quad_hd', 'full_hd', 'high', 'medium', 'low', 'lowest', 'tiny'];

export const videoQualityLabels = {
  ultra_hd: '2160p', quad_hd: '1440p', full_hd: '1080p', high: '720p',
  medium: '480p', low: '360p', lowest: '240p', tiny: '144p',
};

export const isHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

export const filterVideoUrls = (urls) => {
  if (!Array.isArray(urls)) return [];
  const seen = new Set();
  return urls.filter((item) => {
    if (!item || !qualities.includes(item.type) || !isHttpsUrl(item.url) || seen.has(item.type)) return false;
    seen.add(item.type);
    return true;
  }).sort((a, b) => qualities.indexOf(a.type) - qualities.indexOf(b.type));
};

export const parseVideoId = (value) => {
  if (!isHttpsUrl(value)) return null;
  const url = new URL(value);
  if (url.pathname.includes('videoPreview')) return url.searchParams.get('id') || null;
  if (/^images\d*\.boosty\.to$/.test(url.hostname)) return url.pathname.split('/').filter(Boolean).at(-1) || null;
  return null;
};

export const postMetadata = (value) => {
  try {
    const url = new URL(value, 'https://boosty.to');
    const match = url.pathname.match(/^\/([^/]+)\/posts\/([^/]+)\/?$/);
    return url.origin === 'https://boosty.to' && match
      ? { type: 'post', blogName: match[1], id: match[2] }
      : null;
  } catch {
    return null;
  }
};

export const isValidMetadata = (metadata) => {
  const validPart = (part) => typeof part === 'string' && /^[\w-]{1,200}$/.test(part);
  return !!metadata && validPart(metadata.id) && (
    (metadata.type === 'post' && validPart(metadata.blogName)) || metadata.type === 'dialog'
  );
};
