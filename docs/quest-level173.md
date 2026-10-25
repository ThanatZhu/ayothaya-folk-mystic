# Level-objective tracker refresh

The story tracker cached only the quest state and walking state. Raising Base Lv.15 to Lv.17 while the current objective still required Lv.18 therefore left the displayed current level at 15, even though the player HUD already showed 17.

Its render signature now includes the current integer Base level only while displaying a level objective. EXP changes inside one level do not rebuild the tracker, and unrelated objectives do not redraw on level changes. Both online and offline trackers use the existing `baseProgress(world)` calculation. Server-owned progression, requirements and reward payment are unchanged.

Regression tests drive the real tracker update function: online/offline 15→17 without a quest-state change; stable rendering inside the same level; and 18 followed by the authoritative transition to the next step. The import chain cache keys are refreshed through the game boot page.
