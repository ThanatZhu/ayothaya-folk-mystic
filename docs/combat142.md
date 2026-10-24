# Vertical helpers and larger painted battle buttons

Desktop row controls use a fixed two-button stack with a 10 px gap, positioned
slightly lower. Extra shortcut rows no longer stretch the add/remove buttons
apart. Emote/run form a matching vertical pair on the right at exactly the same
levels. A second right column contains AUTO above the normal attack button.
Both battle buttons are now 84 px wide; the 36 px settings gear overlays AUTO's
top right corner. The shortcut grid remains centred and its locked base row,
hidden-row assignments and keyboard bindings are unchanged.

Three original high-resolution images were created with built-in image_gen.
Transparent exports are in `assets/ui-combat142/`: `auto.webp` and `attack.webp`
at 512 px, plus `settings.webp` at 256 px. Exact prompts are in `prompts.json`.
Original generated PNGs remain in the generator folder and local
`outputs/imagegen/combat142/`. AUTO's status and the Space hint remain live text;
active AUTO has a green glow. Mobile retains its existing artwork and layout.

Validation: production build, shortcut/life/AUTO tests and translation/syntax
checks. The local browser actionbar check covers five desktop and two mobile
sizes; aligned helper columns, fixed spacing through 1–4 rows, full-size image
loading, viewport fit and hit targets; AUTO/settings actions; emotes, run/walk,
drag/reorder, inventory use, cooldowns and shortcut persistence.
