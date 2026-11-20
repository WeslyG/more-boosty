# More Boosty Privacy Policy

**English** · [Русский](PRIVACY.ru.md)

Updated: 20 November 2026

More Boosty is an independent browser extension maintained by [WeslyG](https://github.com/WeslyG/more-boosty).
Its sole purpose is to show quality-specific download links and preview images for Boosty videos
that you are authorized to save. It is not affiliated with or endorsed by Boosty.

## Data used

The extension examines the current Boosty page locally to identify video players, the post URL,
author identifier, post identifier, or selected dialog identifier. It shows a data-use notice
and a “Show video links” button beside supported players.

Only after you press that button for a post or dialog does the extension read the Boosty
access token, if present, from that site's local storage. It uses the token to authenticate
HTTPS requests to `https://api.boosty.to` for that specific content. It does not ask for your
password or access other websites' sessions.

The API response can contain a post's text and media or up to 300 recent messages from the
selected dialog. These responses are processed in memory to extract video identifiers,
quality-specific media URLs, and preview URLs. Non-video text, messages, and unrelated
response fields are not retained in the cache.

## Recipients and use

The access token and the requested content identifiers are sent only to Boosty's API.
No data is sent to the extension developer, analytics providers, advertising services,
or a developer-operated server.

When you click a video or preview link, your browser connects to the HTTPS media host supplied
by Boosty. That host receives the media request and ordinary network information such as your
IP address. Media URLs can contain access parameters issued by Boosty. The extension does not
attach your Boosty access token to these link requests. Boosty and its media providers apply
their own privacy practices.

## Retention and control

The extension uses temporary memory for the access token, per-tab approvals, content identifiers,
and video links. Cached links expire logically after five minutes and are discarded on a
subsequent cache operation or when the background worker stops. The cache holds at most 50
content entries. Tokens are part of temporary session-specific cache keys; they are not written
to disk by the extension or logged.

Approvals apply to the selected content in the current tab and disappear on a full page reload
or when the tab is closed. At most 50 approvals are kept per tab. No new content is fetched
until you request its links. Closing all Boosty tabs and disabling the extension stops processing
and clears its running contexts. Uninstalling the extension does not sign you out of Boosty
or delete files you chose to save with your browser.

The extension does not use cookies, browser history, Chrome storage, analytics, advertising,
data sales, or human review of user data. Boosty's existing site storage remains controlled
by Boosty; browser-managed downloads and history remain controlled by your browser.

## Limited Use

More Boosty's use of user data complies with the Chrome Web Store User Data Policy, including
its Limited Use requirements. Data is used only to provide the video-link feature described
above and is not used for advertising, profiling, credit decisions, or unrelated purposes.

## Contact and changes

For privacy questions, contact the maintainer through the
[project's issue tracker](https://github.com/WeslyG/more-boosty/issues).
Do not post access tokens, signed media URLs, private messages, or other sensitive information
in a public issue.

This policy will be updated when data practices change. A change to the data being accessed
or its use will also be disclosed in the extension before that new processing begins.
