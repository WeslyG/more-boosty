import { isHttpsUrl, videoQualityLabels } from '../global/helpers.js';
import { wireQualityMenu } from './qualityMenu.js';

const wrapControls = (document, translate, controls) => {
  const container = document.createElement('div');
  container.className = 'more-boosty-panel';
  const body = document.createElement('div');
  body.className = 'more-boosty-request';
  const notice = document.createElement('p');
  notice.textContent = translate('privacy_notice');
  body.append(notice, controls);
  const title = document.createElement('strong');
  title.className = 'more-boosty-notice-title';
  title.textContent = translate('extension_notice_title');
  container.append(title, body);
  return container;
};

export const createRequestPrompt = (document, translate, accept) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = translate('load_video_links');
  button.addEventListener('click', () => {
    if (!button.hasAttribute('aria-disabled')) accept();
  });
  return wrapControls(document, translate, button);
};

export const setRequestStatus = (button, translate, message) => {
  const loading = message === 'loading_video_links';
  if (loading) button.setAttribute('aria-disabled', 'true');
  else button.removeAttribute('aria-disabled');
  const label = translate(message);
  if (button.textContent !== label) button.textContent = label;
};

export const createDownloadLinks = (document, video, translate) => {
  const container = document.createElement('div');
  container.className = 'more-boosty-downloads';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', translate('download_video'));

  const floating = 'showPopover' in container;
  const menu = document.createElement(floating ? 'div' : 'details');
  menu.className = 'more-boosty-menu';
  const summary = document.createElement(floating ? 'button' : 'summary');
  summary.textContent = translate('video_quality');
  const list = document.createElement('div');
  list.className = 'more-boosty-quality-list';
  if (floating) summary.type = 'button';
  menu.append(summary, list);
  container.append(menu);

  const addLink = (url, label, isPreview = false) => {
    if (!isHttpsUrl(url)) return;
    const link = document.createElement('a');
    link.href = url;
    link.textContent = isPreview ? label : translate('download_quality', label);
    if (!isPreview) link.download = '';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (isPreview) link.className = 'more-boosty-preview';
    (isPreview ? container : list).append(link);
  };

  for (const { url, type } of video.videoUrls) addLink(url, videoQualityLabels[type]);
  if (video.previewUrl) addLink(video.previewUrl, translate('download_preview'), true);
  wireQualityMenu(menu, summary, list, floating);
  return container;
};
