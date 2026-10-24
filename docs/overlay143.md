# Desktop battle controls and floating chat

AUTO and attack now form a horizontal pair anchored to the bottom-right of the
viewport. Their container is a sibling of the centered shortcut grid, avoiding
the fixed-position containing block created by the grid's translation. The
smaller settings button remains on AUTO's upper-right corner. Existing nodes and
handlers are reused; touch mode restores them to the mobile combat owner.

Desktop chat uses a manual native popover when available, with a fixed high
stacking fallback. Opening chat does not close another utility window or notify
the HUD panel planner. Desktop chat is excluded from quest, party and training
collision measurements. Escape closes the chat layer without closing the bag or
collapsing the quest tracker underneath. Mobile chat retains its own owner.

Seven raster assets were created with the built-in image generation tool:
quest, party, fold, chat frame, send, close and channel tab. Production WebP files
and exact prompts are in `assets/ui-overlay143/`; original generated PNGs remain
in the generated-image library. `scripts/prepare-overlay143.mjs` makes proportional
exports and verifies transparency, including the hollow frame's center. Real
DOM text supplies localized labels and all user messages remain text nodes.

Validation uses isolated local accounts and servers:

- `scripts/check-actionbar.mjs`: five desktop viewports, bottom-right hit targets,
  row controls, item/skill dragging, server item consumption, cooldowns,
  persistence, emote picker rows and touch mode restoration.
- `scripts/check-chat140.mjs`: Thai/English desktop and touch, 16 viewport cases,
  actual chat/whisper delivery, unread and drafts, literal markup handling,
  unchanged HUD rectangles, overlay hit testing above an open bag, Escape
  behavior and desktop/touch transitions.
- Focused actionbar/activity/i18n/syntax tests and chat/social/authority tests.

The merge retains the latest mobile reference layout and its separate cache
versions. The desktop import chain and generated artwork use `overlay143`.
