# Twitch Following smoke checks

Load the unpacked extension, connect a registered public Twitch application, and check the real category UI. These are the complete manual acceptance steps; [verification.md](verification.md) identifies the logged-out checks already observed and the credential-dependent checks still prepared.

## Setup and authorization

**Action:** Load the actual release package in `chrome://extensions`, inspect extension errors, and open setup via the toolbar icon. For a configured package, choose Connect Twitch without entering a client ID. For a source/draft build, enter your registered Public application’s client ID. Open Twitch’s activation URL/code, approve, and return to the setup tab.

**Expected:** Setup shows the code and countdown, then the connected login. The source/MIT and privacy links work. No redirect callback or client secret is used. Bearer/device/refresh tokens never appear in setup/content messages, console or page DOM. Token/account/pending state live only in TRUSTED_CONTEXTS session storage; local storage contains only the public client ID. Cancel, denied/expired codes and network errors permit a new connection. Reopening setup resumes pending approval; two setup tabs converge after approval.

**Action:** Disconnect while Following is loading, reconnect as another account, and retry. Revoke authorization in Twitch Connections and request a new snapshot. Restart Chrome and inspect hourly validation alarm.

**Expected:** Old results cannot paint after account changes. Session token/account clear on disconnect or 401; legacy persistent tokens are removed on upgrade. Delayed operations cannot restore credentials or erase a newer connection. Chrome restart and extension reload/update/disable require reconnect; public client ID remains. Validation runs when the worker starts and hourly while connected. Offline revocation clears session credentials and can be completed manually in Twitch.

## Menu, sorting, cards

**Action:** After changing local extension files, open `chrome://extensions`, click Reload (the circular arrow) on Twitch Category Following, then refresh the Twitch category tab and open Sort by → Following. Keep Extensions pinned for repeated retests; this project has no automatic reload watcher.

**Expected:** The new heart icon appears, clicking Following closes the menu, and the control displays Following with cards or connection guidance. Refreshing Twitch alone does not reliably activate updated extension files; no browser restart or reinstall is needed.

**Action:** On Fortnite Live Channels, open Sort by repeatedly; click Following's label and heart icon with a real mouse (not a scripted click). Then select it using Tab/arrow keys/Enter, and Escape out of the menu. Repeat after Twitch recreates its menu and in both themes.

**Expected:** Exactly one Following item with a matching monochrome heart, centered beside its label. Its icon size, left edge, label gap, and row height match the native entries, including after Twitch loads styles or recreates the menu. Mouse selection closes the dropdown, changes the control to Following, and displays cards or a connection state. Visible keyboard focus and selected state remain correct; native entries remain keyboard reachable. Loading, connection, retry and empty states are readable.

**Action:** With a live follow list exceeding one API page, compare against all official API pages. Include channels absent from the sidebar; check viewer counts 94, 7,500 and 689, equal-viewer logins, duplicate broadcasters and a channel in another game.

**Expected:** Every matching broadcaster once, order 7,500 → 689 → 94, equal counts ordered by login, other games excluded. Channel links open the right channel. No false complete list after a failed page.

**Action:** Compare cards with native cards at 390, 768, 1280 and 1440 px; switch Twitch between light and dark mode, inspect long titles and tags, missing avatars, and narrow viewports.

**Expected:** Native-like spacing, aspect ratios, typography, overlays and responsive columns; no overlap/overflow, invented badges, or fake controls. Missing avatar has a safe initial fallback.

## Filters and navigation

**Action:** Apply one/multiple languages and stream tags before and after selecting Following, including persisted language state with the menu closed, an unknown filter, and a Category Tag visible beside the category heading but unavailable from Helix.

**Expected:** Supported filters use the existing snapshot (language OR, stream-tag AND). Verified header category tags apply to all streams in that category. Unsupported/unreadable filters show a limitation rather than an unfiltered success. Compare combinations against native filtering; full parity across Twitch/localization changes is not yet established.

**Action:** Change categories during loading; use back/forward, including two native sort URLs for the same category; select Videos/Clips; return to Live Channels; force Twitch to replace the native grid or remove only the Following panel.

**Expected:** Old category results never overwrite the new page. Other tabs/native sorts restore the untouched native grid and label; the saved Following preference resumes after returning from Videos/Clips. Following reattaches without duplicate panels; route and heading must agree before fetching. Same-category sort history exits Following; filter-only history reuses its snapshot.

**Action:** Select each native sort after Following, then scroll/load more. Repeat with extension disabled/uninstalled and reload.

**Expected:** Native cards, ordering, loading, controls, and scrolling recover. No stale hidden grid remains. Removing the extension then reloading is the rollback.

## Failures and recommendation gate

**Action:** Go offline during page two, trigger a rate limit, expire authorization, and remove the expected grid/menu structure.

**Expected:** Actionable retry/reconnection/compatibility state; no partial-success snapshot and no broken native navigation. Network recovers through explicit retry.

**Action:** Check following-only output and then restore the native recommendation sort.

**Expected:** No recommendation tail is promised or synthesized. Native recommendations return when native sorting is restored. A future tail needs proof of native pagination/scrolling/rerendering/deduplication/order/restoration before inclusion.

## Release package and store installation

**Action:** Follow the [release guide](chrome-web-store-release.md), extract the exact candidate ZIP, and load the extracted folder unpacked in a fresh profile. Open setup and its help link, connect using the verified release OAuth configuration, and select Following then a native sort.

**Expected:** Manifest is at the ZIP root; all runtime/icon/help references resolve. No development files or credentials are included. Setup works without prior extension storage, real followed cards appear, and native content returns. Device authorization uses the registered product’s public client ID; it does not rely on an extension-ID callback.

**Action:** Install the approved test release from its store page in a clean profile, repeat the menu/account checks above, and test updating an existing installation of the same item.

**Expected:** Store-installed authorization and native restoration pass independently of unpacked previews. The extension ID remains the same; stored settings and credentials are preserved or migrated according to the documented credential design, and any required reconnection is explained. Record the tested version and result before public launch.

## Default and remembered sorting

**Action:** With no saved `tfFollowingSort` preference in Twitch site storage, refresh Fortnite Live Channels. Open the sort menu; use Home, ArrowDown and Enter. Choose a native sort and reload, then choose Following and reload again. Repeat in another category and after Videos/Clips.

**Expected:** Following appears first and activates by default without opening the menu. Home reaches Following; ArrowDown reaches Recommended For You. Native selection restores Twitch and persists across reloads. Choosing Following persists and resumes on category/Live Channels visits, with cards or actionable connection guidance. Clearing Twitch site data resets the default.
