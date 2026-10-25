# Podium leaderboard (153)

The ranking dialog keeps the game's original gold/jade frame and Mali font. The first three positions show standing painted avatars on stepped platforms in visual order **2, 1, 3**. Rank 1 is higher in the centre. Ranks 4–10 follow as a numbered list with character portraits and scores. Both power and tournament tabs use this presentation. No places are invented when a board is empty; missing podium places are marked unclaimed.

Desktop width grows to at most 1120 px with a bounded 880 px height. The body scrolls independently while tabs and Close stay visible. Landscape phones use a compact podium and hide the long explanatory paragraph so the three platforms fit. Viewport/safe-area placement remains owned by the shared HUD panel system.

The realm returns at most ten entries for each tab, but still calculates the player's own position against the entire existing board. Scores, sorting, retained 200-player power history, tournament scoring, prizes, and rollover rules are unchanged. Public look metadata (class, gender, Master branch, appearance and cosmetic equipment IDs) is saved alongside power entries, refreshed on requests and character checkpoints, and survives logout. Older offline rows that lack cosmetics render the saved class/gender with its default equipment until that character next supplies its look; no extra private account/profile reads are performed.

`loadPaintedStanding` in `painted-character.js` follows the full game's calibrated painter but loads only the selected gender's first standing frame. Its separate bounded cache avoids constructing all animation frames or evicting live avatar animation frames. The leaderboard paints each canvas once with soles aligned to the platform. Async paints are guarded against closed/replaced dialogs; missing art does not hide the player's name or score. No timers or idle animation loop are added.

Validation:

- `node --test tests/podium153.test.mjs tests/market70.test.mjs tests/arena96.test.mjs tests/i18n.test.mjs tests/album152.test.mjs tests/character-size.test.mjs tests/equipment41.test.mjs`
- `node build-vercel.mjs`
- `node scripts/check-podium153.mjs <absolute Playwright module path>` starts an isolated real game/realm and checks both ranking tabs, ten painted avatars, source pixel equivalence with the full painter for both genders/cosmetics, visual ordering and platform baselines, escaped names, empty boards, eight desktop/phone viewport sizes and dialog bounds. Local outputs stay under `outputs/podium153/`.
- Backend health advertises `leaderboardAvatars:1`.
