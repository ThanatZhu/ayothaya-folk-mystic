# Death choices (death178)

When HP reaches zero, a centered native modal dims the entire game and offers:
- Revive here: full HP/MP at the current position.
- Revive in Ayutthaya: full HP/MP at the capital spawn, using the authoritative travel/save flow.

The existing death EXP penalty is unchanged. There is no new currency or item fee. The countdown no longer auto-respawns players. Party revival closes the modal automatically. Zero HP is retained across saves/reconnects for every class. Existing clients' returnToSpawn command still revives at the local map spawn.

Online respawn requests validate that the character is dead. Only the capital is allowed as a death travel destination. An alive character cannot use this as a free warp/heal. The travel save writes restored HP/MP and clears the saved down timer before acknowledging the transfer. The modal offers retry feedback on connection failure. Both frontend and DigitalOcean backend must be deployed together for these commands.

Validation:
- Full existing suite: 700/702 first pass; missing new English strings were added and the localization test passed. The other failure was a random HTTP test port blocked by Node fetch; world-reset166 passed on rerun without code changes.
- Focused rerun: 20/20 (death, localization, world reset).
- Existing combat and role suite: 22/22, including party resurrection and reconnect behavior.
- New death tests cover indefinite waiting, manual input while dead, current-location revive, invalid/alive/duplicate revive, capital-only death travel, no currency charge, and dead-state persistence.
- Production static build passed.
- scripts/check-death178.mjs: isolated local account/server, seven viewport sizes (320x568 through 1920x1080), no overflow, buttons >=44px, modal escape blocking; real online here/capital actions and party revive; no browser errors.
- Screenshots and result JSON: outputs/death178/.

No production accounts were used or modified. This change has not been pushed.

Theme follow-up (death-theme179): uses the game's existing ui63 gold-lotus window and button artwork, ui-kit jade pattern, and Ayothaya emblem. Nine-slice borders keep corners undistorted. Static build and all 8 real-browser checks passed again across 7 viewport sizes; desktop and landscape screenshots visually reviewed.
