import * as templates from "./templates.js";
import * as helpers from "../global/helpers.js";

// Content cache for videos
const contentCache = new Map();

/**
 * Prepares to inject VK player changes using one-time event listener
 * @param {Element} vkVideoPlayer `vk-video-player` node
 */
export const injectVkPlayerChanges = (vkVideoPlayer) => {
  const playerWrapper = vkVideoPlayer
    .querySelector(".shadow-root-container")
    .shadowRoot.querySelector("div.player-wrapper");

  prepareVideoPlayer(playerWrapper, vkVideoPlayer);
};

/**
 * Inject VK player changes
 * @see {@link domHelpers.injectVkPlayerChanges} for event conditions
 * @param {PlayerWrapper} playerWrapper
 */
export const prepareVideoPlayer = async (playerWrapper, vkVideoPlayer) => {
  // Get content metadata
  const contentMetadata = getContentMetadata(playerWrapper);
  console.debug("contentMetadata", contentMetadata);
  if (contentMetadata.type === "unknown") {
    console.warn("We don`t know this type of content.", playerWrapper);
  } else {
    // Get video ID from preview URL
    const videoId = getVideoId(playerWrapper);
    console.debug("videoId", videoId);

    // Get content components
    const contentComponents = await getContentComponents(contentMetadata);
    contentComponents?.forEach((component) => {
      contentCache.set(component.videoId, component.videoUrls);
    });
    console.debug("contentComponents", contentComponents);
    console.debug("contentCache", contentCache);

    injectVideoControls(
      videoId,
      contentMetadata.type !== "unknown",
      vkVideoPlayer
    );
  }
};

/**
 * Inject VK player controls
 * @param {string} videoId
 * @param {boolean} canBeDownloaded
 * @param {Object} vkVideoPlayer
 */
const injectVideoControls = (videoId, canBeDownloaded, vkVideoPlayer) => {
  if (canBeDownloaded) {
    const videoUrls = contentCache.get(videoId);
    console.debug("videoUrls", videoUrls);

    const videoPlayer = findParentByString(vkVideoPlayer, "VideoPlayer-");

    if (!videoPlayer.querySelector(":has(.downloaderLinkGenerator)")) {
      const videoPlayerContainer = findParentByString(
        vkVideoPlayer,
        "VideoPlayerContainer-"
      );
      if (videoPlayerContainer) {
        videoPlayerContainer.style.marginBottom = "30px";
      }
      videoPlayer.lastElementChild.insertAdjacentHTML(
        "beforeEnd",
        templates.VideoDownloadButtonShort(videoUrls.slice(0, 5))
      );
    }
  }
};

const findParentByString = (el, search) => {
  while (el && !Array.from(el.classList).some((c) => c.startsWith(search))) {
    el = el.parentElement;
  }
  return el;
};

/**
 * Return content components
 * @param {Object} metadata
 * @returns {Object[]}
 */
const getContentComponents = async (metadata) => {
  return await chrome.runtime.sendMessage({
    action: "retrieveContentData",
    metadata,
    accessToken: getAccessToken(),
  });
};

/**
 * Gets an access token from local storage
 * @returns {String}
 */
const getAccessToken = () => {
  const auth = window.localStorage.getItem("auth");
  return JSON.parse(auth).accessToken;
};

/**
 * Returns the content metadata (post/dialog/etc)
 * @param {Element} playerWrapper
 * @returns {Object}
 */
const getContentMetadata = (playerWrapper) => {
  const playerRoot = playerWrapper.getRootNode().host;
  const currentPageUrl = new URL(window.location.href);
  const pathName = currentPageUrl.pathname;

  // Single post page
  if (pathName.includes("/posts/")) {
    return generatePostMetadata(pathName);
  }

  // Message page with dialog selected
  if (
    pathName.includes("/app/messages") &&
    currentPageUrl.searchParams.has("dialogId")
  ) {
    return {
      type: "dialog",
      id: currentPageUrl.searchParams.get("dialogId"),
    };
  }

  // Post on main blog page
  const postContent = playerRoot.closest("div[class*=Post_root_]");
  if (postContent) {
    const postLink = postContent.querySelector(
      "a[class*=CreatedAt_headerLink_]"
    ).href;
    return generatePostMetadata(postLink);
  }

  // Post in Media tab
  const mediaContent = playerRoot.closest("div[class*=MediaViewer_root_]");
  if (mediaContent) {
    const mediaLink = mediaContent.querySelector(
      "a[class*=GoToPostButton_link_]"
    ).href;
    return generatePostMetadata(mediaLink);
  }

  // Other cases (may be author bio or various blocks)
  return {
    type: "unknown",
  };
};

/**
 * Generate generic post metadata from URL/pathname
 * @param {String} url
 * @returns
 */
const generatePostMetadata = (url) => {
  return {
    type: "post",
    id: url.split("/").reverse()[0],
    blogName: url.split("/").reverse()[2],
  };
};

/**
 * Returns the video ID (from dataset or from preview)
 * @param {Element} playerWrapper
 * @returns {String} video ID
 */
const getVideoId = (playerWrapper) => {
  if ("videoId" in playerWrapper.dataset) {
    console.debug("videoId from dataset", playerWrapper.dataset.videoId);
    return playerWrapper.dataset.videoId;
  }

  const previewContainer = playerWrapper.querySelector(
    "div.container[style*=background-image]"
  );
  console.debug("videoPreviewContainer", previewContainer);

  const previewAttr = previewContainer.style.backgroundImage;
  console.debug("videoPreviewAttr", previewAttr);

  const regex = /url\("(.*)"\)/gm;
  const previewUrl = regex.exec(previewAttr)[1];

  const videoId = helpers.parseVideoId(previewUrl);
  playerWrapper.dataset.videoId = videoId;
  console.debug("videoId from preview", videoId);

  return videoId;
};
