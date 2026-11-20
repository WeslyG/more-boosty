# Publish More Boosty in the Chrome Web Store

**English** · [Русский](publishing.md) · [README](../README.en.md)

GitHub Releases are created automatically from tags. Chrome Web Store submission is a separate step.
The extension and store listing materials support both Russian and English.

## Publication files

| Purpose | English | Русский |
| --- | --- | --- |
| Listing, short description and permission justification | [listing.json](../store/en/listing.json) | [listing.json](../store/ru/listing.json) |
| Privacy policy | [PRIVACY.md](../PRIVACY.md) | [PRIVACY.ru.md](../PRIVACY.ru.md) |
| 1280×800 screenshot | [PNG](images/screenshot-en.png) | [PNG](images/screenshot-ru.png) |
| Extension localization | [messages.json](../source/_locales/en/messages.json) | [messages.json](../source/_locales/ru/messages.json) |

The `source/_locales` files are included in the extension ZIP. The `store/*/listing.json` files
contain prepared text for the store dashboard; they are not automatic import files.
Their `screenshot` fields refer to local files.
English is the default language (`default_locale: en`); add the Russian listing translation in the dashboard.

## Preparation

1. Run `npm ci`, `npm test` and `npm run release`, or download the ZIP from a verified GitHub Release.
   Upload `release.zip` or `more-boosty-vX.Y.Z.zip`, not GitHub's “Source code” archive.
2. Check an individual post, multiple players, the feed, media view and selected dialog.
   Use your own authorized account for restricted content.
3. Publish the changes on the default branch so the policy URLs in `listing.json` are accessible without login.
   A local file alone is not a publicly accessible privacy policy.
4. Verify your developer contact email, complete publisher information, enable Google account
   two-step verification and provide the distribution information requested by the dashboard.

## Listing fields

Upload the ZIP and fill in the name, description, category and screenshots.
Copy `short_description`, `description`, `single_purpose` and `host_permission_justification`
from each language's `listing.json` into the corresponding dashboard fields.
Add the privacy policy and support URLs.

For remote code, choose **No, I am not using remote code**.
All executable logic is bundled with the extension; the API returns JSON data.

## Privacy practices

Do not declare that the extension handles no user data. The current implementation uses:

- **Authentication information**: the current Boosty session token.
- **Website content**: post and video-player data.
- **Web history**: only the selected content URL/identifiers on the current Boosty page,
  without access to the browser history API.
- **Personal communications**: the selected dialog API response can include messages.

Review these categories against the dashboard's current definitions before submitting.
Disclosures must match the code, listing, in-page notice and both privacy policies.
Data is not sold or used for advertising, profiling or unrelated purposes.

## Reviewer access and limitations

Provide an accessible test page and reproduction steps: open a video, read the notice,
select the button and choose a quality. Do not provide your personal token or other users' private messages.

Google prohibits unauthorized downloads and circumvention of access restrictions.
Viewing access alone does not establish permission to download a video, and an in-page notice
does not replace the rightsholder's permission. Do not promise subscription bypasses
or downloads of arbitrary paid content. Google makes the final publication decision.

On 20 November 2026, Chrome 157.0.8103.79 was tested on the supplied public post:
six qualities from 1080p to 144p and a preview link appeared, and a media HEAD request returned HTTP 200.
The full video was not downloaded. Restricted posts and dialogs require separate signed-in testing.

## Official requirements

Reviewed on 20 November 2026. Check for changes before each release:

- [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)
- [Listing and images](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Privacy declarations](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Local user-data handling](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Disclosure and consent](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements)
- [Prohibited products](https://developer.chrome.com/docs/webstore/program-policies/malicious-and-prohibited)
- [Publication](https://developer.chrome.com/docs/webstore/publish)
