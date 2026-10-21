# Twitch Category Following

A small Manifest V3 Chrome extension that helps viewers find their live follows in the category they are browsing, including channels missing from Twitch’s sidebar. It adds **Following** to category sorting, retrieves every page through Twitch’s official API, and orders matching channels by viewers. The native feed returns when another sort is selected.

**Status:** runnable following-only MVP. The unpacked extension, setup, injected menu, keyboard event handling, connection state, and native-sort restoration were checked in Chrome against live Twitch. Authorization and real followed-channel cards still need your registered application/account. See the [verification record](docs/verification.md) for precise evidence and limits.

## Tech Stack and Why Chosen

- **Manifest V3 / Chrome identity:** browser-managed authorization callbacks and a service worker for authorized requests; no backend or client secret.
- **Plain JavaScript, CSS, DOM APIs:** Twitch already supplies the visual language; small isolated adapters avoid React internals and production dependencies.
- **Helix:** official follow membership, category IDs, and avatars, with complete cursor traversal and explicit failure handling.
- **Node test runner + jsdom:** deterministic API, security, and DOM lifecycle fixtures; Chrome supplies the separate runtime check.

## Install and connect

1. Clone or download [this repository](https://github.com/Kevin-Mok/twitch-following-extension). Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select its directory (the folder containing `manifest.json`).
2. Open the extension’s toolbar popup or Details → Extension options. Copy the generated redirect URL.
3. In the [Twitch developer console](https://dev.twitch.tv/console/apps), register an app with **Public** client type, a suitable application category, and that **exact** OAuth redirect URL, including its trailing slash. Never put a client secret in the extension. Twitch may require developer-account two-factor authentication.
4. Paste the public client ID into the extension and choose **Connect Twitch**. Approve `user:read:follows` in Twitch’s authorization window. The setup shows the connected account.
5. After local source changes, click **Reload (↻)** on the extension in `chrome://extensions`; there is no automatic reload watcher. After installation or extension reload, refresh the Twitch tab. Open a category’s **Live Channels** tab and select **Sort by → Following**. Choose another native sort to restore Twitch’s feed.

The callback has the form `https://<extension-id>.chromiumapp.org/`. Use the generated value, not this placeholder. An unpacked extension ID can change across installations or when its directory moves; update the Twitch app’s registered callback when that happens. A callback mismatch must be corrected in registration before retrying.

Implicit OAuth has no refresh token. Use **Reconnect Twitch** after expiry, revocation, or a missing-scope error. Disconnect clears local authorization and attempts server-side revocation; if offline, revoke manually in Twitch’s Connections settings too. The Twitch site’s logged-in account can differ from the extension’s explicitly connected account.

## Usage and limits

- Fetches every followed-stream page; any failed page fails the snapshot. No sidebar scraping or private API requests.
- Twitch’s paginated lists change while being read. The extension processes every returned page and deduplicates, but cannot promise a single atomic view of all live follows. Select Following again for a new snapshot. See [Twitch’s pagination guide](https://dev.twitch.tv/docs/api/guide/).
- Filters by category ID resolved through official Get Games, deduplicates by broadcaster ID, sorts numeric viewers descending, then channel login ascending. Avatars use batched Get Users requests.
- Each Following selection/category change loads a fresh snapshot. Supported local filter changes reuse it; no periodic stream refresh. Select Following again or Retry to refresh.
- The Following menu row has a monochrome heart icon and supports mouse and keyboard selection; selecting it closes the dropdown.
- **Following-only MVP:** Twitch’s recommendation tail is omitted. Its scrolling, deduplication, and restoration acceptance gate could not be verified.
- Menu support targets the English UI shown in the supplied screenshots. The observed `#browse-sort-drop-down` listbox, directory container, and Live Channels tab selectors are isolated in `src/dom.js`. Twitch DOM/localization changes may prevent attachment; compatibility failures preserve the native feed and explain the problem.
- Live inspection confirmed tag URLs (`tl=English`) and persisted language codes (`languageDirectoryFilters`), including a closed language menu. Fixture-backed fallbacks also recognize `lang`/`language` URL values and removable tag chips. Unreadable active filters or unknown URL parameters show a limitation instead of an unfiltered list.
- Languages use OR; selected stream tags use case-insensitive AND. Category tags visible beside the verified category heading apply to all its streams, since Helix omits them. Complete parity for every Twitch tag combination/localized page is not established; it remains a manual acceptance check.
- Cards use Twitch theme variables, responsive thumbnails, viewer overlays, titles, channel links, avatars, and stream tags. No badges or fake controls. Renderer fixtures were inspected in both themes and reflowed from four to one columns across 1440/1280/768/390 px without grid overflow. Account-backed card/filter acceptance and the complete two-theme matrix remain manual.
- Category navigation keeps Following and retrieves afresh; changing a native sort through history exits Following. Videos/Clips restore the native page. On return to Live Channels, select Following again.

## Architecture and security

`src/background.js` owns OAuth and every API request; `src/auth.js` validates callback state, identity, and sender/message boundaries. Tokens are stored in local extension storage restricted to trusted contexts. They are never included in content-script messages. User strings render with DOM text APIs. Requests have timeouts and safe error messages. Validation runs when the worker starts, on browser startup, and hourly. Account changes invalidate outstanding requests; short credential writes are serialized so delayed work cannot restore old credentials or erase a newer connection.

`src/core.js` owns retrieval, validation, sorting, and avatar batching. `src/dom.js` contains Twitch-specific selectors/filter interpretation/card rendering; `src/content.js` handles menu lifecycle, request generations, and restoration. React internals are not used. Native grids are temporarily hidden, never deleted or moved.

Permissions: `storage` for authorization, `identity` for the OAuth callback, `alarms` for required hourly token validation. Host access is limited to Twitch API/auth endpoints; the content script runs only on `www.twitch.tv`. No analytics or backend.

## Commands and verification

Use Node 22 or newer. Install development dependencies with `npm ci`; jsdom is test-only. Run `npm test` and `npm run check`. There is no build step: Chrome loads the source files directly. `npm test` includes deterministic retrieval/auth/worker fixtures and simulated DOM lifecycle tests; simulated markup does **not** prove compatibility with current Twitch.

See [the atomic plan](plans/twitch-following.md), [smoke checks](docs/smoke-tests.md), [verification record](docs/verification.md), and [saved implementation brief](prompts/twitch-following-extension.md). Use the three browser commands in the verification record to open setup/install, a category, and an alternative category. Manual registration and authorization require your own public client ID/account.

The browser launcher accepts `install`, `fortnite`, or `navigation`; `--plain` (or `CLI_PLAIN=1`) removes decorative emoji. It defaults to `google-chrome`; `TWITCH_VERIFY_BROWSER` can name another Chrome executable. The test and syntax-check commands have no project-specific options.

Public source: [Kevin-Mok/twitch-following-extension](https://github.com/Kevin-Mok/twitch-following-extension). Publication and validation decisions are recorded in [the delivery plan](plans/publish-github.md).

## Official references

- [Get Followed Streams / API reference](https://dev.twitch.tv/docs/api/reference/#get-followed-streams)
- [Implicit OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/)
- [Required token validation](https://dev.twitch.tv/docs/authentication/validate-tokens/)
- [Chrome identity callbacks](https://developer.chrome.com/docs/extensions/reference/api/identity)
