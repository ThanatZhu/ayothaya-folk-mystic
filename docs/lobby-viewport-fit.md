# Lobby viewport fit

`play.html` now loads `lobby-fit.css` as its layout owner. The legacy
`phone-lobby.css`, `viewport-fit.css`, `character-slots.css`, and
`mobile-lobby-ui.css` are no longer loaded by this page. Other pages retain
their existing styles. `lobby-v2.css` still supplies decorative styling.

The game shell uses the visual viewport height on desktop and touch devices,
reserves safe-area insets, and gives its remaining space to a size container.
Container height queries reflow login controls, account feedback, the five
character slots and the creation form. Entry actions retain a 44 px minimum
height; no whole-screen scale, clipped card, or scroll-to-reach action is used.
Character poses and supporting copy make room for the form on small screens.
The text input stays 16 px and keyboard mode keeps the form visible.

Verification:

- `scripts/check-lobby-fit.mjs`: 24 viewport sizes, seven account/page states,
  Thai and English (336 cases); checks actual content dimensions, visible
  action bounds, overlapping buttons and minimum button heights.
- `scripts/check-mobile-play-ui.mjs`: existing eight-size game HUD suite,
  viewport rotation and keyboard regression check.
- `node --test tests/*.test.mjs` and `node build-vercel.mjs`.

Run browser scripts with `MOBILE_REVIEW_PORT` set to an unused local port and
the Playwright module path as the first argument. Evidence is written under
`outputs/lobby-fit/`. These are Chromium/Edge simulations, not physical iOS
Safari device certification. `lobby-fit-lab.html` provides an interactive local
preview with the production DOM and styles, using no authentication or saves.
