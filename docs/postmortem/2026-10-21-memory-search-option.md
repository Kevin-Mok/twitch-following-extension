# Postmortem lookup option mismatch

The alignment investigation encountered a tooling mismatch. Retry the read-only lookup using the installed helper's supported arguments.

- Symptom: the tracked postmortem helper rejected `search ... --compact` (exit 2).
- Impact: one lookup failed; no application or user data changed.
- Cause: the installed skill describes an option absent from the tracked helper.
- Resolution and evidence: repeated the same query without `--compact`; exit 0. Returned findings do not apply to Twitch icon layout.
- Current status: lookup resolved; installed/tracked instruction reconciliation is a separate configuration task.
- Next steps: reconcile the installed instructions and tracked helper in linux-config.
- Learning: no new application-specific learning; use the tracked helper contract for its supported flags. Reviewed in the canonical ledger as a no-new-learning decision.

## Test subprocess restriction

- Symptom: the first sandboxed `npm test` reported five passing test files and a failure in `tests/open-verification.test.js` (exit 1).
- Impact: that run does not establish full regression coverage. `npm run check` passed.
- Evidence: the launcher test invokes child processes; `docs/verification.md` already records this namespace restriction and a successful complete run outside it.
- Current status: resolved by allowing test subprocess access; Node v22.15.0, `npm test` passed all 62 tests, exit 0.
- Resolution: no application change needed; the restricted namespace prevented launcher subprocess execution.

## Browser menu timing

A geometry probe ran after toggling the native trigger twice, while the menu was closed, and encountered a null option. No application state or data was lost. Open the menu once and wait for the next bridge invocation before measuring. The subsequent probe found one flex row with matching native icon size and left edge. This is probe sequencing, not an application regression.
