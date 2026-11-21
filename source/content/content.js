import { getAccessToken, getContentMetadata, mountControls, getPlayerDetails } from './players.js';
import { createDownloadLinks, createRequestPrompt, setRequestStatus } from './templates.js';

const states = new Map();
const approvedContent = new Set();
const videoBlockSelector = '[class*="VideoBlock-scss--module_root_"], [class*="VideoBlock_root_"]';
const videoMountDelay = 240;
let scheduled = false;
let retryTimer;

const translate = (key, substitution) => chrome.i18n.getMessage(key, substitution);

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
  let nextScan = Infinity;

  // Keep the same target when Boosty replaces its preview with a VK player.
  const players = new Map();
  for (const block of document.querySelectorAll(videoBlockSelector)) players.set(block, null);
  for (const player of document.querySelectorAll('vk-video-player')) {
    players.set(player.closest(videoBlockSelector) ?? player, player);
  }
  for (const [target, state] of states) {
    if (!players.has(target)) {
      state.observer?.disconnect();
      state.controls?.remove();
      states.delete(target);
    }
  }

  let token;
  for (const [target, player] of players) {
    let state = states.get(target);
    if (!state) {
      state = { discoveredAt: Date.now() };
      states.set(target, state);
    }
    const { root, videoId } = player ? getPlayerDetails(player) : { root: null, videoId: null };
    if (root !== state.root) {
      state.observer?.disconnect();
      state.root = root;
      if (root) {
        state.observer = new MutationObserver(schedule);
        state.observer.observe(root, { childList: true, subtree: true, attributeFilter: ['style', 'class', 'data-video-id'] });
      }
    }

    const metadata = getContentMetadata(player ?? target, location);
    const contentKey = JSON.stringify(metadata);
    const approved = approvedContent.has(contentKey);
    // Do not read authentication data until the user requests links for this content.
    if (approved && token === undefined) token = getAccessToken(localStorage);
    const accessToken = approved ? token : null;
    const key = JSON.stringify([metadata, videoId, approved, accessToken]);
    if (key !== state.key) {
      const sameContent = state.contentKey === contentKey && state.controls;
      const downloads = state.controls?.querySelector('.more-boosty-downloads');
      const keepLinks = sameContent && downloads && approved && accessToken === state.accessToken
        && videoId === state.renderedVideoId;
      if (!sameContent) state.controls?.remove();
      else if (downloads && !keepLinks) downloads.replaceWith(state.button);
      state = {
        ...state, key, contentKey, accessToken,
        controls: sameContent ? state.controls : null,
        button: sameContent ? state.button : null,
        pending: false, done: !!keepLinks, renderedVideoId: keepLinks ? videoId : null,
        attempts: 0, retryAt: 0,
      };
      states.set(target, state);
    }
    if (!metadata) continue;
    if (!state.controls) {
      // Boosty can replace server-rendered video blocks before finishing its first render.
      const mountDelay = state.discoveredAt + videoMountDelay - Date.now();
      if (target.matches(videoBlockSelector) && mountDelay > 0) {
        nextScan = Math.min(nextScan, mountDelay);
        continue;
      }
      state.controls = createRequestPrompt(document, translate, () => {
        const current = states.get(target);
        if (!approvedContent.has(contentKey) && approvedContent.size >= 50) {
          approvedContent.delete(approvedContent.values().next().value);
        }
        approvedContent.add(contentKey);
        current.attempts = 0;
        current.retryAt = 0;
        current.done = false;
        setRequestStatus(current.button, translate, 'loading_video_links');
        schedule();
      });
      state.button = state.controls.querySelector('button');
      state.done = false;
    }
    mountControls(target, state.controls);
    // attachShadow() itself emits no mutation. Retry discovery while the player is loading.
    if (player && !videoId) nextScan = Math.min(nextScan, 1000);
    if (!approved) {
      setRequestStatus(state.button, translate, 'load_video_links');
      continue;
    }
    if (state.renderedVideoId && !state.controls.querySelector('.more-boosty-downloads')) {
      state.controls.querySelector('.more-boosty-request').append(state.button);
      state.renderedVideoId = null;
      state.done = false;
    }
    if (state.done || state.pending || state.attempts >= 3) continue;
    if (state.retryAt > Date.now()) {
      nextScan = Math.min(nextScan, state.retryAt - Date.now());
      continue;
    }

    setRequestStatus(state.button, translate, 'loading_video_links');
    state.pending = true;
    state.attempts++;
    chrome.runtime.sendMessage({ action: 'retrieveContentData', metadata, accessToken }).then((response) => {
      if (states.get(target) !== state || !target.isConnected) return;
      if (response?.error || !Array.isArray(response?.videos)) throw new Error('Could not load video links');
      const video = videoId
        ? response.videos.find((item) => item.videoId === videoId)
        : target.matches(videoBlockSelector) && response.videos.length === 1 ? response.videos[0] : null;
      if (video) {
        state.renderedVideoId = video.videoId;
        const downloads = createDownloadLinks(document, video, translate);
        const hadFocus = document.activeElement === state.button;
        state.button.replaceWith(downloads);
        if (hadFocus) downloads.querySelector('button, summary')?.focus({ preventScroll: true });
      } else {
        setRequestStatus(state.button, translate, 'video_links_unavailable');
      }
      state.attempts = 0;
      state.done = true;
    }).catch(() => {
      if (states.get(target) !== state || !target.isConnected) return;
      // Keep showing progress during automatic retries.
      if (state.attempts < 3) state.retryAt = Date.now() + 5000;
      else setRequestStatus(state.button, translate, 'retry_video_links');
    }).finally(() => {
      state.pending = false;
      schedule();
    });
  }

  if (nextScan < Infinity) retryTimer = setTimeout(schedule, nextScan);
};

const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'class'] });
document.addEventListener('click', (event) => {
  for (const menu of document.querySelectorAll('.more-boosty-menu[open]')) {
    if (!menu.contains(event.target)) menu.open = false;
  }
});
const dismissFloatingMenu = (event) => {
  for (const list of document.querySelectorAll('.more-boosty-quality-list[popover]')) {
    if (list.matches(':popover-open') && (event.target === window || !list.contains(event.target))) list.hidePopover();
  }
};
window.addEventListener('scroll', dismissFloatingMenu, { capture: true, passive: true });
window.addEventListener('resize', dismissFloatingMenu);
window.addEventListener('popstate', schedule);
window.addEventListener('hashchange', schedule);
window.addEventListener('storage', schedule);
schedule();
