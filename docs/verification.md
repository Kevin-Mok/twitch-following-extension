# Twitch Following verification

This record separates observed Chrome behavior from deterministic fixtures and checks requiring your Twitch account. Load the extension, register the exact callback shown in setup, authorize, then run the grouped checks in [smoke-tests.md](smoke-tests.md).

## Observed evidence — 2026-10-20

| Surface | Observed result | Boundary |
| --- | --- | --- |
| Visual references | Both supplied screenshots reviewed; Twitch's existing cards/menu guide the styles. | Screenshots alone do not prove the extension matches. |
| Current Twitch DOM | Live Fortnite inspected in Chrome: `#browse-sort-drop-down`, `#browse-sort-drop-down-list` with listbox/options, `[data-target="directory-container"]`, and `game-directory-live-tab`. | English desktop UI, logged out. |
| Filters | Selecting English left the URL unchanged and saved `languageDirectoryFilters=["en"]`; a stream-tag click set `tl=English`. Category tags appear as `/directory/tags/…` header links. | Reading these inputs is verified; full filtered-follow parity is not. |
| Unpacked extension | Chrome 146.0.7680.177 loaded the actual source directory using DevTools' extension loader in a temporary profile. | No personal browser profile, token, or account used. |
| Setup | Options page reached “Not connected” and generated the exact `https://<extension-id>.chromiumapp.org/` callback. | Registration and OAuth approval not performed. |
| Menu/state | Exactly one Following option appeared. Dispatched End/Enter keyboard events focused and selected it; trigger displayed Following and the panel displayed reconnect guidance. | Tests exercise the handlers; full physical-key/screen-reader acceptance remains manual. |
| Restoration | Reopening the menu and selecting Viewers (High to Low) removed the extension panel, removed hidden-grid markers, restored the native label, and left native cards visible. | Full scrolling, native recommendations, and all sort/tab combinations are still manual. |
| Card renderer | Imported the actual `makeCard` module on live Twitch with six explicitly labeled fixtures, public thumbnails/avatars, and synthetic counts. Inspected light/dark screenshots at 1440 px; Twitch's own Dark Theme control changed text/background correctly. | Renderer preview only, not an authenticated Following snapshot. Channel hrefs were inspected, not followed. |
| Responsive cards | Active-tab resizing measured 4/3/2/1 columns at 1440/1280/768/390 px, with no panel overflow. Inspected the narrow dark screenshot and long-title/avatar-fallback behavior. | Intermediate/narrow checks used dark theme; the full two-theme matrix remains manual. Twitch's native sort toolbar clips at 390 px. |

Chrome reported Twitch-origin GraphQL integrity and GPU warnings. The checked logged-out extension path completed; these warnings do not establish that Twitch's entire feed is healthy. Screenshots are local ignored artifacts under `artifacts/`, not required extension assets.

## Automated checks

Final run: `npm test` — **60 tests passed, 0 failed, exit 0**; `npm run check` — **exit 0**. All manifest file references and local README/smoke-check links resolve. Tests use synthetic responses and markup; they do not authorize Twitch or prove all current DOM behavior. The launcher fixture requires process spawning, which the restricted namespace denied; the complete suite passed outside that namespace.

- Core fixtures: every cursor page, duplicate broadcasters, another category, numeric 7,500 → 689 → 94 ordering, login ties, language/tag/category-tag filters, empty results, malformed responses, page failure, repeated cursors, and 100-ID avatar batches.
- Authorization/worker fixtures: callback/state/identity/sender boundaries, no tokens in replies, missing/expired/revoked credentials, safe API errors, all-or-nothing pagination, and interleavings of credential reads/writes, Connect, Disconnect, validation, and account notifications.
- DOM fixtures: menu recreation, keyboard selection, text-safe rendering/channel links, persisted filters, category verification, stale results, tab exit, native restoration, React panel removal, and query-only/browser-history changes.
- Launcher fixture: each verification action opens its intended browser URL; unknown actions fail with usage.

Defining tests were observed failing before the corresponding fixes. The deeper review reproduced six credential races and three additional DOM lifecycle bugs; their regressions pass after the changes. See [runtime findings](postmortem/2026-10-20-unpacked-runtime.md).

Independent final review rechecked the credential fixes and message/storage/callback boundaries, and reran the 24 worker, 3 authorization, and 15 lifecycle cases successfully. The subsequent fresh unpacked Chrome run again showed one Following entry, reconnect guidance, and complete native-grid unhide/restoration (27 native cards present).

