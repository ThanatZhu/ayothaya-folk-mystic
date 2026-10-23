# Mobile stability preview

Base: origin/main b2df18f. Changes are isolated in the mobile-stability checkout; no production deployment.

## Implemented

- Compact mobile menu with scrollable overflow; secondary event controls reuse their live DOM nodes. Channel selection has a dedicated full-width row inside the mobile menu and below the minimap on desktop, with overlap checks.
- Portrait-only four-column skill grid with 44px buttons; landscape retains the skill wheel. Chat, joystick and quest placement are checked against visible skill buttons, including all five Master slots.
- Chat width fits its allotted landscape area; expanded chat gets a readable overlay. Controls hide while entering chat on touch devices.
- Mobile utility windows use scrolling rather than CSS zoom, preserving button size.
- Preserve scene/GPU resources when pagehide.persisted is true (back/forward cache); resize on return. Real page exit still disposes resources.

## Checks

Node: mobile, render lifecycle, story quests, story server and save tests: 17 passed.
Browser HUD fixture: 320x568, 390x844, 430x932, 568x320, 667x375, 844x390, 932x430 and 1024x768. Checks cover bounds, skill/joystick/chat/quest overlaps, opening and closing menu/bag/chat, touch input focus, and desktop/mobile relocation.

The browser fixture uses production game HTML, CSS, menu and wheel code with representative UI data. It does not authenticate, play the 3D world, or change saves. It is Chromium/Edge emulation, not an actual iPhone/Safari test. Safe-area insets and a real iOS keyboard still need device validation.

Existing story rule/server/save tests pass. No specific reported quest failure has been reproduced or claimed fixed. Full online quest playthrough, reconnects, scene changes, long sessions, WebGL context loss and real-device rendering remain to be verified.

## Local preview

Run `node scripts/mobile-review-server.mjs` and open http://127.0.0.1:8896/mobile-review.html. The current review server uses port 8898. Browser-check output and screenshots are in outputs/mobile-stability/.

## Minimal combat HUD iteration

- The player portrait and decorative HP/MP frame are retained on desktop and mobile after owner correction. The live status row sits below the frame, including shield duration. Only the target HUD is unframed.
- Target HUD starts hidden, appears for a live selected target, and hides after deselection/death. A nearby engaged boss can show its boss bar without being selected; ordinary camp leaders are not treated as bosses. Guild-war status remains separate.
- Normal monsters have a small health bar above their sprite. Names appear on selection, hover or focus; leaders and bosses retain names. Label projection includes terrain height.
- Removed target HUD from the common popup-frame skin.
- Automated policy/mobile/save/story/lifecycle checks: 20 passed. HUD preview checks cover 8 emulated sizes plus desktop and target/boss state changes. Real-device Safari and live combat verification remain outstanding. No deployment.

## Desktop menu and preview correction

Desktop menu is bounded between the profile and minimap and scrolls horizontally when short on space. Overlap checks cover widths 901, 1024, 1180, 1440 and 1920. Preview iframes preserve the labelled viewport dimensions and scale their whole image to the gallery container; a narrower review panel no longer changes a 1440x900 iframe into a narrow/tall viewport. Browser checks verify each gallery iframe actual width/height against its label.

## Pre-push validation

Full Node suite: 397/397 passed with installed dependencies and local WebSocket access. Static Vercel build passed. HUD browser checks: 8 mobile/tablet sizes, desktop menu widths 901/1024/1180/1440/1920, target/boss states, and actual gallery viewport dimensions passed. Secrets and generated output are not part of the commit. Real iPhone/Safari and complete live quest playthrough remain unverified.
