# Inventory drag preview and desktop fold control

Nonmodal bag previews now attach to the body, keeping client coordinates in the
viewport instead of the scaled, scrolling bag window. The icon has a 64px square
box and sits above utility windows. Modal touch dialogs retain their own preview
owner. Closing the bag or losing focus cancels the drag without discarding.

The desktop fold control below Party now renders at 64x44px, with explicit
artwork dimensions so layout cannot shrink the image. Dock placement reserves
222px for both 84px tabs, the 44px fold control and their gaps.

Validation: eight focused actionbar/activity/localization tests passed.
`scripts/check-drag146.mjs` reproduces the old offset before the fix and checks
native mouse coordinates at three points inside/outside the bag, actual shortcut
assignment without inventory loss, close/blur cancellation, slot reordering,
visible fold artwork, both toggle directions, and bounds at five desktop sizes.
Browser screenshots and reports are kept in `outputs/drag146/` (not shipped).
