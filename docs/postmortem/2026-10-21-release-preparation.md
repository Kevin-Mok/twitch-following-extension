# Release preparation tooling notes

Track unexpected local tooling failures during release preparation, distinguish them from intentional RED tests, and record the verified recovery here.

- Symptom: an exploratory read assumed `tests/worker.test.js`; that path does not exist.
- Impact: one source read was skipped; no application files or data changed.
- Cause: the existing worker fixture file is named `tests/background.test.js`.
- Resolution: the search agent mapped the actual file and its authorization/race fixtures; implementation uses that existing seam.
- Status: resolved; no application remediation needed.
- Learning lookup: existing repository/file mapping is authoritative; no new reusable incident guidance beyond checking the mapped path.
- Next: record any further unexpected tooling failures and the final verification/learning review before delivery.

## Additional tooling outcomes

- A worker tried Node's `--test-isolation=none`; Node 22.15.0 rejected that unsupported option. The normal runner/direct test file paths provide the required checks. This did not require an application change.
- An early actual-package check ran before the main worker replaced the developer checklist link, correctly rejecting a dependency on excluded docs. A follow-on inspect found no archive because that package attempt had failed. Once bundled help/privacy pages replaced the developer link, package and inspect passed. Do not inspect an archive after a failed build.
- Intentional RED tests are exempt: focused test-runner file summaries hid individual assertions in the sandbox, while the expanded run showed the expected missing-behavior assertions. No new application failure was inferred from that presentation.

Current application verification: first full pass: 87 tests, syntax and package checks passed; independent review identified one two-setup-tab completion inconsistency, fixed after its defining RED test. The final integrated checks are recorded below. Actual 0.2.0 draft loaded in isolated Chrome 156: real setup/status messaging, limited permissions, help/privacy resources, desktop/light and narrow/dark overflow checks passed. The real logged-out Twitch menu showed one aligned Following row. No user account or live token was used.

## Resolution and final review

All tooling issues above are resolved. Final application suite: 89 passed, 0 failed; syntax checks pass. Draft ZIP build/inspect and ASCII output agree on 19 files, 33,567 bytes, SHA256 a61639f79e6c9a2f96d3c041c77d72a2c3aab927e4bebb835ebf1d3398aa2b64. Real isolated Chrome checks passed for the draft and a configured test archive; the configured check initially failed intentionally as a defining RED, then passed. No real OAuth consent occurred.

Learning lookup query: `release packaging missing dependency unsupported Node test option`. The leading `ext-boundary-error-contracts` match concerns adapter/version boundaries; it does not establish a remedy for these tool-path/CLI-option issues. The local reproductions and successful corrected commands provide the evidence. No new general learning: mapped paths, supported runner arguments, fail-closed package dependency checks and build-before-inspect remain sufficient. Register this final report hash as a reviewed no-new-learning decision in canonical memory and run its targeted check.

## Commit privacy check

The first final staged privacy scan blocked one email-category finding before commit creation. No commit/push occurred and no private value was printed. Established public commit identities were already narrowly approved for this exact scan; locate the safe hashed file reference and repair the candidate, without bypassing the gate or approving arbitrary content. Status: investigating the candidate finding; rerun the unchanged gate before any commit attempt.

Resolution: safe hashed-location diagnostics mapped the finding to the device-flow tests. The email heuristic matched a synthetic userinfo-in-Twitch-URL rejection fixture, not a private address. Constructed that invalid URL through URL.username instead of embedding an email-shaped literal; the same security rejection remains exercised, with 40 worker tests passing. No scanner rule, approval list, production behavior or hook changed. Lookup `privacy gate staged image email finding` returned `local-privacy-reviewed-content-approvals`; its exact-review/private-prohibition contract guided diagnosis, but no staged-content approval was needed. Final exact gate is rerun on the restaged candidate immediately before commit.

The next gate attempt found a second email-shaped literal in the same malicious-URL test: a spoofed-host URL used a hostname as its synthetic username. Construct this through URL.username too; keep both wrong-origin and userinfo rejection cases. The first repair addressed only one of the two literal matches. No private address was involved in either case, and no gate suppression is appropriate. Record the final gate receipt with the commit output.
