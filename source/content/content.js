import { getAccessToken, getContentMetadata, getControlsHost, getPlayerDetails } from './players.js';
import { createDownloadLinks, createRequestPrompt } from './templates.js';

const states = new Map();
const approvedContent = new Set();
let scheduled = false;
let retryTimer;

const translate = (key) => chrome.i18n.getMessage(key);

const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    scanPlayers();
  });
};

const scanPlayers = () => {
  clearTimeout(retryTimer);
  let needsRetry = false;

  for (const [player, state] of states) {
    if (!player.isConnected) {
      state.observer?.disconnect();
      state.controls?.remove();
      states.delete(player);
    }
  }

  let token;
  for (const player of document.querySelectorAll('vk-video-player')) {
    let state = states.get(player);
    if (!state) {
      state = {};
      states.set(player, state);
    }
    const { root, videoId } = getPlayerDetails(player);
    if (root !== state.root) {
      state.observer?.disconnect();
      state.root = root;
      if (root) {
        state.observer = new MutationObserver(schedule);
        state.observer.observe(root, { childList: true, subtree: true, attributes: true });
      }
    }

    const metadata = getContentMetadata(player, location);
    const contentKey = JSON.stringify(metadata);
    const approved = approvedContent.has(contentKey);
    // Do not read authentication data until the user requests links for this content.
    if (approved && token === undefined) token = getAccessToken(localStorage);
    const key = JSON.stringify([metadata, videoId, approved, approved ? token : null]);
    if (key !== state.key) {
      state.controls?.remove();
      state = { ...state, key, controls: null, pending: false, done: false, attempts: 0, retryAt: 0 };
      states.set(player, state);
    }
    if (!metadata) continue;
    // attachShadow() itself emits no mutation. Retry while the player is loading.
    if (!videoId) {
      needsRetry = true;
      continue;
    }
    if (!approved) {
      if (!state.controls?.isConnected) {
        state.controls = createRequestPrompt(document, translate, () => {
          if (approvedContent.size >= 50) approvedContent.delete(approvedContent.values().next().value);
          approvedContent.add(contentKey);
          schedule();
        });
        getControlsHost(player)?.append(state.controls);
      }
      continue;
    }
    if (state.controls && !state.controls.isConnected) state.done = false;
    if (state.done || state.pending || state.attempts >= 3) continue;
    if (state.retryAt > Date.now()) {
      needsRetry = true;
      continue;
    }

    state.pending = true;
    state.attempts++;
    chrome.runtime.sendMessage({ action: 'retrieveContentData', metadata, accessToken: token }).then((response) => {
      if (states.get(player) !== state || !player.isConnected) return;
      if (response?.error || !Array.isArray(response?.videos)) throw new Error('Could not load video links');
      const video = response.videos.find((item) => item.videoId === videoId);
      if (video) {
        state.controls?.remove();
        state.controls = createDownloadLinks(document, video, translate);
        getControlsHost(player)?.append(state.controls);
      }
      state.attempts = 0;
      state.done = true;
    }).catch(() => {
      // Retry transient failures without logging session data or signed links.
      state.retryAt = Date.now() + 5000;
    }).finally(() => {
      state.pending = false;
      schedule();
    });
  }

  if (needsRetry) retryTimer = setTimeout(schedule, 1000);
};

const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'class'] });
window.addEventListener('popstate', schedule);
window.addEventListener('hashchange', schedule);
window.addEventListener('storage', schedule);
schedule();