## Pointer and icon repair — 2026-10-21

The focus regressions failed with zero snapshot requests before repair. Final checks: `npm test` **62 passed, 0 failed**, and `npm run check` exited 0. Independent review found a selected-hover contrast issue, corrected by limiting hover styles to unselected rows; the final review found no remaining actionable issue.

On live Twitch in isolated Chrome, the current content source/CSS was injected with a synthetic disconnected runtime (no extension credentials or API requests). A genuine accessibility-UID mouse click reproduced focus loss and menu reopening before repair. Preserving primary-mousedown focus made selection display Following, close the menu (`aria-expanded=false`), retain trigger focus, and display the fixture connection state. Physical End/Enter exposed the same dismissal on keyboard focus transfer; the scoped focusout guard then kept the option focused until Enter selected Following and closed the menu. The heart measures 24×24 px, is decorative/non-focusable, and was visually inspected in the light menu. Selected hover resolves to purple `rgb(145,71,255)` with white text. Reopening produces exactly one option.

Native restoration through a DOM click on Viewers (High to Low) showed the native label, no extension panel, and zero hidden-grid markers. A native accessibility-UID lookup was unavailable in that modal snapshot, so this restoration check uses its DOM click handler rather than claiming genuine native mouse input. Full account-backed behavior, touch, screen readers, dark-theme visual acceptance, and fresh unpacked-extension activation remain manual. Reload the extension in `chrome://extensions` and then reload the Twitch tab to activate these local source changes.

## Direct browser checks

Working directory: the cloned repository root. No sudo. These launch real Chrome pages and print the next manual action; launching a page alone does not pass the check. `google-chrome` must be installed (or set `TWITCH_VERIFY_BROWSER`).

`./scripts/open-verification.sh install` opens Extensions. Load this folder unpacked, open setup, register its callback, and connect. Expected: the connected login is shown after authorization.

`./scripts/open-verification.sh fortnite` opens Fortnite. Select Following, compare your category-matching live follows and viewer order, change filters, then select a native sort. Expected: correct followed cards, then native feed restoration.

`./scripts/open-verification.sh navigation` opens Just Chatting. Select Following, navigate categories while loading, use Back/Forward and Videos/Clips. Expected: no old-category cards, duplicates, or hidden native grids on tab/sort exit.

## Prepared or blocked acceptance

No public client ID or user authorization was available. Real OAuth approval/cancellation, reconnect/expiry/revocation, multiple accounts, all live followed pages, authenticated card links, empty results, language/tag parity, and real API rate-limit/network failures remain unverified. Run [the exact Action/Expected checklist](smoke-tests.md) with your own app/account; do not share an access token or client secret.

Complete the account-backed card comparison at 390, 768, 1280 and 1440 px in both themes. The observed renderer preview establishes the layout/theme behavior listed above, but cannot establish that the correct authenticated channels were retrieved.

The recommendation tail is intentionally omitted under the accepted following-only MVP fallback. Its native loading/scrolling/rerendering/deduplication/restoration gate has not passed; no replacement recommendation algorithm or private API is used. English UI and recognizable category slugs are the supported integration scope; unsupported shapes retain the native feed.

## Reproduce and rollback

Use Node 22+, install development dependencies with `npm ci`, then run `npm test` and `npm run check`. Chrome loads the source directory directly; no build step or backend is involved. Disable/remove the extension and reload Twitch to roll back. The initial implementation used a sandbox with a protected empty Git placeholder. The subsequent public-repository delivery is recorded in [the publication plan](../plans/publish-github.md).

## Heart alignment — 2026-10-21

Atomic fix: reproduce the CSS collision, strengthen the owned row selector, match native geometry, then check the recreated menu and regression suite. Only menu CSS changes; mouse/keyboard handlers are unchanged.

- RED: with Twitch's `.eaHBmI { display:block }` loaded after the extension stylesheet, the row became block layout, its icon/text centers differed by 6.5 px, its icon was indented 6 px, and it used 24 px rather than native 20 px icons.
- GREEN: loaded the updated source stylesheet into the existing live Twitch preview. The same later native rule left the row flex; center difference was 0.296875 px, left-edge difference 0 px, both icons 20 px, and both rows 28 px. Reopening the native menu left exactly one Following row with matching size/left edge.
- Automated: Node v22.15.0, `npm test` passed 62 tests, 0 failed; `npm run check` passed. The first sandboxed test run could not spawn the launcher processes; the unrestricted rerun passed.
- Scope: live preview CSS and English desktop menu geometry checked. Fresh unpacked-extension activation, physical keyboard/mouse acceptance, and the complete theme matrix remain manual. Reload the extension in `chrome://extensions`, refresh Twitch, then run the menu Action/Expected check in [smoke-tests.md](smoke-tests.md).
- Cursor prompt: “Review the Following row in src/content.css against docs/smoke-tests.md. Confirm the heart and label share native menu alignment even when Twitch CSS loads later; preserve existing selection handlers.”
- Suggested commit: `fix: align Following heart with native sort icons`.

