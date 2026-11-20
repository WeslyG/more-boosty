import { createVideoLoader } from '../global/boostyApi.js';

const loadVideos = createVideoLoader();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith('https://boosty.to/')) return;
  if (message?.action !== 'retrieveContentData') return;

  loadVideos(message.metadata, message.accessToken).then(
    (videos) => sendResponse({ videos }),
    () => sendResponse({ error: 'Could not load video links' }),
  );
  return true;
});
