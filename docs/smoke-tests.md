# Twitch Following smoke checks

Load the unpacked extension, connect a registered public Twitch application, and check the real category UI. These are the complete manual acceptance steps; [verification.md](verification.md) identifies the logged-out checks already observed and the credential-dependent checks still prepared.

## Setup and authorization

**Action:** Load this folder in `chrome://extensions`; inspect extension errors, open setup, copy the callback and register it exactly in a Public Twitch app. Connect using your own client ID.

**Expected:** Setup displays the generated chromiumapp callback and connected login. No client secret or token appears in the popup, content-script messages, console, or page DOM. Token storage has TRUSTED_CONTEXTS access. A wrong registered callback/state fails safely. Browser cancellation permits retry.

**Action:** Disconnect while Following is loading, reconnect as another account, and retry. Revoke authorization in Twitch Connections and request a new snapshot. Restart Chrome and inspect hourly validation alarm.

**Expected:** Old results cannot paint after the account changes. Local token/account clear on disconnect or 401. Delayed earlier operations cannot restore credentials or erase a newer connection. Setup offers reconnection. Validation runs on worker/browser startup and hourly. Offline revocation clears local credentials and can be completed manually in Twitch.

## Menu, sorting, cards

**Action:** On Fortnite Live Channels, open Sort by repeatedly; select Following using Tab/arrow keys/Enter, then Escape out of the menu. Repeat after Twitch recreates its menu.

**Expected:** Exactly one Following item, visible focus, correct selected state in menu/control; native entries remain keyboard reachable. Loading, connection, retry and empty states are readable.

**Action:** With a live follow list exceeding one API page, compare against all official API pages. Include channels absent from the sidebar; check viewer counts 94, 7,500 and 689, equal-viewer logins, duplicate broadcasters and a channel in another game.

**Expected:** Every matching broadcaster once, order 7,500 → 689 → 94, equal counts ordered by login, other games excluded. Channel links open the right channel. No false complete list after a failed page.

**Action:** Compare cards with native cards at 390, 768, 1280 and 1440 px; switch Twitch between light and dark mode, inspect long titles and tags, missing avatars, and narrow viewports.

**Expected:** Native-like spacing, aspect ratios, typography, overlays and responsive columns; no overlap/overflow, invented badges, or fake controls. Missing avatar has a safe initial fallback.

## Filters and navigation

**Action:** Apply one/multiple languages and stream tags before and after selecting Following, including persisted language state with the menu closed, an unknown filter, and a Category Tag visible beside the category heading but unavailable from Helix.

**Expected:** Supported filters use the existing snapshot (language OR, stream-tag AND). Verified header category tags apply to all streams in that category. Unsupported/unreadable filters show a limitation rather than an unfiltered success. Compare combinations against native filtering; full parity across Twitch/localization changes is not yet established.

**Action:** Change categories during loading; use back/forward, including two native sort URLs for the same category; select Videos/Clips; return to Live Channels; force Twitch to replace the native grid or remove only the Following panel.

**Expected:** Old category results never overwrite the new page. Other tabs/native sorts restore the untouched native grid and label; choose Following again after returning from Videos/Clips. Following reattaches without duplicate panels; route and heading must agree before fetching. Same-category sort history exits Following; filter-only history reuses its snapshot.

**Action:** Select each native sort after Following, then scroll/load more. Repeat with extension disabled/uninstalled and reload.

**Expected:** Native cards, ordering, loading, controls, and scrolling recover. No stale hidden grid remains. Removing the extension then reloading is the rollback.

## Failures and recommendation gate

**Action:** Go offline during page two, trigger a rate limit, expire authorization, and remove the expected grid/menu structure.

**Expected:** Actionable retry/reconnection/compatibility state; no partial-success snapshot and no broken native navigation. Network recovers through explicit retry.

**Action:** Check following-only output and then restore the native recommendation sort.

**Expected:** No recommendation tail is promised or synthesized. Native recommendations return when native sorting is restored. A future tail needs proof of native pagination/scrolling/rerendering/deduplication/order/restoration before inclusion.
