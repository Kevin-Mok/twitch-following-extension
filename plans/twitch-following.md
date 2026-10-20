# Twitch Following implementation

Build a plain Manifest V3 extension with official authorized Helix retrieval, a safe Twitch DOM adapter, and a small connection surface. Verify pure behavior with fixtures and the unpacked runtime where available.

- [x] Capture live DOM and visual references; document supported selectors and filters.
- [x] RED → GREEN pagination, validation, deduplication, sorting, filtering, avatar tests.
- [x] Implement trusted worker OAuth, validation, request boundaries, account invalidation.
- [x] Implement isolated DOM integration and native restoration, following-only cards.
- [x] Review account lifecycle/security; reproduce and fix delayed-operation races.
- [x] Verify full fixture suite and syntax; recheck unpacked extension in Chrome.
- [x] Save README, Cursor continuation prompt, manual checks, and observed/blocked evidence.
- [x] Inspect fixture cards on live Twitch in both themes and at responsive widths.
- [x] Register reviewed incident hashes in canonical memory and verify the records.

Scope: no backend, no private APIs, no periodic stream polling, no invented recommendations. Native recommendation tail is omitted under the accepted following-only fallback. Public client ID is user supplied; no credential was available during implementation.

Rulings: supplied plan authorizes implementation directly. The initial implementation sandbox exposed a read-only empty Git placeholder; source work proceeded in the requested workspace. A later explicit publication request initialized the actual project repository outside that sandbox view. Existing Twitch design is the visual authority; no external UI library is needed. DOM-specific code and API/core code are separate. Filter parity must fail closed for unsupported filters.

Risks: Twitch markup drift, localization, unavailable live browser or OAuth registration. Restore original DOM with hidden markers rather than moving or deleting React-owned children.

Verification evidence: **60/60 fixture tests pass**, `npm run check` exits 0, manifest/local documentation links resolve. The process-spawning launcher fixture requires execution outside the restricted namespace; the full suite passed there. Live logged-out Chrome confirmed sort listbox ID/roles, directory container, tag URL `tl=English`, and persisted `languageDirectoryFilters=["en"]`. A fresh unpacked Chrome 146 run displayed one Following option, selected it via dispatched keyboard events, displayed reconnect guidance, reopened native choices, and restored Viewers (High to Low): panel=false, hidden=0, 27 native cards. See [verification](../docs/verification.md) and [runtime findings](../docs/postmortem/2026-10-20-unpacked-runtime.md).

Visual evidence: six labeled renderer fixtures using public thumbnails/avatars and synthetic counts were inspected on Twitch in light and dark themes at 1440 px. Actual selected-tab resizing yielded 4/3/2/1 columns across 1440/1280/768/390 px with no panel overflow; narrow dark screenshot inspected. These fixtures do not prove authorization or follow membership. Native toolbar clipping at 390 px remains outside the extension's grid.

Review: independent review found and verified fixes for tab cleanup, language persistence, delayed account reads/writes/notifications, and validation ownership. The deeper recheck also reproduced panel removal, query-only URL changes and native-sort history failures. Each defining fixture failed before the corresponding fix. Final independent review reran 24 worker, 3 authorization and 15 lifecycle tests successfully; no further concrete scoped defect remained. Credential storage schema drift now fails safely before requests.

Ruling: persisted Twitch language preference is read-only DOM-adapter input, validated on load, because live inspection showed language filtering does not update the category URL. No tokens or private APIs are involved. English menu labels remain the supported MVP UI locale; unknown markup fails safely.

README-sync result: update_in_same_change. Replaced stale “DOM/runtime unverified” claims, put the project-specific stack rationale before installation, documented the launcher options and exact callback setup, and created the missing verification record. No unrelated repository changes were included.

Prepared/blocked checks: real OAuth registration/approval, account-backed all-follow pagination, authenticated cards/links/filter parity, full physical-key/screen-reader interaction, native feed scrolling, and complete live navigation/theme/viewport matrix. These require the user's registered Twitch app/account or additional manual acceptance. The supplied plan explicitly accepts fixture-backed delivery with these limitations named. The recommendation-tail acceptance gate did not pass and no tail is included.

Delivery: source is directly loadable unpacked; setup and rollback are in README. [Smoke checks](../docs/smoke-tests.md) contain Action/Expected steps and [the saved prompt](../prompts/twitch-following-extension.md) continues credential-dependent acceptance. The public delivery uses `feat: add Twitch category Following extension`; see [the publication plan](publish-github.md). No Web Store publication or backend deployment occurred.

Incident learning: the two final report hashes and reviewed decisions were registered in the external canonical knowledge ledger. Both targeted checks exited 0 with no changed hashes or unregistered aliases. Publication removes machine-specific paths from the reports, so their reviewed records are refreshed for the published bytes. Local extension lessons remain in `tasks/lessons.md`.

Final state: implementation and available verification are complete; ready for the user's registered-app/account acceptance. No remaining autonomous code change is required by the reviewed evidence. The credential-dependent and full manual acceptance items above remain explicitly unverified.
