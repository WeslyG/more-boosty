import { isHttpsUrl, videoQualityLabels } from '../global/helpers.js';

export const createRequestPrompt = (document, translate, accept) => {
  const container = document.createElement('div');
  container.className = 'more-boosty-request';
  const notice = document.createElement('p');
  notice.textContent = translate('privacy_notice');
  const rights = document.createElement('p');
  rights.textContent = translate('download_rights');
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = translate('load_video_links');
  button.addEventListener('click', accept, { once: true });
  container.append(notice, rights, button);
  return container;
};

export const createDownloadLinks = (document, video, translate) => {
  const container = document.createElement('div');
  container.className = 'more-boosty-downloads';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', translate('download_video'));

  const addLink = (url, label, isPreview = false) => {
    if (!isHttpsUrl(url)) return;
    const link = document.createElement('a');
    link.href = url;
    link.textContent = label;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (isPreview) link.className = 'more-boosty-preview';
    container.append(link);
  };

  for (const { url, type } of video.videoUrls) addLink(url, videoQualityLabels[type]);
  if (video.previewUrl) addLink(video.previewUrl, translate('download_preview'), true);
  return container;
};
