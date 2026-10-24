# Desktop shortcut grid and mobile wheel

Desktop uses a centered eight-column grid. The bottom row is permanent. Plus
adds an eight-slot row above the existing rows; minus hides the top row.
There are one to four visible rows. Hidden rows keep their assignments so
adding them again restores their shortcuts. The grid's bottom edge stays fixed.

Skills can be dragged from K; items can be dragged from B. Dragging between
shortcuts swaps them. Right-click clears a shortcut. Assignment does not consume
or discard inventory. Inventory, skill unlocks, cooldowns and casts still belong
to the existing authoritative server.

The existing separate potion strip is hidden on desktop; its assigned items
are included in a new grid's defaults. Emote, walk/run, AUTO, AUTO settings and
basic attack sit beside the grid. Unusable non-consumable items open their
existing bag details; gear shortcuts use the existing equip handler.

Keys 1–8 trigger the bottom row. Shift+1–8, Alt+1–8 and Shift+Alt+1–8 trigger
the upper rows; compact key labels use S and A. Bindings are saved on this
device per realm, character slot, class and Master branch. They do not modify
character saves or inventory. Legacy mobile wheel order remains separate.

Mobile uses four circular skill positions per page around the attack button, with
circular arrows to switch pages. Four quick item slots remain reachable on
mobile. The desktop grid and side controls restore their original mobile
parents when changing layouts. The AUTO positions tab explicitly describes
the mobile wheel when viewed from desktop.

Validation:

- tests/actionbar.test.mjs checks permanent-row behavior, hidden assignments,
  malformed local data and active skill coverage for every class/Master branch.
- scripts/check-actionbar.mjs uses a real local server and browser to drag from
  the bag and skill tree, swap shortcuts, consume server-owned inventory, show
  cooldowns, reload saved bindings and inspect five desktop/two mobile sizes.
- scripts/actionbar-preview-server.mjs runs an isolated loopback preview on
  port 8921, with local test characters and no production account/service.

Run the static build before the browser checks or preview server. Preview:
http://127.0.0.1:8921/actionbar-review.html

Validation result: 476/476 node tests passed; five desktop and two mobile browser sizes passed, including inventory use and Master skills.

Friendly control polish (129): rounded jade/gold add/remove buttons with labels, a labeled emote button, and walk/run glyphs that follow the toggle state. Browser checks cover all five desktop and two mobile sizes, including emote opening and run toggling; original touch controls remain compact.
