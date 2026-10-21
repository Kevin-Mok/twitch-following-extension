# Publish Twitch Category Following in the Chrome Web Store

The local release work is prepared: supported Public-client authorization, session-only credentials, open-source licensing, help/privacy pages, artwork, listing copy and a reproducible ZIP command. Complete the account steps below, build with the product’s public client ID, run real-account acceptance, then submit an unlisted test release before making the same item public.

**Updated 2026-10-21 · Candidate 0.2.0.** This is not a published extension or a security certification. Check the linked official requirements when executing the remaining steps. Completed local work is marked below; real OAuth and store approval are still unverified.

## 1. What is done

- [x] Use Twitch Public-client **device authorization**, replacing the incompatible Public/implicit combination. Setup displays Twitch’s code/link and polls at the required interval; the worker validates the resulting identity before use. [Twitch device flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow).
- [x] Keep bearer token, account and pending device state in trusted browser-session memory. Only the public client ID persists locally; legacy local credentials are cleared. No client secret or refresh token is stored. Reconnect after Chrome restart, extension reload/update/disable or expiry. [Chrome session storage](https://developer.chrome.com/docs/extensions/reference/api/storage).
- [x] Show data-use disclosure, cancellation, approval countdown and source links in a persistent setup tab. Restrict activation links to Twitch. Remove the unused `identity` permission.
- [x] Add the user-selected [MIT license](../LICENSE). Emphasize inspectable source and specific safeguards, rather than claiming “100% safe.” Source: [Kevin-Mok/twitch-following-extension](https://github.com/Kevin-Mok/twitch-following-extension).
- [x] Bundle working [help](../help.html) and [privacy](../privacy.html) pages; remove the setup link to developer-only documents.
- [x] Add original icons at 16/32/48/128 px and [440×280 promotional artwork](../store-assets/promo-440x280.png). Artwork is independent of Twitch’s logo and labels the project open source/MIT licensed.
- [x] Prepare [listing text, permission justifications, privacy-category prompts and reviewer instructions](../store-assets/listing.md).
- [x] Implement and exercise [release packaging](../scripts/release.py): deterministic ZIP, public-ID injection without modifying source, included license, local-dependency/icon inspection, excluded development files and archive-path checks.
- [x] Run automated and actual unpacked Chrome checks, with exact results and limits in [verification.md](verification.md). The generated draft ZIP is in ignored `artifacts/`.

The account registration, real consent, live followed-channel acceptance and store review below cannot be replaced by fixture tests. No public client ID has been supplied. The generated ZIP therefore says **DRAFT**, shows developer setup, and must not be submitted as the finished public release.

## 2. Register the product’s Twitch application — manual

- [ ] Sign into the [Twitch developer console](https://dev.twitch.tv/console/apps) with a verified email and 2FA. Register a uniquely named application for this extension and choose the **Public** client type. Choose the appropriate available application category. [Official registration requirements](https://dev.twitch.tv/docs/authentication/register-app/).
- [ ] Copy the application’s **client ID**. It is public and can be included in this product’s extension package. Do not provide or embed a client secret, access token or refresh token.
- [ ] If the console requires a redirect URL, enter an HTTPS project/help URL you control as registration metadata. Device authorization does not send or use a `redirect_uri`; the extension has no callback to register. Confirm the current console accepts the Public application and complete the real flow below. Do not revive the old implicit callback instructions.

The publisher registers one application for this product; ordinary users authorize their own Twitch accounts. They should not have to register developer apps. Device authorization also removes the dependency on a permanent store ID for OAuth. The store item still needs to remain stable for installs and updates.

## 3. Build and verify the final candidate

Working directory for all commands: repository root. No sudo. Python 3 is sufficient for packaging; Node 22+ is needed for test checks.

For a development draft:

python3 scripts/release.py package

Expected example:
```text
Twitch Category Following 0.2.0: DRAFT (no Twitch client ID; not ready for submission)
Validated 19 allowlisted files and local dependencies
ZIP: .../artifacts/twitch-following-0.2.0-draft.zip
SHA256: ...
```

After registration, replace the literal `YOUR_PUBLIC_CLIENT_ID` placeholder with the product’s public client ID:

python3 scripts/release.py package --client-id YOUR_PUBLIC_CLIENT_ID

Expected example:
```text
Twitch Category Following 0.2.0: CONFIGURED (public client ID included; OAuth/runtime verification still required)
ZIP: .../artifacts/twitch-following-0.2.0.zip
SHA256: ...
```

Inspect that configured archive:

python3 scripts/release.py inspect artifacts/twitch-following-0.2.0.zip

Expected example:
```text
Validated 19 allowlisted files and local dependencies
```

The CLI adds decorative emojis by default; `--plain` makes output ASCII. `--out` changes the ZIP destination; outputs in this repository must stay under ignored `artifacts/`. A successful archive inspection is not a credential scan or evidence of real authorization.

**Package contents:** root `manifest.json`, `options.html`, `help.html`, `privacy.html`, `public.css`, `LICENSE`, runtime `src/*.js`/`src/*.css`, and referenced icons. No Git metadata, dependencies, tests, scripts, incident reports, browser profiles, development screenshots or credentials. The manifest is at the archive root, as Chrome requires. [ZIP preparation](https://developer.chrome.com/docs/webstore/prepare/).

- [ ] Run `npm test` and `npm run check` on the final candidate source. Save results, source commit, ZIP and SHA256 in [verification.md](verification.md).
- [ ] Extract the actual configured ZIP into a fresh folder, load that folder unpacked in a clean Chrome profile, and verify setup hides the developer-ID field and uses the publisher app.
- [ ] Run all [Action/Expected smoke checks](smoke-tests.md) with real Twitch approval: cancellation, reconnect/disconnect/revocation, expiry, empty results, supported filters, category navigation, native restoration, both themes and relevant widths. Compare live multi-page follow results against the official API where possible. Never mark a case passed just because its fixture passes.
- [ ] Verify closing/reopening setup resumes a pending code; separate setup tabs converge on the connected account; Chrome restart/extension update deliberately requires reconnect. Test the upgrade clears old local tokens.
- [ ] Confirm no extension runtime errors or credentials in page DOM/messages/logs. Refreshing Twitch alone does not activate source changes: reload the extension first.

## 4. Finalize public URLs, images and disclosures

GitHub Pages has been enabled for this public repository. The prepared static URLs are [Help](https://kevin-mok.github.io/twitch-following-extension/help.html) and [Privacy](https://kevin-mok.github.io/twitch-following-extension/privacy.html); deployment is verified after the source push, with the receipt in [verification.md](verification.md). Use them in the store only after they return the reviewed pages while signed out. No application backend is needed.

- [ ] Confirm the published help and privacy URLs open while signed out. Review the policy against the exact candidate, its effective date, publisher name and support contact. Local extension URLs do not serve as public listing links.
- [ ] Use the public source URL prominently: `https://github.com/Kevin-Mok/twitch-following-extension`. Link the MIT license. Explain specific safeguards: limited Twitch access, session-only credentials, no analytics, no publisher backend and no client secret. Open source permits inspection; it does not establish an independent audit or guarantee no vulnerabilities.
- [ ] Review the prepared [store copy](../store-assets/listing.md) and select the dashboard’s actual data categories. Account identifiers, authentication information and the page/filter context are handled even without a publisher server. Keep policy, UI and dashboard answers consistent. [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [local-data and secure-handling requirements](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/).
- [ ] Disclose data use before authorization and assess any additional consent required by the final behavior. The setup already describes its data use; a privacy-policy link alone is not sufficient where prominent consent is required. [Disclosure requirements](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements).
- [ ] Upload the 128×128 icon and 440×280 promo. Review genuine product screenshot(s) under `store-assets/` and their evidence notes. Capture additional authenticated cards if desired; do not present synthetic channels as real account results. Required screenshot sizes are 1280×800 or 640×400. [Image requirements](https://developer.chrome.com/docs/webstore/images/).

**Current permission justifications:** `storage` for public configuration/session authorization; `alarms` for hourly validation; `id.twitch.tv` for device flow/validation/revocation; `api.twitch.tv` for official category/follow/avatar requests; Twitch-only content scripts for the menu, category/filter context and cards. No `identity`, `tabs` or all-sites permission. Data images are restricted to `static-cdn.jtvnw.net`; no remote executable code. Recheck these statements if code changes. Twitch requires token validation at startup and hourly. [Twitch validation requirements](https://dev.twitch.tv/docs/authentication/validate-tokens/).

## 5. Create the store account and listing — manual

- [ ] Choose the Google account that will own the product. Register in the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole), accept the terms and pay the one-time fee shown there. Enable Google 2-Step Verification, use monitored contact details and complete applicable verification/trader declarations. [Registration](https://developer.chrome.com/docs/webstore/register/), [two-step requirement](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification), [account setup](https://developer.chrome.com/docs/webstore/set-up-account/).
- [ ] Choose **Add new item** and upload the configured, accepted ZIP. Record the resulting item ID. Keep using this same item for beta, public launch and updates.
- [ ] Fill Store listing, Privacy and Distribution with the prepared copy, verified public URLs and images. Choose language, category and regions deliberately. Support is [GitHub Issues](https://github.com/Kevin-Mok/twitch-following-extension/issues); no private contact email has been invented.
- [ ] Start **Unlisted** for a small beta. Anyone with the URL can install; use **Private**/trusted testers if access needs restriction. Both still need policy review. [Distribution settings](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution).
- [ ] Paste the reviewer instructions from the store-copy file. Reviewers can use their own Twitch account and live follows. If restricted access becomes necessary, use the dashboard’s private test-instructions facility with a permitted dedicated account; never publish passwords or tokens. [Reviewer instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions).

This is a Chrome browser extension using Helix, not a Twitch embedded extension; it does not use Twitch’s separate extension marketplace publication flow.

## 6. Submit and launch — manual

1. Submit for review. Deferred publishing lets you control launch after approval; approval alone does not make the item installable. Deferred submissions currently must be published within 30 days or reviewed again. [Submission instructions](https://developer.chrome.com/docs/webstore/publish/).
2. Monitor dashboard/email; review duration and approval are not guaranteed. Fix any rejection in the same item and resubmit. [Review process](https://developer.chrome.com/docs/webstore/review-process/).
3. Publish the approved build as **Unlisted/Private**, then install it from the actual store page in a clean profile. Verify real authorization, correct follows, native restoration and reconnection independently of unpacked previews.
4. After beta acceptance, change that same item to **Public** and publish/submit as the dashboard requires. Verify its public listing/install URL, then add the real URL to README and help. No store URL is known yet.
5. Save the released version, source commit, ZIP hash, public URLs and observed acceptance in [verification.md](verification.md).

## 7. Updates and recovery

For later changes, keep the same item, increase manifest/package version, build a complete ZIP, update affected disclosures and rerun acceptance before review. Session-only credentials mean an extension update requires reconnection; do not silently change that expectation. [Update procedure](https://developer.chrome.com/docs/webstore/update/).

For a faulty release, assess the dashboard’s [rollback feature](https://developer.chrome.com/docs/webstore/rollback/), checking stored-data compatibility first. If rebuilding older source yourself, upload it with a new higher version; an older version number is not a valid update. Users can immediately disable/remove the extension and refresh Twitch. Unpublishing is not a repair for installed code.

**Done means:** a fresh user installs from the public store URL, connects without developer registration, sees the correct real live follows, can restore Twitch’s native feed, and can inspect the source/license and truthful privacy/help pages. Local preparation alone does not meet that acceptance gate.
