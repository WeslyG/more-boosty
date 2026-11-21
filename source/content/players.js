import { parseVideoId, postMetadata } from '../global/helpers.js';

const postSelector = '[class*="Post_root_"], [class*="Post-scss--module_root_"]';
const mediaSelector = '[class*="MediaViewer_root_"], [class*="MediaViewer-scss--module_root_"]';
const postLinkSelector = 'a[class*="CreatedAt_headerLink_"], a[class*="CreatedAt-scss--module_headerLink_"]';
const mediaLinkSelector = 'a[class*="GoToPostButton_link_"], a[class*="GoToPostButton-scss--module_link_"]';

export const getContentMetadata = (player, location) => {
  const url = new URL(location.href);
  const media = player.closest(mediaSelector);
  if (media) {
    const link = media.querySelector(mediaLinkSelector);
    const metadata = link && postMetadata(link.href);
    if (metadata) return metadata;
  }
  if (url.pathname.startsWith('/app/messages') && url.searchParams.has('dialogId')) {
    return { type: 'dialog', id: url.searchParams.get('dialogId') };
  }

  // A feed can contain several posts. Resolve the permalink from this card.
  const post = player.closest(postSelector);
  const link = post?.querySelector(postLinkSelector);
  const metadata = link && postMetadata(link.href);
  if (metadata) return metadata;

  if (post && !media) {
    const candidates = new Map();
    for (const anchor of post.querySelectorAll('a[href*="/posts/"]')) {
      if (anchor.closest(postSelector) !== post) continue;
      const candidate = postMetadata(anchor.href);
      if (candidate) candidates.set(JSON.stringify(candidate), candidate);
    }
    if (candidates.size === 1) return candidates.values().next().value;
  }

  const mediaPath = url.pathname.match(/^(\/[^/]+\/posts\/[^/]+)\/media\/[^/]+\/?$/);
  if (mediaPath) return postMetadata(new URL(mediaPath[1], url.origin).href);
  return postMetadata(url.href);
};

export const getPlayerDetails = (player) => {
  const root = player.querySelector('.shadow-root-container')?.shadowRoot ?? player.shadowRoot;
  const wrapper = root?.querySelector('div.player-wrapper');
  if (!wrapper) return { root, videoId: null };
  const preview = Array.from(wrapper.querySelectorAll('div.container')).find((node) =>
    node.style.backgroundImage && node.style.backgroundImage !== 'none');
  const previewUrl = preview?.style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
  return { root, videoId: parseVideoId(previewUrl) ?? wrapper.dataset.videoId ?? null };
};

export const getAccessToken = (storage) => {
  try {
    return JSON.parse(storage.getItem('auth'))?.accessToken || null;
  } catch {
    return null;
  }
};

export const mountControls = (player, controls) => {
  // The player is absolutely positioned inside a padding-based aspect-ratio box.
  // Controls must be a sibling of that box so their height moves the post text.
  let playerWrapper;
  for (let node = player.parentElement; node; node = node.parentElement) {
    if (Array.from(node.classList).some((name) => name.startsWith('VideoPlayerContainer-'))) {
      if (node.nextElementSibling !== controls) node.after(controls);
      return;
    }
    if (!playerWrapper && Array.from(node.classList).some((name) => name.startsWith('VideoPlayer-'))) {
      playerWrapper = node;
    }
  }
  const anchor = playerWrapper ?? player;
  if (anchor.nextElementSibling !== controls) anchor.after(controls);
};
