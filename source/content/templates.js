import safeHTML from "html-template-tag";

const t = (name) => chrome.i18n.getMessage(name);

// Checking browser language
let uiLang = chrome.i18n.getUILanguage();
if (uiLang !== "ru" || uiLang !== "en") {
  uiLang = "ru";
}

export const VideoDownloadButtonShort = (links, previewUrl) => `
  <div class="downloaderLinkGenerator">
      ${generateVideoDownloadLinks(links, previewUrl)}
  </div>
`;

/**
 * Generates video download buttons for the modal, plus preview button
 * @param {Object[]} urls
 * @param {String} previewUrl
 * @returns
 */
const generateVideoDownloadLinks = (urls, previewUrl) => {
  let text = "";
  for (const url of urls) {
    text += safeHTML`<a href="${
      url.url
    }" target="_blank" style="border-radius: 3px; margin: 7px 0 0 14px; color: white; background-color: rgb(241, 95, 44); display: inline-block; padding: 0 30px; text-decoration: none; text-align: center; cursor: pointer;">
      ${t(`video_quality_${url.type}`)}
    </a>`;
  }
  // Add preview button if previewUrl is provided
  if (previewUrl) {
    text += safeHTML`<a href="${previewUrl}" target="_blank" style="border-radius: 3px; margin: 7px 0 0 14px; color: white; background-color: #888; display: inline-block; padding: 0 30px; text-decoration: none; text-align: center; cursor: pointer;">
      preview
    </a>`;
  }
  return text;
};
