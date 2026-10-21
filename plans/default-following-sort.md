# Default Following sort

Put Following first in the category sort menu and activate it by default. Remember explicit Following/native choices in Twitch-local browser storage across reloads; leave Twitch native sorting functional.

- [x] Read menu, navigation, fixture, documentation and prior interaction lessons. Initial status: only docs/chrome-web-store-release.md is dirty; preserve it.
- [x] Observe defining tests RED for first position, default startup, reload persistence and Live Channels return.
- [x] Add minimal saved preference and automatic activation; align keyboard order with visual order.
- [x] Update README, help, privacy, smoke checks and browser verification for first position.
- [x] Run full tests/syntax checks and attempt live browser activation (blocked: bridge unavailable; no CUA browsers).

Scope: content script, integration tests, verification script and companion docs. No new permissions or dependencies. Twitch can read this non-sensitive preference; clearing Twitch site data resets it. Saved values are validated (only native opts out); storage failure keeps the current page usable. Existing route/category verification and request guards remain. Native sort changes should persist the opt-out to avoid an automatic re-selection loop. Rollback: disable extension and reload Twitch.

Verification: defining tests observed RED before implementation; delayed-grid startup regression also observed RED before its gate. Fresh final npm test: 93/93 pass, zero skipped/failures (approved sandbox escalation required for launcher subprocess). npm run check and git diff --check exit 0. Independent review identified delayed-grid startup, repaired by waiting for liveGrid before automatic selection; no other must-fix findings. Native-choice reload, Following reload, keyboard order and Live Channels return covered by integration fixtures. Commit-session now authorized; delivery milestone below supersedes the earlier uncommitted handoff.

Canonical incident ledger: appended only this task’s reviewed no-new-general-learning entry to sources.json, preserving pre-existing dirty records. Initial SHA-256 404d18851097ceed5155c9bd3b3bae4c5f60be012c9f6ec8f8ffbc229df401bb; delivery restriction update is re-registered before commit; targeted check exit 0, no errors/changed hashes/unregistered aliases. No tracked configuration changed; refresh-config does not apply.

Remaining: live unpacked activation and authenticated cards. See docs/postmortem/2026-10-21-browser-bridge-unavailable.md. Twitch-local preference contains only following/native; clearing Twitch site data resets it. No new permission/dependency. Documentation updated in README, help, privacy and smoke checks. Existing release-guide edits preserved.

Automated test plan: npm test, npm run check. Exact manual plan: Manual acceptance: reload unpacked extension, refresh Fortnite, check first/selected Following, choose native and refresh, select Following and refresh again, test Videos/Clips return and keyboard Home/ArrowDown.

Suggested commit: feat: remember Following as the default category sort
Paste-ready Cursor prompt: “Verify the remembered Following default using plans/default-following-sort.md and docs/smoke-tests.md. Reload the unpacked extension and check Fortnite startup, first menu position, keyboard Home/ArrowDown, native selection plus reload, Following plus reload, category navigation and Videos/Clips return. Preserve unrelated release-guide work. Report live evidence and do not infer authenticated results from fixtures.”

## Delivery milestone — feat: remember Following as the default category sort

Completed: Following first, default activation, remembered Following/native choice, matching keyboard order, delayed-grid startup guard, regression tests and companion docs. Verified: final implementation suite 93/93 plus syntax checks passed; fresh precommit npm test passed 93/93 and npm run check exited 0. Remaining: live unpacked activation and authenticated cards; browser bridge unavailable. Rollback: disable extension and refresh Twitch.

Scope session: 01a15f73-b4f0-7660-b54b-1c117091a412. Scope helper returned unsafe because it detected no successful writes/baseline in this tool format. Direct-write evidence establishes README.md, docs/smoke-tests.md, help.html, privacy.html, scripts/verify-unpacked.mjs, src/content.js, tests/integration.test.js, this plan and the browser-bridge incident. Exclude unrelated docs/chrome-web-store-release.md (dirty at initial baseline), docs/task-status.md and docs/verification.md (concurrent release-candidate edits, not touched here). Canonical memory ledger is outside this repo and not included.

README gate: update_in_same_change, then pass_no_change after repairs. Opening hook and stack rationale precede setup; documented launcher/package/verification flags match source. Updated setup default selection and distinguished extension-local client ID from Twitch-local sort preference. No new configuration. No Vercel project configuration applies to this browser extension.

Next step: commit the reviewed session paths and push main to origin/main, then reload the unpacked extension and run the documented manual acceptance. Commit/push receipts belong in the session output.

Privacy review: initial gate identified only public author/committer metadata. Reused HEAD’s public GitHub identity through an exact external mode-0600 metadata approval, matching the existing documented contract; no private policy was configured, no prohibitions replaced, no scanner/hook bypass. Exact candidate gate passed and is repeated immediately before commit. Git staging required approved sandbox escalation. Canonical incident hash/check updated for these delivery restrictions.
