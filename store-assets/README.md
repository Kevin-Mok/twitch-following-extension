# Store assets and copy

Use these prepared images and listing text when submitting the verified release candidate. Review the screenshot evidence, upload images separately from the extension ZIP, and complete account-backed acceptance before submission.

- `promo-440x280.png`: original promotional tile with editable SVG source, the heart/list mark, and “Open source · MIT licensed.” No Twitch/Google logo or approval claim.
- `screenshot-menu-1280x800.png`: genuine screenshot of the actual 0.2.0 draft loaded unpacked in an isolated, logged-out Chrome 156 profile on the live Fortnite directory. The Following menu row is injected by the installed extension. Visible stream cards are Twitch’s native recommended feed, **not** the user’s authenticated follows. No synthetic runtime/cards or account were used.
- `listing.md`: prepared title/description, single purpose, permission/privacy prompts, reviewer instructions and remaining publisher fields.
- `../icons/`: original SVG and transparent 16/32/48/128 PNG icons. The 128px icon has 16px padding around its square artwork. The MIT license covers repository artwork/source; Twitch’s native page content/trademarks in the genuine screenshot remain their owners’ material.

The menu screenshot demonstrates menu integration only. Account-backed Following cards and final publisher-configured setup can be captured after registration/consent. Never replace them with fake follow data. Preview screenshots under ignored `artifacts/` are local QA evidence and are not automatically store assets.

To regenerate the real browser checks, run the documented `scripts/verify-unpacked.mjs` command from the repository root. It writes screenshots under `artifacts/`; visually review them before copying an intended image here. Normal live-channel names/counts will change between captures.
