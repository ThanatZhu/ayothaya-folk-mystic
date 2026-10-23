# Touch UI and grounded lobby preview

The local entry point is `/mobile-play-lab.html`, served by
`scripts/mobile-review-server.mjs` with `MOBILE_REVIEW_PORT` set to a free port.
It switches between production HUD markup and an isolated character lobby fixture.
Neither fixture signs in, changes a save, spends an item, or contacts the realm.

## Changes

- `mobile-play-ui.js/css` own touch layout after legacy sheets. Five live skill
  buttons appear per page; every available hotbar slot remains reachable in its
  original order. The existing AUTO settings still reorder the saved hotbar.
- Preserve the player's gold frame. Keep the top corners compact, buffs under
  vitals, and move the online/player chip into the menu without replacing it.
- Show a 44px quest icon instead of a text strip; expand for details, the
  navigation action, and the existing navigation-arrow toggle.
- Menus have a backdrop, utility dialogs are modal on touch screens, and visible
  panels clear movement input and hide combat controls. Desktop panels retain
  their existing behavior. Keyboard, camera and world taps cannot pass through
  the backdrop.
- Minimap, joystick, potions, AUTO settings and attack have reserved areas.
  Respect browser safe areas; chat is a long central strip with the last message.
  A generated jade-and-gold PNG button expands chat and rotates to collapse it.
  The source prompt is `assets/ui-mobile/chat-drawer-prompt.txt`; the original
  generated alpha is preserved in `assets/ui-mobile/chat-drawer-v1.png`.
- Buffs wrap to additional rows without scrolling or clipping. Dense groups use
  smaller badges, with an automated 36-status stress case on every tested size.
- Place CH beside the profile name, open its chooser below the profile, and
  expand the mobile menu toward the profile with wrapping on narrow screens.
- The skill set switch is an opposing circular-arrow icon in the sixth grid
  position. It retains a spoken set label but has no visible text.
- Draw the lobby pedestal and shadow inside the character canvas using the
  normalized sole coordinate. Remove the separate CSS pedestal and floating CSS
  animation. Reflow/scroll mobile lobby content instead of scaling the whole UI.
- Permit portrait lobby use. On narrow portrait displays the hero precedes the
  roster and entry controls. Landscape uses three columns with scrollable content.
- Hide unhurt ordinary monster bars until selected on mobile; hide distant NPC
  names and unselected monster names. Boss HUD and selected target vitals remain.
- Bump entry module cache keys so a later deployment can load the new code.

## Validation

`scripts/check-mobile-play-ui.mjs` exercises 320×568, 390×844, 430×932,
568×320, 667×375, 844×390, 932×430 and 1024×768 with touch input, plus a
desktop-to-portrait-to-desktop resize. Checks include five slots per page,
access to all fifteen learned slots, 44px minimum skill/entry targets, control
overlap, quest expansion, menu input blocking, AUTO modal behavior, lobby
scrolling and character previews. Evidence is in `outputs/mobile-play-ui/`.

The existing `scripts/check-mobile-hud.mjs` continues to check desktop menu,
channel, profile and target placement, keyboard focus behavior and preview frame
dimensions, with mobile assertions updated for the new collapsed quest strip.

This is a local preview wired into the game source, not a deployment. Browser
automation uses Edge touch emulation; real iOS Safari/Android keyboard, browser
bar and notch behavior still need device verification. Rendering performance
and quest-state bugs require separate gameplay investigation.
