# Following menu pointer selection

Track the reported unclickable Following menu item and the evidence needed to verify its repair. Reproduce the pointer path, add coverage, then check native restoration and icon rendering.

Symptom: the user sees Following in the sort dropdown but cannot click it; the row also lacks an icon.
Impact: pointer users cannot reliably enter Following mode.
Status: resolved for pointer and keyboard menu focus behavior; local source changes still require extension/tab reload for user activation.
Evidence: the current code appends a bare li/button with a click listener. Existing Chrome evidence used dispatched keyboard events, and integration fixtures call click() directly; neither covers a full pointer sequence.
Lookup: canonical queries `Following dropdown disabled sort icon` (unrelated generic findings) and `twitch` (no matches). No prior remedy adopted. The older runtime report's aria-hidden trigger fix remains relevant context, not proof for this symptom.
Next: activate the changed unpacked extension and run the account-backed manual checks.

Root cause: the injected row has tabindex=0. A genuine mouse click transfers focus from the native combobox to that row on mousedown. Twitch's blur handling closes its menu before the extension toggles the trigger in choose(), reopening the menu. Live event recording showed pointerdown → mousedown → focusout(button) → focusin(li) → mouseup → click(li) → click(trigger), leaving the menu open. A temporary primary-mousedown preventDefault experiment removed the focus transfer and left the menu closed with Following selected and the disconnected fixture state visible. Selector-based chrome-devtools-axi page.click uses DOM click(); genuine input requires a fresh accessibility UID.

Verification environment: several initial reads used unavailable installed-skill aliases and one guessed launcher filename; corrected to catalog paths and scripts/open-verification.sh. No product files were affected. Impeccable context loading cannot create its engine cache under the restricted home directory; read the existing source, CSS, screenshot, README and verification record directly instead. Browser startup is pending.
Learning decision: no new general guidance; extension-specific focus and browser-tool behavior is recorded in tasks/lessons.md. Canonical report registration/check is performed after these bytes settle; plans/following-menu-click.md records that outcome.

Browser precondition: the sandboxed browser bridge timed out (`BRIDGE_NOT_READY`). The same read-only browser request with approved external access succeeded and opened live Twitch. This is a tooling restriction, not product evidence.
A browser click reference expired after the page updated (`STALE_REF`); use the already documented stable sort selector for inspection rather than stale snapshot IDs.

The initial defining test run in the restricted namespace produced only a suite-level ERR_TEST_FAILURE, not the expected assertion. The repository already documents this runner subprocess restriction; rerun through approved normal execution before interpreting RED.

Restoration verification encountered an absent native-option accessibility UID after reopening Following; the native rows remain visually present. Inspecting modal/accessibility state before retrying; do not infer restoration from the preceding green fixture suite.

Physical End/Enter verification exposed the same native focusout dismissal when keyboard navigation moves focus into a menu option; synthetic fixtures had not modeled that native behavior. Add a defining regression and suppress only the trigger-to-sort-option focusout propagation while the extension handles keyboard navigation. The preceding mouse repair remains verified. A review also identified selected-hover contrast; the hover rule now applies only to unselected rows.
The first keyboard reproducer stopped at a null activeElement after the native-dismissal fixture removed its focused row. Guard Enter dispatch when focus has vanished so the assertion measures the lost activation itself; rerun RED before the repair.

Resolution: preserve combobox focus on primary mousedown. When keyboard navigation intentionally moves focus from that trigger to recognized sort options, stop delegated focusout propagation at document capture; focus leaving the sort menu remains untouched. Add a decorative current-color heart SVG, unselected hover feedback, and selected-hover contrast protection.

Verification: both focus regressions failed with 0 snapshot requests versus expected 1 before their corresponding fixes, then passed. Final npm test: 62 pass, 0 fail; npm run check: exit 0. Genuine UID mouse input and physical End/Enter on live Twitch with current content/CSS and a synthetic disconnected runtime both select Following, close the menu, focus the trigger and show fixture connection guidance. The heart is 24×24 and selected hover is purple with white text. Native DOM-click restoration removes the panel and all hidden-grid markers. Final independent code review found no actionable remaining issue.

Limitations: browser checks injected content source with a fixture runtime, not freshly installed extension messaging. No credentials/API requests were used. Native genuine-pointer restoration could not be targeted through that accessibility snapshot; its DOM click handler was verified. Account-backed behavior, touch, screen readers, dark-theme visual acceptance and user activation remain manual. See docs/verification.md and docs/smoke-tests.md.