The [tooling incident](postmortem/2026-10-21-memory-search-option.md) records lookup and sandbox limitations encountered during verification. Rollback: revert the two menu CSS rules and reload the extension and Twitch.

## Release preparation 0.2.0 — 2026-10-21

The runtime now uses Public-client device authorization and trusted session-only credentials, replacing the historical implicit callback/persistent-token setup described earlier in this record. No real Twitch application ID, consent or account-backed follow list was available.

- Defining RED/GREEN fixtures cover device initiation, safe activation URLs including Twitch’s documented query parameters, polling intervals/slow-down/one in-flight request, malformed/denied/expired responses, session locality, legacy credential removal, and stale connect/disconnect/validation writes. Independent review’s two-setup-tab completion reproducer failed before its fix; later polls now return the valid current account without credentials.
- Setup UI fixtures cover configured/developer setup, safe approval code/link, automatic polling/resume/cancel/expiry and actionable recovery. The live region avoids announcing the countdown every second.
- Release fixtures cover deterministic ZIP generation, public-ID injection without source mutation, exact MIT license inclusion, local dependency closure, remote executable-reference rejection, unsafe archives and output-path/symlink restrictions.
- First integration suite: 87 passed, 0 failed; syntax checks passed. Final integration suite after lifecycle fixes: **89 passed, 0 failed**, `npm run check` exit 0. The 19-file draft ZIP is 33,567 bytes, SHA256 `a61639f79e6c9a2f96d3c041c77d72a2c3aab927e4bebb835ebf1d3398aa2b64`; plain/default builds match byte for byte.
- **Actual ZIP runtime:** `node scripts/verify-unpacked.mjs` loaded the inspected 0.2.0 draft source into a new temporary Chrome 156.0.8078.47 profile through DevTools’ extension loader. Real setup/status messaging reached Not connected; the developer-ID field was visible for the blank-ID draft, token absent in local/session storage, permissions exactly storage/alarms, and no popup configured. Bundled help/privacy images loaded.1280×800 light and 390×844 dark setup and narrow public pages had no horizontal overflow. Saved screenshots were visually inspected; no exceptions observed in inspected pages in this run; the script does not monitor service-worker exception events.
- **Live Twitch:** the actual installed content script inserted exactly one flex Following row on the logged-out Fortnite page. Its icon size/left edge matched the native menu. A genuine 1280×800 capture is in `store-assets/screenshot-menu-1280x800.png`; visible cards are native recommendations, not authenticated follows. Local QA setup/help/privacy screenshots remain ignored under artifacts/.
- Original icon sizes 16/32/48/128 and promo 440×280 were checked and visually inspected. The user explicitly chose MIT; source/license links and concrete safeguard descriptions appear in setup, help, privacy, README and listing copy. No independent audit/zero-risk claim is made.

Browser verification requires Node 22+, Python3, unzip and a compatible Chrome with DevTools extension-loading support. Use `TWITCH_VERIFY_BROWSER` to select another executable, `--plain` for ASCII, and `--details` for raw failure diagnostics. It uses a disposable profile, never the user’s existing account, and writes only screenshots under artifacts/. Live Twitch availability is a dependency; no credentials are required for these logged-out checks. The script’s runtime assertions are its integration self-check.

Working directory: repository root; no sudo. The direct browser command is:

node scripts/verify-unpacked.mjs artifacts/twitch-following-0.2.0-draft.zip

Expected example:
```text
Loaded actual ZIP source in isolated Chrome
Real Twitch category menu contains exactly one aligned Following item; genuine screenshot captured.
Real extension setup, bundled help/privacy, limited permissions and narrow/dark layouts passed; no exceptions observed in inspected pages.
```

Real OAuth interoperability, live follows/filter correctness, full assistive-technology/physical-input acceptance and actual store install/update remain unchecked. Those manual gates are preserved in `docs/chrome-web-store-release.md` and `docs/smoke-tests.md`.
