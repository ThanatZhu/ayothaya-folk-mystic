# Painted skill tree frames

The skill window uses two genuine generated bitmap assets in `assets/ui-skill150/`:
`window.webp` for the outer gold/jade Thai ornament frame and `node.webp` for each skill card.
`prompts.json` preserves the exact prompts, generation mode and profession coverage.
Generated with built-in image_gen, then proportionally exported to WebP with alpha intact.
Original generated PNGs are retained locally in `outputs/imagegen/skill150/` and the generator archive.

The shared renderer covers Novice and all seven professions, both base and Master tabs,
including all 14 Master branches. No skill IDs, progression, damage, costs or prerequisites change.
The header shows the profession. The 175 layout renders the outer painting as six fixed-aspect
SVG viewports: four corners, the crown and the lower ornament. Plain CSS rails join them.
The old border-image stretched the central crown with the top edge and compressed the corners
unevenly. No raster art is regenerated or stretched in the revised outer frame. Skill-card
nine-slices use matching horizontal/vertical scale factors (150:160 source slices and
22.5:24 desktop / 15:16 compact border widths). Decorative layers do not intercept pointer
events. Actual DOM text and icons remain live.
The skill icon art keeps its aspect ratio on narrow screens.
The 176 revision makes each node an icon-only square with a separate + upgrade
button. Selecting the icon shows its name, level, prerequisites and effects in
the detail panel. Native selection buttons retain keyboard access and accessible
names; unavailable upgrades remain visibly disabled. Novice stays a compact
three-icon row, including on portrait phones.
The green backing is a separate inset layer placed inside the painted gold rails;
the dialog itself stays transparent so no green rectangle spills beyond the artwork.

Desktop uses the full tree with the details underneath. Short landscape phone screens place
details to the right of the tree. Portrait uses compact cards. On especially short screens,
only the inner workspace scrolls: the frame, tabs and close button remain accessible.
ResizeObserver updates prerequisite-line geometry when styles/fonts/layout settle.

Verification (pass the absolute Playwright module path as the final argument):

```powershell
node scripts/check-skill-frame175.mjs <playwright-module>
node build-vercel.mjs
node scripts/check-skill-game175.mjs <playwright-module>
```

The frame check covers 8 professions / 15 branch cases (Novice plus 14 Master branches),
both profession tabs (Novice has only its three basic skills), eight viewport sizes from
320×568 through 1920×1080, generated asset requests and ornament aspect ratios,
outer and horizontal overflow, selection, upgrade, closing and keyboard reopening.
The game integration check uses an isolated local account/server and opens the real skill
menu at four desktop/landscape-phone sizes. It never modifies production player saves.
