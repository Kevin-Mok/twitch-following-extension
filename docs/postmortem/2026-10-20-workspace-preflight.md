# Workspace and browser verification preflight

This report records environmental failures encountered while building and checking the extension. It explains the workarounds, their observed results, and the remaining limits without treating tool failures as product defects.

**Current status:** implementation and logged-out Chrome verification completed. The initial sandbox exposed a protected empty `.git` placeholder; the later explicit publication request used the actual host view to initialize a new repository. No user Chrome profile, system configuration, or protected sandbox mount was changed.

## Symptoms, causes, and resolutions

- Initial `git status --short` exited 128 because the workspace contained only read-only `.git/.agents/.aws/.codex` placeholders. Source was created in the authorized workspace; Git metadata was not initialized or replaced.
- Two installed skill aliases did not exist. The canonical catalog paths for 21st and ponytail-review were read instead. The memory helper rejected `--compact`; its supported search/scan/check flags were used thereafter.
- Offline npm could not find cached jsdom metadata (`ENOTCACHED`), and sandboxed registry access failed `EAI_AGAIN`. A scoped install outside the restricted namespace, using a temporary cache, installed 60 development packages with zero reported vulnerabilities. There are no runtime dependencies.
- `chrome-devtools-axi` initially returned `BRIDGE_NOT_READY`; CUA reported no browser. The installed Chrome MCP path worked outside the restricted namespace with a temporary profile. Live DOM inspection then confirmed the sort listbox, directory container, tab, tag URL, and persisted language preference.
- The bridge forbade `chrome://extensions`, and a command-line extension flag did not activate the extension. The official DevTools extension loader required declared workspace roots and a temporary-profile `--enable-unsafe-extension-debugging` flag. With those preconditions the actual unpacked extension loaded in Chrome 146. An optional list-extensions method was unsupported and was not needed.
- The launcher fixture's `spawnSync` was denied inside the sandbox. Outside that namespace it passed, followed by the complete suite: **60 tests passed, exit 0**. Syntax checks also passed.
- Additional card-preview tooling hit `Network.emulateNetworkConditionsByRule` with a missing mandatory `offline` field. Installed-source inspection found `resize_page`, which does not invoke network emulation. Early resizes appeared ineffective because the temporary harness used the first listed tab rather than the explicitly selected new tab; a background screenshot also timed out after 60 seconds. Those attempts were not counted as responsive acceptance.
- Changing only Twitch's theme class did not update its theme variables. The final harness used the returned selected tab ID and Twitch's visible Dark Theme checkbox. Actual resizing then measured 1440/1280/768/390 px with 4/3/2/1 card columns and no panel overflow. Light, dark, and narrow screenshots were inspected. The final harness exited 0; no extension code change was needed for these tool failures.
- A combined documentation patch was rejected because it deleted and added this path in one operation. The rejected patch made no changes. Supported update operations and one explicit report rewrite completed the same documentation changes.

## Lookup and applicability

Memory query `empty workspace not a git repository` (after removing unsupported `--compact`) returned generic sandbox/provenance guidance, not a remedy for the protected Git placeholder. Query `emulateNetworkConditionsByRule offline mandatory` returned no direct Chrome remedy. Existing current-source/version guidance supports inspecting the installed tool contract; unrelated Discord/backup findings were not applied. Query `apply_patch multiple operations target` matched `ext-patch-operation-contract`; its supported-update guidance directly applied to the rejected documentation rewrite.

## Evidence and limits

Production-path and final renderer diagnostics were retained locally during verification. Earlier failed visual attempts were retained separately. These temporary logs are not repository assets; the observed results are recorded in `docs/verification.md`. Local screenshots are ignored artifacts under `artifacts/`; they contain no account token.

The unpacked extension displayed exactly one Following item, selected it through dispatched keyboard events, displayed reconnect guidance, and restored native sorting/cards. The fixture preview imported the actual card renderer but used synthetic counts and public thumbnails; it did not authorize an account or retrieve follows. Twitch-origin GraphQL/GPU warnings appeared in some runs. Full credential-dependent acceptance remains in `docs/smoke-tests.md`.

Learning decision: no new general workflow rule. These are local environment/tool-contract constraints already covered by installed-source, patch-operation, and live-evidence guidance. Register this report's final hash and alias in the canonical ledger; preserve existing unrelated ledger edits. No installed skill copy is the source of truth.
