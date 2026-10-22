# YouTube No GIF

A browser extension for Firefox and Chromium-based browsers (Chrome, Edge, Brave, Opera, Vivaldi) that hides GIFs in YouTube comment sections.

- Hides GIFs in comments and replies on desktop YouTube, the Shorts comment panel and mobile web (`m.youtube.com`).
- Optionally shows a small **"GIF hidden · Show"** placeholder so you can reveal a single GIF.
- Optionally hides the GIF button in the comment box.
- Everything can be switched on or off from the toolbar popup. Settings sync through your browser account.

One codebase and one Manifest V3 `manifest.json` work in both browsers.

## Install (development)

### Chrome / Edge / Brave
1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.

Chrome shows a warning about the unrecognized `browser_specific_settings` key. That key is for Firefox, and Chrome ignores it safely.

### Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `manifest.json`.

Temporary add-ons are removed when Firefox restarts. For a permanent install, sign the extension through [addons.mozilla.org](https://addons.mozilla.org/developers/) (it can be listed or unlisted/self-distributed).

## Packaging

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package.ps1
```

This creates `dist/youtube-no-gif-<version>.zip`. You can upload the same zip to the Chrome Web Store and to addons.mozilla.org.

## How it works

YouTube hasn't documented the markup for comment GIFs, and its class names change often. So the content script ([src/content.js](src/content.js)) decides what to hide from where an element sits in the comment, not from exact selectors. Inside every comment element (`ytd-comment-view-model`, `ytd-comment-renderer`, `ytm-comment-*`), it hides:

- any `<img>` / `<video>` / `<picture>` / `<canvas>` outside the avatar, author line, badges, toolbar and reply box;
- any element whose tag, id or class contains `gif` (but not `gift`);
- any image whose URL looks like a GIF (`.gif`, Giphy, Tenor).

Custom emojis in the comment text are left alone unless they are rendered larger than an emoji would be. A `MutationObserver` covers infinite scroll, replies and YouTube's element recycling.

**Note:** YouTube is rolling out static image attachments in comments at the same time as GIFs. Because both are media in the comment body, the extension hides those too.

## Updating selectors

If YouTube changes its layout and something slips through or gets hidden by mistake, check these constants at the top of [src/content.js](src/content.js):

- `COMMENT_ROOTS`: the elements that represent one comment.
- `SAFE_AREAS`: the parts of a comment where images are legitimate (avatars, badges…).
- `TEXT_AREAS`: where inline emojis live.

To hide the GIF button, the script looks for a button whose `aria-label`/`title` contains "GIF" inside the comment box ([src/content.css](src/content.css)).

## Reporting problems

If a GIF slips through or something gets hidden by mistake, please [open an issue](https://github.com/Cola1000/youtube_no_gif/issues/new?template=bug_report.yml). The quickest way is **Report a problem** in the extension popup, which fills in your browser and extension version. Including the comment's markup (the template explains how) makes fixes much faster.

## License

[MIT](LICENSE)
