# Painted actionbar controls

The desktop add/remove controls now sit vertically on the left of the shortcut
grid. Their group tracks the grid height, with enough space for both controls when
only the locked base row remains. Emotes, run/walk and combat controls remain on
the right. The grid itself stays centred. Adding rows still grows upward and
removing rows preserves hidden assignments; the base row cannot be removed.

Four new images were generated separately with built-in image_gen: add, remove,
emote and run. All are transparent jade-and-gold painted button artwork, exported
to matching 256 px WebP files in `assets/ui-action141/`. Exact prompts are stored
in `prompts.json` there. Originals remain in the image generator's save folder and
local `outputs/imagegen/action141/`. Labels, tooltips and accessible names remain
real text. The run/walk toggle keeps its changing label and pressed state; its
painted image glows when running is selected. Mobile keeps its existing controls.

Validation: production build; actionbar state tests, life-state tests, syntax and
translation coverage. `scripts/check-actionbar.mjs` exercises the real local game:
painted artwork, left control geometry, 1–4 rows, all 24 emote targets above the
changing grid, run/walk, item/skill drag and reorder, server-owned item use,
cooldowns, persistence, five desktop resolutions and two mobile resolutions.
