# Level-objective tracker refresh

The story tracker cached only the quest state and walking state. Raising Base Lv.15 to Lv.17 while the current objective still required Lv.18 therefore left the displayed current level at 15, even though the player HUD already showed 17.

Its render signature now includes the current integer Base level only while displaying a level objective. EXP changes inside one level do not rebuild the tracker, and unrelated objectives do not redraw on level changes. Both online and offline trackers use the existing `baseProgress(world)` calculation. Server-owned progression, requirements and reward payment are unchanged.

Regression tests drive the real tracker update function: online/offline 15→17 without a quest-state change; stable rendering inside the same level; and 18 followed by the authoritative transition to the next step. The import chain cache keys are refreshed through the game boot page.

Validated in an isolated browser game with the actual local realm: Lv.15 to 17 updates the tracker without changing the quest, ordinary EXP keeps the DOM stable, and the server advances the objective at Lv.18. No browser errors. Readiness and cross-map navigation changes from main are preserved; reconnecting waits for authoritative quest data before showing the current level.
