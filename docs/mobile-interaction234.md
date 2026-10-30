# Mobile nearby-action placement — 234

Owner found the map-warp action underneath the quest tracker after the previous mobile UI release.

## Cause and fix

The full-size mobile HUD kept the legacy left-side #interact position. The small-screen fitter placed that same button separately, so the previous layout check did not cover the scale=1 interaction/quest overlap.

mobile-interaction-dock234.js now owns only the nearby NPC/portal button in every mobile layout. It plans in physical viewport coordinates using the measured quest/party rail, minimap, chat, movement and combat controls, then converts to CSS zoom coordinates once. It prefers the free middle area above chat. Portal labels have enough width to show the destination; NPC talk retains its compact width. Safe edges and the existing small-screen scale are preserved. Desktop inline geometry is restored on mode changes.

Refreshes are coalesced into one animation frame on layout changes, quest/party size changes and action visibility/text changes. Repeated world-tick hidden/kind writes are deduplicated. The planner does not create a new button or replace travel/NPC handlers. Prices, map links, range checks, movement, quest progress and server rules stay unchanged. The previous mobile shop and classic NPC dialogue changes remain included.

## Validation

- Four planner checks cover expanded quests, scaled screens, changed rail bounds and an unavailable rectangle.
- The production game UI is exercised in Chromium/Edge and WebKit at 844x390, 667x375, 568x320, 932x430, 1280x590, 1024x768 and 390x844, followed by rotating back to 844x390.
- At each size, independently check the actual rendered action bounds, overlap with live controls, clear placement state and elementFromPoint hit testing. Repeat with the party panel and quest panel.
- Both engines confirm an actual portal-button click reaches the rice-fields map in the isolated local realm. The test waits for the final destination, not an intermediate navigation.
- Existing mobile skill paging and orientation checks pass. The authority dependency guard reports no backend changes.
- Screenshots and normal-motion recordings live in uncommitted outputs/mobile234. This uses browser emulation; no physical iPhone claim is made.

Reproduce: start `node scripts/serve-mobile233.mjs`, then run `node scripts/check-mobile-interaction234.mjs <path to Playwright index.mjs>`. The fixture creates disposable local characters and never writes production accounts.

Reviewed [portal beside the expanded quest HUD](images/mobile-portal234.png).
