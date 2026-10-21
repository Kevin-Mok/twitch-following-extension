# Heart alignment delivery

Review the alignment evidence, ship the focused CSS and documentation change, then reload the unpacked extension and Twitch to activate it.

## Milestones

- Existing prerequisite: `fix: preserve focus when selecting Following` (`c9d1450`).
- Current milestone: `fix: align Following heart with native sort icons`.
- Completed: strengthened owned-row layout specificity and matched native icon size, padding, gap, and row height; updated smoke checks, verification evidence, and integration lesson.
- Verified: browser reproducer failed before the fix and passed afterward; recreated menu retained one aligned row. Full suite passed 62 tests and syntax checks passed before delivery.
- README review: update_in_same_change. Clarified the opening benefit and made stack, usage, and command headings discoverable by the required gate; install/reload, launcher flags, and acceptance limits remain accurate. Gate rerun passed.
- Scope: helper could not detect writes through the orchestration wrapper. Direct-write fallback uses the clean initial status and observed edits to the five alignment/incident files, this delivery status, and the README repair. No unrelated dirty files in this repository.
- Delivery: commit the reviewed candidate and push `main` to configured `origin/main`; report the resulting SHA and push receipt in session output.
- Remaining: fresh unpacked-extension activation, physical input, full theme matrix, and account-backed acceptance. No source blocker; reload the extension and Twitch, then follow `docs/smoke-tests.md`.
- External work: the canonical postmortem ledger received a scoped review record; it remains outside this repository's commit, preserving other linux-config work.

See `docs/verification.md` for the atomic steps, Cursor review prompt, automated/manual checks, and rollback. Disable the extension and reload Twitch for immediate runtime rollback.

## Chrome release preparation milestone

- Milestone: `feat: prepare Chrome extension release`.
- Completed: Public device authorization/session-only credentials, setup disclosure/progress, MIT/source links, original icons/promo, genuine menu screenshot, help/privacy pages, listing/reviewer copy, deterministic ZIP packaging and reusable isolated-Chrome checks.
- Verified: 89 tests pass; syntax/README/package gates pass; actual draft/configured-fixture Chrome setup/pages/menu checks pass. Independent review findings corrected with defining regressions.
- Delivery: push main to origin/main and serve help/privacy from enabled GitHub Pages; report actual SHA and hosting receipts in session output.
- Remaining: register publisher Twitch app/public client ID, build configured candidate, complete real-account acceptance, then Chrome Web Store registration/payment/declarations/submission/review. No live token or store approval is claimed.
- Scope: prior guide/docs plus directly observed implementation/companion files from this conversation; preserve external linux-config work. No unrelated local edits detected.
- See [release plan](../plans/release-preparation.md), [manual release steps](chrome-web-store-release.md), and [verification evidence](verification.md).
