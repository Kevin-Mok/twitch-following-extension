# Public repository delivery

Publish the completed extension as a public GitHub repository with one coherent initial commit. Review the exact staged content, run the required privacy and README gates, then push the verified series once.

## Scope and assumptions

- Target: `Kevin-Mok/twitch-following-extension`, public, branch `main`, remote `origin`.
- The implementation was created during this conversation. The actual host directory had no Git repository, staged work, branch, or upstream; the sandbox's read-only Git placeholder is a separate view. Host preflight captured this baseline before initialization.
- Include source, fixtures, manifest, package lock, README, implementation/publication plans, smoke checks, verification record, incident reports, lessons, and the continuation prompt together.
- Exclude dependency directories, screenshots, logs, private identity rules, temporary scanner links, and machine-local configuration. No file selected for publication exceeds 3 MB.
- No application credentials were supplied. Real OAuth and account-backed acceptance remain explicitly unverified; no backend, Web Store release, or deployment is part of this delivery.

## Commit contract

1. `feat: add Twitch category Following extension`
   - Official paginated follows, category/filter sorting, protected OAuth worker, native menu/cards/restoration, and connection setup.
   - Defining fixtures, manual checks, observed evidence, incident resolutions, and matching plans/docs.

This initial repository has one prerequisite group, so splitting its implementation from its tests or plans would leave incomplete commits. The publication receipt reports the actual SHA and push result; no history rewriting is authorized.

## Validation and review

- [x] Review every publishable file and classify excluded local artifacts.
- [x] README gate: update_in_same_change. Add the public source/install link and replace obsolete Git-blocker claims; retain the truthful opening, stack rationale, setup, commands/options, and acceptance limits.
- [x] Fresh checks: 60 tests pass; syntax checks pass. Staged content and all accompanying docs reviewed; no selected file exceeds 3 MB.
- [x] Preliminary exact-index privacy check passes; repeat it immediately before the commit attempt.
- Delivery action: create the commit, push `main` once, and verify the remote receipt. Its resulting SHA and remote status are reported in the delivery response rather than self-referencing commit content.

The privacy check uses the existing shared scanner through a temporary untracked entry point at its required command path. Public noreply commit identity is configured locally; the exact identity approval stays in a private mode-0600 file outside the repository. No private rules, identity policy, scanner suppression, or machine-specific symlink enters the public tree. Existing hooks remain active. Reviewed incident records were refreshed after removing machine-specific publication details; the targeted ledger check passed.

## Delivery status

Milestone: `feat: add Twitch category Following extension` contains the runnable MVP and its verification/docs. The target is `main` → `origin/main` in the public repository above. Remaining product work is the credential-dependent manual acceptance recorded in `docs/smoke-tests.md`; the next product step is app registration and account authorization. Local artifacts and external knowledge-ledger changes are outside this repository's commit scope.
