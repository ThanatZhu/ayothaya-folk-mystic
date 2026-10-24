# Pointer drag lifecycle and mobile HUD stability

Bag pointermove, pointerup and pointercancel handlers now run in the window
capture phase, before the touch HUD stops bubbling events. Once a drag crosses
the movement threshold, the stable bag dialog owns pointer capture. Releasing,
cancelling, losing capture, closing the bag or losing focus clears the preview
and drag classes. A fresh pointerdown cancels any unfinished gesture. Legitimate
Cancel/Confirm clicks immediately after a drag remain usable.

On mobile, the bag uses scale:none rather than scale:1, because an identity scale
still offsets fixed descendants into the dialog's coordinate system. Desktop
previews retain the body/viewport owner. Both are checked against real pointer
coordinates inside and outside the bag.

Bag opening focuses the dialog container, preventing the browser's automatic
Craft-button focus outline from resembling a stale quest guide. The actual coach
still follows currentObjective; an active crafting quest shows guidance and a
completed story (quest index at STORY.length) hides the top-layer guide.

Equipment buttons are rebuilt only when worn item IDs change. Selecting items,
selecting worn slots and inventory snapshots reuse those DOM nodes. Mobile gear
frames use the existing square artwork as an unfiltered static background,
avoiding border-image/filter repaint churn.

Mobile event controls reserve identical image and caption tracks, including
controls without timers. The row does not wrap; narrow screens shrink/scroll it.
Discord's image uses the same 36px track. Latin Quest/Party captions use explicit
7.5px line boxes instead of Safari's upright vertical glyph spacing, while Thai
captions retain their original layout and all captions remain localized.

Validation:
- 17 focused actionbar, HUD, AUTO, localization, movement and summon tests pass.
- scripts/check-mobile148.mjs: native CDP finger drags at 844x390, 932x430 and
  568x320; pointer-position checks, cancellation, confirmed single-item discard,
  repeated drags, inventory snapshots mid-drag, close cleanup, stable gear DOM,
  quest guide active/completed states, and English caption/event-row geometry.
- scripts/check-drag148.mjs: native desktop mouse previews, bag-to-slot and
  slot-to-slot assignment, blur/close cleanup, discard/cancel/repeat at 1440x900
  and 1920x1080, authoritative inventory counts, and desktop fold behavior.
- Browser evidence uses headless Edge with native input APIs and touch emulation;
  it is not a physical iPhone/Safari test. Artifacts remain in outputs/mobile148/
  and outputs/drag148/ and are not shipped.

Latest summoning/card UI changes on main are preserved. Their missing English
strings are included so the repository's localization check remains complete.
