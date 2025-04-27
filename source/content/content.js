import { injectVkPlayerChanges } from "./playerChanges.js";

const root = document.querySelector("div#root");

/**
 * Process video players in root
 */
const processVideoPlayers = () => {
  const videoPlayers = root.querySelectorAll("vk-video-player");

  for (const player of videoPlayers) {
    injectVkPlayerChanges(player);
  }
};

/**
 * Main function
 * @async
 */
const main = async () => {
  // 1. Permanent changes
  processVideoPlayers();

  // 2. Dynamic changes
  const observer = new MutationObserver((mutations, _observer) => {
    try {
      processVideoPlayers();
    } catch (error) {
      console.log("uncaught mutation error", error);
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
  });
};

console.log("💈 Content script loaded for", chrome.runtime.getManifest().name);
main();
