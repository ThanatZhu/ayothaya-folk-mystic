# Mobile reference layout and painted chat

Mobile defaults follow the supplied skill reference: four circular skills curve
around the attack button, using screen-height units and safe-area anchors. Small
viewports keep 44px skill targets; attack and page switching are clamped inside
the right safe area. Existing player-authored layouts remain available through
AUTO settings; Reset uses these updated defaults.

The chat drawer leaves at least 10px above and below its frame and preserves
its usable width when an iPhone landscape
safe inset is present. Its channel sidebar starts beyond that inset; the composer
occupies only the message column, with an 8px gap after the sidebar. The 32x60px
collapse tab overlaps the drawer edge by 3px. Visual viewport changes continue
to keep the composer above the keyboard.

Mobile chat now reuses the desktop assets from `assets/ui-overlay143/`:
`chat-frame.webp` and `send.webp`. Other channel buttons remain plain text. The
green surface is painted inside the frame, with a transparent outer drawer.
Channel captions and message text remain live localized DOM text. The text field is 34px high, with a 36px send
button. Its 16px font avoids focus zoom on iOS. These changes are scoped to touch
presentation and retain the current desktop overlay and channel picker.

The NPC talk prompt is a compact 96x44px painted button centered at 65% / 56% of
the viewport, beside the character as requested. It uses the existing talk
handler, short mobile caption, and full NPC name in its accessible label.
Desktop Space and direct NPC clicks retain their existing actions.

Validation:

- 18 focused mobile, HUD, NPC, actionbar, activity and localization unit tests.
- `scripts/check-safe144.mjs`: native touch HUD drag/save/reload/reset; actual
  room chat and whisper delivery; menu, inventory, AUTO and skill settings;
  ten viewport sizes from 320x568 to 1024x768, including 932x430; safe inset
  simulations of 59/59, 59/0 and 0/59; simulated reduced visual viewport;
  screenshot artwork checks and compact input height; desktop AUTO ownership.
- `scripts/check-npc144.mjs`: real NPC body click/tap and compact talk button,
  Space handling, chat typing, and walking to a distant NPC.
- `scripts/check-channel144.mjs`: desktop channel picker and touch restoration.

Safe-area cases run in headless Edge with touch emulation and CSS inset overrides;
they are not physical iPhone or Safari device tests. QA artifacts remain in
`outputs/safe144/` and `outputs/npc144/` and are not shipped.
