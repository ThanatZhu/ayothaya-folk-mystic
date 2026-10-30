# Mobile proportions and original NPC dialogue backing — 233

Owner supplied three phone screenshots on 31 October 2026: broken upright Thai labels on the quest/party rail, an unwanted illustrated NPC dialogue background, and a scrolled NPC shop whose header overlaps tabs and whose quantity buttons are tall ovals.

## Result

- Mobile quest/party labels use horizontal Thai shaping with a 44px rail. Font sizes, artwork and combined-mark placement remain authored rather than vertically stacking characters.
- The fixed game viewport uses 100% text-size-adjust to keep mobile automatic text inflation from enlarging letters independently of HUD geometry. This does not disable page zoom or change input focus sizing.
- The NPC conversation and mentor conversation are excluded from the shared jade painter. The original dark gradient and filled authored tooltip frame are restored. The dialogue container has no programmatic focus rectangle; keyboard focus indicators on actual controls remain.
- The mobile NPC shop owns a flex column: fixed title/coins/close, tabs and bag expansion summary, followed by one scrolling item list. Reopening resets both legacy outer scroll and list scroll. Quantity buttons have equal 36px width/height and fixed flex basis; inputs remain 16px text and totals can wrap.
- Shop and NPC dialogue use native dialog scale rather than the HUD zoom. Small HUD controls continue to use the existing shared mobile scale.
- The status/event rail defers ResizeObserver geometry writes to one animation frame and avoids rewriting unchanged CSS properties, removing WebKit rotation feedback.

## Scope

Presentation only. NPC interaction, buy/sell handlers, item and bag expansion prices, inventory, authority validation, quest progression, movement and combat are unchanged. The original foreground artwork is reused; no generated replacement graphics are needed.

## Verification

Run the local isolated realm with `node scripts/serve-mobile233.mjs`. It creates disposable local characters and has no production accounts or tokens. Run `node scripts/check-mobile233.mjs <path to Playwright index.mjs>` with Chromium/Edge and WebKit installed.

The real game check covers 844x390, 667x375, 568x320, 932x430, 1280x590 and portrait layout at 390x844 in both engines. Portrait gameplay remains subject to the existing orientation gate; the test closes that gate solely to inspect dialog layout. It checks horizontal Thai labels, actual frame bounds, original NPC backing, square quantity controls, pinned headers while scrolling, +/- input updates, an authority-confirmed 25-coin purchase and buy/sell tab transitions. Screenshots, recordings and report remain in uncommitted outputs/mobile233; that directory also contains disposable local account data and must never be committed wholesale.

The pre-existing 19 mobile/NPC/shop lifecycle tests and the frontend authority guard pass. Inspect the resulting screenshots and normal-motion recordings; a geometry test alone does not establish visual quality. Desktop layout is verified separately.

Windows WebKit emulation does not expose iOS-only text autosizing. The CSS support check records that limitation instead of claiming a physical iPhone test. Text sizing rationale follows [Apple's Safari documentation](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/AdjustingtheTextSize/AdjustingtheTextSize.html); the known interaction between zoom and text boosting is tracked in [WebKit 313905](https://bugs.webkit.org/show_bug.cgi?id=313905).

Reviewed examples: [phone shop](images/mobile-shop233.png), [original NPC dialogue](images/mobile-npc233.png). WebKit on Windows validates DOM UI geometry here; Chromium captures include the rendered game world.
