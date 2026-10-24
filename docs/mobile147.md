# Mobile HUD controls and usable inventory

Menu and Bag share one row below the measured minimap bounds. Generated menu
and Discord artwork is in `assets/ui-mobile147/`; `prompts.json` records both
built-in image_gen prompts. Production WebP exports retain alpha and are 256px.
The channel target reuses the desktop painted asset at a compact 72x44px, with
eligible Rebirth directly underneath. Existing eligibility and in-town checks
remain authoritative.

The World shortcut is removed; emote and movement shift into its former places.
Events move into a separate row flowing leftward from Discord, while the area
below the character bars remains available for existing status/buff icons.
Vertical Quest/Party lettering has closer spacing and enough height for English.
The menu uses 52px cells and 10px gaps rather than stretched fractional columns.

The mobile bag previously used a fit-content dialog with a flex item area; its
item region could shrink to zero on short landscape screens. It now has an
explicit viewport-derived height, a scrollable item grid, and a scrollable body
for item actions on short screens. Both opening controls retain the same bag
owner, including real server-owned item use.

Validation:

- Thirteen focused mobile/HUD/AUTO/localization and movement tests passed.
- `scripts/check-mobile147.mjs`: ten touch-emulated viewport sizes (320x568 through
  1024x768, including 932x430), native bag opening through both controls, real
  potion consumption, finger scrolling of a populated item grid, 10px menu gaps,
  actual channel changes, the Rebirth town guard, Thai and English tab geometry,
  event bounds between channel and Discord, chat/whisper, AUTO targets/settings,
  and notch/visual-viewport simulations.
- `scripts/check-bag147.mjs` adds native item-use checks at 568x320 and 320x568 so short-screen
  actions remain reachable after body scrolling.
- Browser coverage uses headless Edge touch emulation, not physical iOS Safari.
  Screenshots/reports are in `outputs/mobile147/` and are not shipped.

The current movement146 changes on main are retained by the merged import chain.
