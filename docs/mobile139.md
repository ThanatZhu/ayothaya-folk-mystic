# Mobile menu, chat and AUTO targeting

The touch HUD reuses the live inventory, menu, chat transport, saved hotbar and
AUTO configuration. The right arrow opens the icon menu; a bag shortcut and the
existing Discord invitation sit beside the minimap. The compact bottom chat
opens a left drawer with room, world, party, guild and whisper channels.

AUTO opens a target picker. A player can hunt all monsters, one monster type,
or an eligible duel/war opponent. The server validates entity targets against
its combat roster; ordinary players cannot become enemies through this UI.
The gear opens the existing skill checkbox, hotbar position and potion pages.
Stop remains visible while the target list scrolls.

## Art

`assets/ui-mobile139/panel.png` and `ring.png` were generated with the built-in
image_gen tool using the original ui63 frames as style references. Exact prompts
are in `assets/ui-mobile139/prompts.json`. Both are 1254 × 1254 RGBA images with
transparent centers and exteriors. The panel uses nine-slice borders with fixed
corner caps; the ring surrounds live labels/icons. Text remains DOM content in
the existing Mali font. The desktop chat drawer uses the same painted panel.
No player text is baked into images.

## Validation

- Full regression suite: 511 tests passed, 0 failed.
- Desktop/touch chat checks pass in Thai and English, including actual local
  send/receive, whisper routing, drafts, keyboard shortcuts and viewport bounds.
- `tests/mobile139.test.mjs` covers target normalization, quest-hunt compatibility,
  live combat filtering and authoritative duel permission checks.
- `scripts/check-mobile139.mjs` starts a disposable local host and checks actual
  touch input, inventory/menu navigation, sending chat/whispers, monster and duel
  selection, Stop, skill configuration persistence, and desktop AUTO behavior.
- Touch layouts: 844×390, 667×375, 568×320, 932×430, 1024×768, 768×1024,
  320×568, 360×640, 390×844 and 412×915. Shortcut/joystick/combat bounds and
  intersections are checked, with HUD, drawer and menu screenshots per size.
- Visual viewport dimensions update on resize even after keyboard focus ends.
  A reduced visual viewport is simulated to check the chat input remains within
  the visible area. This is browser emulation, not a claim of testing every
  physical iPhone.

The backend advertises `autoTargeting: 1` in its health response. Deploy frontend
and backend together; the new filtering must be authoritative before release.
