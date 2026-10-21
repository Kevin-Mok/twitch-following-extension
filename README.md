# Twitch Category Following

An open-source, MIT-licensed Chrome extension that helps viewers find their live follows in the category they are browsing, including channels missing from Twitch’s sidebar. It puts **Following** first in category sorting and selects it by default, retrieves every page through Twitch’s official API, and orders matching channels by viewers. Your Following/native choice is remembered in Twitch’s local browser storage across reloads. Choosing another sort restores Twitch’s native feed.

**Inspect before you connect:** [source code](https://github.com/Kevin-Mok/twitch-following-extension), [MIT license](LICENSE), [privacy policy](privacy.html), and [help](help.html). The extension uses limited Twitch access, keeps credentials in browser-session memory, and has no analytics, advertising, client secret, or publisher backend. These are inspectable design choices, not a guarantee of zero risk or an independent security certification.

**Status:** version 0.2.0 is prepared for a publisher’s Public Twitch application and real-account acceptance. Device authorization, credential isolation, native restoration and archive generation have fixture coverage; the actual unpacked ZIP and logged-out Twitch menu were checked in isolated Chrome. No publisher client ID or real Twitch approval has been supplied, and nothing is published in the Chrome Web Store. See the [release guide](docs/chrome-web-store-release.md) for the remaining manual steps and [verification record](docs/verification.md) for evidence and limits.

## Tech Stack and Why Chosen

- **Manifest V3:** a Chrome service worker owns authorization and API access; no backend or client secret.
- **Plain JavaScript, CSS and DOM APIs:** Twitch supplies the visual language; small isolated adapters avoid React internals and production dependencies.
- **Twitch device authorization and Helix:** a documented Public-client flow, official paginated follow membership, category IDs and avatars.
- **Chrome session storage:** trusted extension contexts hold token/account/pending state in memory. Extension-local storage holds the public client ID; Twitch site storage remembers the non-sensitive sort preference. Existing persistent credentials are cleared on upgrade.
- **Node test runner + jsdom:** deterministic API, security, setup and DOM-lifecycle fixtures; Chrome supplies the separate runtime check.
- **Python standard library:** deterministic allowlisted ZIP packaging, dependency inspection and public client-ID injection without source changes.

## Install and connect

1. Clone or download [the repository](https://github.com/Kevin-Mok/twitch-following-extension). In `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`.
2. Open the toolbar icon or **Extension options**. Setup opens in a persistent tab. A publisher-configured release needs only **Connect Twitch**. Source checkouts and draft ZIPs show a developer client-ID field until a public application ID is supplied.
3. For a development build, register a **Public** Twitch application in the [developer console](https://dev.twitch.tv/console/apps) using your verified developer account/2FA. Enter its **public client ID**, never its secret. This device flow does not use an OAuth redirect callback; follow the [release guide](docs/chrome-web-store-release.md) if the registration form asks for one.
4. Choose **Connect Twitch**, open the provided Twitch activation page and enter the displayed code if requested. Check the app/account and `user:read:follows` permission before approving, then return to setup. Keep the setup tab open until the connected login appears.
5. Refresh Twitch and open a category’s **Live Channels** tab. **Following** is first and selected by default; your Following/native choice is remembered across reloads. Choose a native sort to restore Twitch’s feed.
6. After source changes, reload the extension in `chrome://extensions`, then refresh Twitch. There is no reload watcher. Authorization is session-only: reconnect after Chrome restart, extension reload/update/disable or token expiry. Refresh tokens are not saved.

Disconnect clears account/authorization and attempts Twitch revocation. If offline, also revoke in Twitch Connections. The explicitly authorized account can differ from the account signed into the Twitch website. The previous implicit callback flow is no longer used. [User help](help.html) explains reconnection and removal.

## Usage and limits

- Every returned followed-stream page is retrieved; any failed page fails the snapshot. No sidebar scraping or private APIs.
- Twitch’s paginated lists can change during retrieval. The extension deduplicates returned broadcasters but cannot promise one atomic view of all live follows. Select Following again to refresh.
- Category IDs are resolved through Get Games. Matching channels sort by numeric viewers descending, then login ascending; avatars use batched Get Users requests.
- Supported filter changes reuse the current snapshot. Languages use OR; selected stream tags use case-insensitive AND. Unsupported/unreadable filters show a limitation instead of an unfiltered success. Full live/localized filter parity remains unverified.
- **Following-only English UI:** no recommendation tail, periodic stream refresh, badges or invented controls. A monochrome heart matches the native menu’s icon alignment. Mouse and keyboard handlers restore native sorting.
- Cards use Twitch theme variables and responsive layouts. Tests and renderer previews cover long titles, missing avatars and narrow widths; authenticated card comparisons remain manual.
- Category navigation retrieves afresh. Videos/Clips and native sort changes restore Twitch’s page; the saved Following choice resumes when returning to Live Channels. Twitch DOM changes may require adapter updates.

## Architecture and security

`src/background.js` owns device authorization, token validation and every API request. Setup starts a device request and makes paced short polls, allowing the service worker to sleep between requests. Pending state, bearer token and account stay in trusted `chrome.storage.session`; the public client ID persists in extension storage, and the sort preference persists in Twitch site storage. Expiry, disconnect, stale account work and malformed persisted data fail safely. The worker validates tokens at startup and hourly. No access/device/refresh token is returned to the content script or setup.

`src/auth.js` validates identity and sender/message boundaries. `src/core.js` owns retrieval, validation, sorting and avatar batching. `src/dom.js` isolates Twitch selectors/filter interpretation/card rendering. `src/content.js` handles menu lifecycle, request generations and restoration. User strings render with DOM text APIs; native grids are temporarily hidden, never deleted or moved.

Permissions: `storage` for public configuration and session authorization; `alarms` for hourly token validation. Host access is limited to Twitch API/auth endpoints, and the content script runs only on `www.twitch.tv`. There is no `identity`, `tabs`, or broad all-sites permission. Twitch CDN images load as data, not executable code. Review [the privacy policy](privacy.html) and [release disclosures](store-assets/listing.md) before distributing a changed build.

## Commands and verification

Use Node 22+ and Python 3. Install test dependencies with `npm ci`; jsdom is test-only. Run `npm test` and `npm run check`. There is no JavaScript build step: Chrome loads the source directly. Fixtures do not prove real OAuth interoperability or live followed-channel correctness.

The release tool is `python3 scripts/release.py`. Its `package` command creates an explicitly labeled development draft when no client ID is supplied. `package --client-id PUBLIC_ID` injects that public ID into the ZIP only; replace `PUBLIC_ID` with your registered application ID. `--out` selects a `.zip` destination (inside this repo it must be under ignored `artifacts/`). `inspect ZIP_PATH` validates an existing archive’s allowlist, manifest, local dependencies, icons and configuration. Both commands accept `--plain`. Packaging prints the path, size and SHA256; a configured archive still needs real OAuth and release acceptance.

The optional real-browser self-check `node scripts/verify-unpacked.mjs [ZIP_PATH]` loads an inspected archive into a temporary isolated Chrome profile, verifies setup/bundled pages/the logged-out Twitch menu, and saves screenshots under `artifacts/`. It requires Chrome, Python3 and unzip, accepts `--plain` and `--details`, and honors `TWITCH_VERIFY_BROWSER`. It uses no user account; live Twitch availability is required.

The browser launcher `./scripts/open-verification.sh` accepts `install`, `fortnite`, or `navigation`; `--plain` (or `CLI_PLAIN=1`) removes emojis. It defaults to `google-chrome`; `TWITCH_VERIFY_BROWSER` selects another executable. Test and syntax-check commands have no project-specific options.

See the [release checklist](docs/chrome-web-store-release.md), [smoke checks](docs/smoke-tests.md), [verification evidence](docs/verification.md), [release implementation plan](plans/release-preparation.md), and [store listing/reviewer draft](store-assets/listing.md). The [initial implementation](plans/twitch-following.md) and [GitHub publication](plans/publish-github.md) retain their historical evidence; they are not evidence of Chrome Web Store publication.

## License

[MIT](LICENSE), copyright 2026 Kevin Mok. Independent project; not affiliated with or endorsed by Twitch or Google.
