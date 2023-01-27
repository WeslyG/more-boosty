import optionsStorage from './options-storage.js'
let options
let body
let App
let topMenu
let isFirefox

console.log('💈 Content script loaded for', chrome.runtime.getManifest().name)
async function init() {
    options = await optionsStorage.getAll()

    // Background service workers and PiP API aren't working in Firefox.
    // I don't want to add `tabs` permission just to open options page.
    isFirefox = await detectFirefox()
    if (!isFirefox) optionsButton()

    // Instant execution
    if (options.full_layout) {
        full_layout()
    } else {
        console.log('💈 Full Layout is disabled')
    }

    // Deffered execution (via MutationObserver)
    initPage()
}

async function detectFirefox() {
    const runtime = await chrome.runtime.getManifest()
    return runtime.options_ui.page.includes("moz-extension")
}

// Options button in top menu
function optionsButton() {
    const topMenu_left = document.querySelector('div[class^=TopMenu_left_xpNO0]')

    const optionsButton = `
            <div class="TopMenu_messageContainer_bwglz" style="padding-left: 10px;">
                <a class="TopMenu_messagesContainer_hzgjz" href="#" id="MB_options">
                    <span class="Icon_block_Hvwi5 TopMenu_iconMessages_zy_w6">
                        <svg class="Icon_svg__DRUh"><use xlink:href="#svg-icon-gear"></use></svg>
                    </span>
                    <span class="TopMenu_messageCaption_s_h7T">More Boosty</span>
                </a>
            </div>
        `

    topMenu_left.lastElementChild.insertAdjacentHTML('afterEnd', optionsButton)
    const newButton = document.querySelector('a#MB_options')
    newButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ "action": "openOptionsPage" })
    })
}

function initPage() {
    // Observer for VK Player
    if (!App) App = document.querySelector('div[class^=App_app_]')
    new MutationObserver(() => {
        prepareVideo()
    }).observe(App, { subtree: true, childList: true })

    if (options.theater_mode) {
        // Stream page
        if (!body) body = document.querySelector('body')
        if (location.href.includes('streams/video_stream')) {
            body.classList.add('MB_stream')
            window.addEventListener("scroll", scrollEvent);
        } else {
            body.classList.remove('MB_stream')
            window.removeEventListener("scroll", scrollEvent);
        }
    } else {
        console.log('💈 Theater Mode is disabled')
    }
}

// For Theater Mode
function scrollEvent() {
    let scroll = this.scrollY;

    if (!topMenu) {
        topMenu = document.querySelector('div#topMenu')
    }

    if (scroll >= 1) {
        topMenu.classList.add('MB_scrolled')
    } else {
        topMenu.classList.remove('MB_scrolled')
    }
}

function prepareVideo() {
    const videoPlayer = document.querySelectorAll("vk-video-player:not(.MB_done)")

    if (!videoPlayer) {
        console.error('Cannot find `vk-video-player`, aborting `prepareVideo`')
        return
    }

    videoPlayer.forEach(player => {
        const player_wrapper = player.shadowRoot.querySelector('div.player-wrapper')
        player_wrapper.addEventListener('click', prepareVideoPlayer, { once: true })
        player.classList.add('MB_done')
    });
}

function prepareVideoPlayer(event) {
    const player = event.currentTarget.parentElement
    const controls = player.querySelector('div.controls')

    if (document.pictureInPictureEnabled) {
        // PIP Spawn
        const pipButton = `
                <div class="container controls-element v-1fkqq1h MB_pip">
                    <div role="button" tabindex="0">
                        <svg class="icon v-daygaf" xmlns="http://www.w3.org/2000/svg">
                            <g fill="#fff" fill-rule="evenodd">
                            <path class="_enter" d="M18 11 10 11 10 17 18 17 18 11 18 11ZM22 19 22 4.98C22 3.88 21.1 3 20 3L2 3C.9 3 0 3.88 0 4.98L0 19C0 20.1.9 21 2 21L20 21C21.1 21 22 20.1 22 19L22 19ZM20 19.02 2 19.02 2 4.97 20 4.97 20 19.02 20 19.02Z"></path>
                        </svg>
                    </div>
                </div>
                <div class="container controls-element v-1fkqq1h"></div>
            `
        controls.lastElementChild.insertAdjacentHTML('beforeBegin', pipButton)

        const newButton = player.querySelector('div.MB_pip')
        newButton.addEventListener('click', pip)
    }

    // Max Video Quality
    if (options.max_video_quality) {
        const item_quality = player.querySelectorAll('li.item-quality')
        item_quality[0].click()
    }
}

function pip(event) {
    console.log(event)

    // TODO: find a better way to query this wrapper
    const playerWrapper = event.currentTarget.parentElement.parentElement.parentElement
    const video = playerWrapper.querySelector('video')

    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
        video.requestPictureInPicture();
    }
}

function full_layout() {
    document.querySelector('body').classList.add('MB_active')
}

// Check if URL has changed
let lastUrl = location.href
new MutationObserver(() => {
    const url = location.href

    if (url !== lastUrl) {
        console.log('URL changed!', lastUrl, '->', url)
        lastUrl = url
        initPage()
    }
}).observe(document, { subtree: true, childList: true })

init()
