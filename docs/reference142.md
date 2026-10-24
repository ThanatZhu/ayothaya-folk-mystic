# Mobile HUD correction against the supplied reference

The reference determines the composition. Decorative frames retain the game's
jade/gold palette and Mali font; they do not determine the screen layout.

- Four circular skills follow a connected arc around a larger attack button at
  the right/bottom screen edge. The page-swap button sits above attack and the
  target selector below/left. AUTO sits above the center chat preview; its picker
  gear opens the existing skill configuration.
- The six consumable shortcuts are hidden on touch. Their contents, inventory,
  desktop shortcuts and saved AUTO potion settings are retained.
- Quest/Party tabs stay vertical at the left edge with adjacent compact cards.
  Mobile does not fall back to a horizontal tab strip or floating quest modal.
- The center-bottom preview occupies 30vw on landscape (168–420px), with two or
  three lines. Opening chat attaches a full-height drawer to x=0, width=44vw.
  The rest of the scene remains visible; there is no dark full-screen backdrop.
  Portrait uses a wider drawer so text and input stay usable.
- Closing uses a generated side tab centered on the drawer's right edge. The
  old top-corner close control is absent on touch. The preview remains visible
  while the drawer is open, using the same real chat history.

`assets/ui-mobile142/chat-back.png` is generated with the built-in image_gen tool;
its exact prompt is in `assets/ui-mobile142/prompt.json`. The connecting combat
rail is a small code-native SVG; existing painted skill/attack art is reused.

`scripts/check-reference142.mjs` exercises touch input, live chat and whispers,
menu/bag, authoritative AUTO type/player selection, picker gear and skill
checkboxes. It verifies hidden consumable buttons, preview proportions, edge
attachment, full drawer height, side-tab position and control intersections at
ten mobile/tablet viewport sizes, plus a reduced keyboard viewport and desktop
AUTO behavior. Screenshots are written to `outputs/reference142/`.
