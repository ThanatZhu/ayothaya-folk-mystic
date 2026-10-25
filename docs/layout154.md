# Skill node backing and desktop central market (154)

The generated skill-node frame has transparent gutters around its painted gold rails. Node state backgrounds and shadows used to cover the entire DOM box, producing the rectangular green spill. Normal, learned, available and selected nodes now keep a transparent root and draw their state fill in an inset pseudo-element. The painted frame stays above the fill, and the upgrade button remains outside the card without clipping. Desktop backing inset is 10 px vertically / 6 px horizontally; compact nodes use 7 px / 4 px. Selection brightens the painted frame. Existing artwork, icons, skill rules and the already-inset outer window backing are retained.

The central market has a scoped responsive stylesheet. On fine-pointer desktop screens >=901 px, the dialog is up to 1160 px wide and 820 px high, bounded by the shared safe viewport. Header, tabs and Close remain visible; the body scrolls. In the sell-store form only the inventory list scrolls, leaving the shop name, item/quantity/unit-price column labels and Open Store action accessible. Search results can use two equal columns; owned stores reflow into readable sections. The original gold/jade frame and Mali font remain in use.

Touch/narrow screens retain the original 460 px preferred market width with viewport limits and a scrollable body. No trading, escrow, prices, tax, item limits or backend rules change. The open-store form keeps its existing no-rerender-on-update behavior, preserving partially typed input.

Validation:

- `node scripts/check-skill154.mjs <absolute Playwright module path>`: 58 cases across 8 professions, 15 base/Master branch cases, both tabs and seven viewport sizes; transparent node roots / inset state fills, artwork loading, selection, upgrade, close/reopen and overflow checks.
- `node scripts/check-market154.mjs <absolute Playwright module path>`: isolated LocalStore/real realm with native desktop/touch UI actions, all three tabs, six viewport sizes, preserved typing, visible desktop footer, sell escrow, search, close/refund and buying-store escrow.
- `node --test tests/market70.test.mjs tests/i18n.test.mjs tests/role-live.test.mjs tests/skills31.test.mjs tests/syntax.test.mjs`
- `node build-vercel.mjs`

Screenshots and machine-readable QA reports remain local in `outputs/skill154/` and `outputs/market154/`.
