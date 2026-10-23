# Role skills / Master preview

Draft art and mechanics for 7 classes and the 14 existing Master branch IDs. Production skill slots, persistence and server rules are unchanged.

- `role-skills-v1.png`: 42 base active icons, 6 columns × 7 rows.
- `master-skills-v1.png`: 42 Master active icons, 6 columns × 7 rows, 3 per branch.
- `master-passives-v1.png`: 28 Master passive icons, 4 columns × 7 rows, 2 per branch.
- `*-prompt.txt`: final prompts used with the built-in image generation tool. These are dark panel icons, not transparent world effects.
- `catalog.js`: roles, identities, draft costs, cooldowns, conditions and exact atlas coordinates.
- `simulation.js`: local sandbox only; not authoritative multiplayer rules.
- `vfx.js`: capped Three.js effects, field markers and a persistent animated rooster.

Open `/role-skill-lab.html`. Full Thai design and integration gaps: `docs/role-skills-master-draft.md`.

Validation: `node --test tests/role-*-draft.test.mjs`. Browser runner: set `MOBILE_REVIEW_PORT` to an available port, then `node scripts/check-role-skills.mjs <absolute Playwright index.mjs>`. It starts its own local static server and writes screenshots/checks to `outputs/role-skills/`.

Run `node scripts/export-role-skill-design.mjs` after changing the catalog to refresh the design document.
