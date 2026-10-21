# Chrome Web Store listing draft

Use this copy for the first following-only release after real-account acceptance passes. Replace the remaining dashboard fields with verified values, upload genuine screenshots and review every disclosure against the final package before submission.

## Store copy

**Name:** Twitch Category Following

**Short description:** Show all live follows in a Twitch category, sorted by viewers.

**Detailed description:**

Find your live followed channels in the Twitch category you are browsing, including channels missing from the sidebar.

Open source under the MIT license: https://github.com/Kevin-Mok/twitch-following-extension. Review the code and permissions before connecting.

- Adds Following to a category’s Sort by menu.
- Loads your live follows through Twitch’s official API and sorts matching channels by viewer count.
- Applies supported language and tag filters.
- Restores Twitch’s native feed when you choose another sort.

Connect your Twitch account from the extension’s setup tab, approve access on Twitch, then open a category’s Live Channels tab and choose Sort by → Following.

Built for transparency: limited permissions, no client secret, no analytics and no publisher backend. Authorization stays in browser-session memory. Reconnect after restarting Chrome, reloading, updating or disabling the extension, or after authorization expires. Select Following again to refresh results; there is no automatic stream refresh.

This first version supports Twitch’s English interface and displays followed channels only. Twitch layout changes or unsupported filters may limit compatibility. No recommendation tail, analytics, advertising or publisher backend. Independent project; not affiliated with or endorsed by Twitch or Google.

## Single purpose and permission justifications

**Single purpose:** Show the user’s live followed Twitch channels within the current category, ordered by viewers.

| Dashboard permission/access | Justification |
| --- | --- |
| `storage` | Keep authorization/account data in extension session memory and the public application client ID in local storage. |
| `alarms` | Validate connected Twitch authorization hourly, as required by Twitch. |
| `https://id.twitch.tv/*` | Request and poll device authorization, validate access tokens, and revoke authorization on disconnect. |
| `https://api.twitch.tv/*` | Resolve categories, retrieve followed live streams, and retrieve channel avatars through Helix. |
| `https://www.twitch.tv/*` content-script access | Add the Following menu entry, read current category/filter context and display matching cards. |

**Remote code:** No remotely hosted executable code. Runtime JavaScript/CSS is packaged with the extension. Twitch API responses and image files are data, not executed code. Recheck the final ZIP before certifying.

## Data disclosure review

Use the dashboard’s current definitions. Authentication information is handled in memory; personal identifiers include the connected Twitch user ID/login. Review website-content and browsing-context categories for the category, filters and displayed stream information. Do not declare “no user data” simply because no publisher server receives it.

Confirm the limited-use certifications against the final code: data serves the stated Following feature, is not sold, is not used for advertising or credit decisions, and is not transferred for unrelated purposes. The public policy must match the submitted package. Final selections require the publisher’s review; this draft is not a pre-filled certification.

## Reviewer test instructions

1. Install the extension and open its toolbar action. The release package includes the publisher’s public Twitch application ID; developer registration and client secrets are unnecessary.
2. Choose Connect Twitch. Follow the Twitch authorization link/code, approve `user:read:follows`, and return to the setup tab. Keep setup open until it displays the connected login.
3. On Twitch, follow channels if necessary and choose a category where at least one is currently live. Open Live Channels → Sort by → Following. Matching live follows should appear in viewer order; zero matching channels produces an empty state.
4. Choose a native sort; Twitch’s normal feed returns. Try a different category, supported filters and both themes.
5. Disconnect in setup. Following should request reconnection. Reconnect using your own Twitch account, then restart Chrome and confirm reconnection is required again.

No paid account is needed. Reviewers authorize their own Twitch account. Do not share passwords, client secrets, access tokens or authorization codes in the listing or repository. If restricted review access becomes necessary, arrange it through the dashboard’s private review fields with a permitted dedicated account.

## Remaining publisher inputs and evidence

- [ ] Register/configure the product’s Public Twitch application; provide its **public client ID** to the release packager. Do not publish the unconfigured development build.
- [ ] Confirm the production package’s version, Git commit and ZIP; pass fresh automated and account-backed smoke checks.
- [x] Hosted help: https://kevin-mok.github.io/twitch-following-extension/help.html
- [x] Hosted privacy policy: https://kevin-mok.github.io/twitch-following-extension/privacy.html
- Both pages and their shared stylesheet/icon were anonymously fetched with HTTP 200 and matched committed source. Publisher review against the final configured build still applies.
- [ ] Confirm support URL: `https://github.com/Kevin-Mok/twitch-following-extension/issues`; no support email has been invented.
- [ ] Choose the closest current store category, English as listing language, regions, and initial private/unlisted visibility. Confirm account verification, required fee and applicable trader declarations in the dashboard.
- [ ] Upload the packaged 128×128 icon, 440×280 promotional tile and at least one genuine screenshot (1280×800 or 640×400). Store screenshots remain outstanding until captured from the authenticated final build.
- [ ] Enter this single purpose, permission justifications, reviewed data categories and limited-use answers in the dashboard.
- [ ] Record the reserved store item ID and URL, submit for review, then test the store-installed version before changing that same item to Public.

Official execution requirements and sources are in the [release guide](../docs/chrome-web-store-release.md). This file is draft copy; nothing has been submitted or approved.
