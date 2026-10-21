# Chrome Web Store release guide

Document the path from the current unpacked extension to a public store release. Inspect the implementation, verify official publication requirements, and save an ordered checklist with clear release gates.

The documentation-only stage below is historical. The user subsequently authorized implementation; current work and decisions are tracked in [release-preparation.md](release-preparation.md).

## Scope and assumptions

- Documentation only: no application changes, app registration, fee payment, packaging, submission, or publication.
- Target is the existing Manifest V3 Chrome extension, English desktop UI, following-only MVP.
- Recommend publisher-managed Twitch app configuration for ordinary viewers; retain the current bring-your-own-client-ID path as an explicitly labeled technical beta option. Neither change is implemented by this task.
- Keep the guide in `docs/chrome-web-store-release.md`, link it from the root README, and capture package/store-install checks in `docs/smoke-tests.md`. This plan travels with the related documentation in any later commit.

## Work

- [x] Inspect manifest, OAuth/storage/network behavior, runtime package inputs, verification record, and local lessons.
- [x] Check current Chrome and Twitch publication/authentication requirements against primary sources.
- [x] Write the ordered guide, separating present behavior, recommended code changes, manual account tasks, and required release evidence.
- [x] Review source support, local links, packaging allowlist, identity/redirect order, privacy inventory, and release/update checks.

## Verification and risks

Documentation checks: inspect each platform claim against its linked official page and each implementation claim against source. Check relative links and required README coverage; runtime tests need no repeat for documentation-only work.

Release risks: stable store ID must precede final callback registration; real authorization and account-backed acceptance remain unverified; privacy declarations must match the eventual release code; store policies/dashboard requirements can change. No review-time or acceptance guarantee.

## Review and handoff

Independent review verified current runtime/permission/storage claims and identified three workflow gaps. Corrected deferred test publication before installation, store-item creation for the device-code path, and replacement of the developer checklist link before packaging. The final guide names OAuth compatibility as the first task and includes fresh-install, native-restoration, and future-update acceptance. All 14 local documentation links resolve; README gate passes; whitespace check passes. Official disclosure, image, draft-ID, reviewer-instruction and rollback pages were inspected directly. Application tests were not repeated for documentation-only changes.

Actual public release requires completing the guide's unchecked items; writing it does not satisfy them. Suggested documentation commit: `docs: add Chrome Web Store release guide`. No submission, account action, code change, commit, or push was performed for this documentation task.
