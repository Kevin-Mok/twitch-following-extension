# Commit identity privacy gate

Record the blocked commit attempt, select an established public commit identity, and rerun the same staged-byte privacy gate before committing.

Symptom: the required shared privacy gate returned exit 1 with two email findings, location references identity-author and identity-committer. No sensitive values were printed.
Impact: the requested session commit was delayed before creation; no private identity was published.
Evidence: the gate’s safe --details output identifies identity metadata rather than staged file contents. All 62 tests and syntax checks passed; ten intended files were staged when the gate blocked.
Status: gate resolved with the repository’s established public noreply identities and an exact private metadata approval; final restaged scan and commit follow.
Next: include this report, rerun the exact-candidate gate immediately before commit using the same identities, then push. Commit/push receipts are reported in session output.
Learning lookup: `privacy gate identity author committer email` returned local-privacy-reviewed-content-approvals. It applies: exact reviewed public Git metadata approvals belong in an external mode-0600 policy, and explicit private prohibitions remain authoritative. No staged-blob approval or scanner bypass is appropriate.

Further evidence: the existing repository commit already uses GitHub noreply author/committer addresses. Retrying the gate with those identities still blocks because the shared scanner requires explicit public-metadata approval even for that domain. Check existing private policy, preserve every prohibition, and narrowly approve only those established public identities in a temporary external mode-0600 policy for this commit.

Resolution: verified the existing commit equals origin/main and reuses its public noreply author/committer identities only for this command. No repository private policy was configured, so no prohibitions were replaced. Passed a temporary external mode-0600 policy containing only those exact public metadata identities to the shared gate. It checked the actual staged blobs and matching intended Git metadata and exited 0. The temporary file is removed after each invocation; no global/repository configuration or hook was changed. The final commit invocation repeats that scan before invoking Git, retaining active hooks.

Learning decision: no new general guidance. This is the existing local-privacy-reviewed-content-approvals contract applied to an extension repository without local gate helpers. Register this report’s final hash in canonical memory and record the targeted-check outcome in the task plan. No private addresses or policy values are included here.
