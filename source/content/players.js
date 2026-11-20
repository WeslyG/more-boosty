import { parseVideoId, postMetadata } from '../global/helpers.js';

export const getContentMetadata = (player, location) => {
  // A media overlay may cover another post page: prefer the player's own link.
  const post = player.closest('div[class*="Post_root_"]');
  const media = player.closest('div[class*="MediaViewer_root_"]');
  const link = media?.querySelector('a[class*="GoToPostButton_link_"]')
    ?? post?.querySelector('a[class*="CreatedAt_headerLink_"]');
  if (link) return postMetadata(link.href);

  const url = new URL(location.href);
  if (url.pathname.startsWith('/app/messages') && url.searchParams.has('dialogId')) {
    return { type: 'dialog', id: url.searchParams.get('dialogId') };
  }
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

export const getControlsHost = (player) => {
  for (let node = player.parentElement; node; node = node.parentElement) {
    if (Array.from(node.classList).some((name) => name.startsWith('VideoPlayer-'))) return node;
  }
  return player.parentElement;
};
