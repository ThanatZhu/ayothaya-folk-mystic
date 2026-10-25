# Quick-read card insertion

The user chose the second proposed design, “รายการอ่านเร็ว”. Replace the native name-only card dropdown with a centered gold/jade picker: each row has authentic card art, the full card name, actual bonus text, owned quantity and a Select button. Show only cards compatible with the chosen equipment slot. The layout works for all six gear slots and uses the same card artwork as the album, including chapter-two cards.

Selecting a row opens an explicit review showing the chosen card, its effects and the existing permanent-insertion rule. Back, close and browsing do not send an insertion or consume an item. Confirm uses the existing authoritative `insertCard` operation (or the existing offline function). No predicted inventory changes or success notices. Changing the worn equipment while reviewing invalidates the selection, so the UI cannot silently target a replacement. Confirmation is guarded against duplicate clicks.

After insertion the status equipment row permanently shows the card portrait, name and actual effects. The equipment name avoids repeating the card suffix. Inventory card changes refresh available-card controls. No card statistics, socket rules, insertion prices, rewards or server behavior change.

The picker bounds itself to the viewport and safe-area insets. The header and footer stay visible while long lists scroll inside. Small screens retain readable effects and touch targets; no tooltip is required to understand a card. Green backing is inset inside the authored frame. Existing mobile combat positions are untouched.

Validation:
- `node --test tests/cards.test.mjs tests/character-stats.test.mjs tests/i18n.test.mjs`: 12 passing checks.
- `scripts/check-cards156.mjs <absolute-playwright-module>`: real isolated game/server with desktop and touch contexts, seven viewport sizes, simulated notch safe areas, real legacy/chapter-two artwork, compatible-slot filtering, no mutation on review/back, one request/one consumed card on confirmation, preserved +10/affix, actual damage bonus, tutorial completion only after insertion, English effect text, stale-equipment rejection and empty inventory. Screenshots/report: untracked `outputs/cards156/`.
- Built successfully with `node build-vercel.mjs`.
- Native Edge/Chromium touch emulation; physical iPhone/Safari hardware was not tested.
