# Autonomous Chrome release preparation

Complete the release work that can be done without account credentials or human approval. Implement supported authorization and credential storage, prepare usable pages and assets, build a reproducible package, and leave only account-backed verification and store actions in the release guide.

## Authorization and starting state

The user requested all possible autonomous release preparation after reviewing `docs/chrome-web-store-release.md`. This supersedes that guide task's documentation-only scope. Baseline: README and smoke checklist modified; release guide and its plan untracked, all directly created earlier in this conversation. Preserve those files. HEAD is `447d267`; no unrelated repository work was present.

## Decisions and interfaces

- Keep plain MV3 JavaScript, English desktop Twitch integration and the following-only feature set. No backend, dependency additions, refresh-token storage or extra product features.
- Use Twitch Public-client device authorization. The UI starts a short `connect` request, then polls short setup-only `pollAuthorization` requests at the server interval; the worker persists pending state in session storage so sleeping/restarting the worker does not require a long-running request. Polling stops on disconnect, expiry, terminal error or page close; reopening setup resumes an unexpired request.
- `status` returns `{ok,clientId,configured,account,pending}`. Safe `pending` contains only `userCode,verificationUri,expiresAt,interval`; device/access/refresh tokens never appear in replies. `connect` accepts the existing public client ID payload and returns safe pending state; fixed packaged ID takes precedence. `pollAuthorization` returns safe pending or connected account. `disconnect` cancels pending and attempts revocation.
- Keep only public client ID in local storage. Token/account/device state live in `chrome.storage.session` restricted to trusted contexts. Delete legacy local credentials; reconnect after browser restart, extension reload/update/disable and expiry. Preserve generation ownership and serialized credential changes.
- Toolbar opens a persistent setup tab instead of a popup. Remove `identity`; keep `storage`, `alarms`, Twitch API/auth host permissions and the Twitch-only content script.
- `src/config.js` exports `TWITCH_CLIENT_ID = ''` in source. A standard-library packager injects a supplied public client ID into the archive only; without it the archive is clearly a development draft. Registration itself remains manual.
- Bundle `help.html`, `privacy.html`, `public.css` so setup has no developer-document link. Serve the same reviewed pages publicly if repository hosting can be configured with current authorization.
- Original purple heart/list icon at 16/32/48/128 px and 440×280 promotional art. Store screenshots must represent observed product behavior; account-backed screenshots remain manual if no account is available.

## Ownership and atomic work

- [x] Auth worker: `src/background.js`, `src/auth.js`, `src/config.js`, `tests/background.test.js`, `tests/auth.test.js`. RED/GREEN device flow, sender trust, pacing, malformed/terminal responses, session locality, legacy cleanup and account-change races.
- [x] Main: `options.html`, `src/options.js`, `src/options.css`, `tests/options.test.js`, manifest/package metadata. UI test first; configure fallback, clear disclosure, safe activation link/code, ongoing countdown/progress, resume/cancel, error recovery and session reconnection.
- [x] Package worker: `scripts/release.py`, `tests/release.test.js`, `icons/`, promotional art under `store-assets/`. Test archive roundtrip, public ID injection/source preservation, dependency closure, forbidden paths and output safety. Deterministic ZIP plus inspect output with emojis/`--plain`.
- [x] Content worker: bundled help/privacy pages and `public.css`; `store-assets/listing.md` with listing, permission and reviewer copy.
- [x] Main integration: update README, smoke tests, verification record, release guide and this plan; run full suite and syntax/package checks, browser review, independent review; fix concrete findings.
- [x] Hosting/package delivery: produce draft ZIP and reviewed screenshot(s), attempt permitted hosting setup if feasible, record exact manual inputs and remaining real-account/store steps.

## Verification and completion

Run focused RED before behavior edits and GREEN afterward. Final evidence: full `npm test`, expanded syntax checks, archive inspect, unpacked ZIP/options/public-page browser review at desktop/narrow widths and both themes, and independent evidence/security review. Do not equate fixtures with real Twitch OAuth. Document exact archive hash and command, real vs synthetic screenshots, and missing client ID/account acceptance.

Manual work that cannot be completed with the current workspace: Twitch app registration/client ID, Google registration/payment/2FA/identity declarations, real consent/authorization, live account acceptance, store upload/review/publication when no authorized account access exists. Never embed a secret or bypass login/approval.

## Progress and review

Implementation complete for available local evidence. Full suite: 89 passed, 0 failed; syntax checks and deterministic 19-file/33,567-byte package inspection passed. Draft SHA256: `a61639f79e6c9a2f96d3c041c77d72a2c3aab927e4bebb835ebf1d3398aa2b64`. Real Chrome 156 checked actual draft and configured test archives, source/privacy links, light/desktop and dark/narrow layouts, real worker status messaging, no persistent credentials and one aligned live Twitch Following menu. Genuine menu screenshot and original source/MIT promo are prepared.

Independent review found a two-setup-tab completion issue; its counterexample failed before correction and now passes with session-only credentials. A second scoped review found the browser verifier assumed every archive was a draft and overbroad exception wording. Its configured fixture failed intentionally, then passed after configuration-aware visibility checks; wording now limits exception observation to inspected pages. No unresolved credential/security blocker was found in the reviewed paths. Real OAuth/store acceptance remain explicitly unverified.

Release commit `7d9b1bc` is pushed to origin/main. GitHub Pages is live on main/root; anonymous help/privacy/CSS/icon responses returned 200 and matched committed bytes. The follow-up documentation milestone `docs: record published support pages` saves these receipts. User explicitly selected MIT; factual safeguards and source links are prominent in UI/help/privacy/README/listing/promo. No secret or refresh token is included. Related plan/docs travel with implementation. Rollback is disable extension and reload Twitch; session migration intentionally requires reconnect rather than copying persistent tokens.
