# Farming calibration 223

This is a seeded combat model, not a real 4–7 day playtest. First base-level cap target: 24–56 active hours at 6–8 hours/day. Levels 1–50 unchanged, 51–70 use x100 and 71–99 x400. Existing curve-1/2 characters retain level and filled fraction; job, stats, HP/MP and items are preserved.

- swordsman: 44 hours; 7.3 days at 6h/day; 5.5 days at 8h/day.
- lancer: 41.9 hours; 7 days at 6h/day; 5.2 days at 8h/day.
- hunter: 30.6 hours; 5.1 days at 6h/day; 3.8 days at 8h/day.
- boxer: 32.5 hours; 5.4 days at 6h/day; 4.1 days at 8h/day.
- rogue: 35.5 hours; 5.9 days at 6h/day; 4.4 days at 8h/day.
- shaman: 32.1 hours; 5.4 days at 6h/day; 4 days at 8h/day.
- acolyte: 39 hours; 6.5 days at 6h/day; 4.9 days at 8h/day.

Assumptions: {"seed":223,"gear":"level-appropriate ordinary gear, +5 blue before Lv70; +10 purple after Lv70","skillRanks":5,"killsPerStage":8,"travelPerKill":4,"activeFraction":0.65,"excludes":["incoming monster attacks and deaths","party, event, premium and food XP bonuses","competition and variable material/gear acquisition","real multi-day playtesting"]}

Month-one direction: farm map materials, craft level-appropriate gear, refine, group for MVP/GvG and compete. Near-endgame means a combat-ready orange/red set and progress toward rainbow equipment, not a guaranteed full rainbow +20 set or the 50,000-shard rainbow amulet. Preserve all old rainbow materials, 100 conquest shards and 1,000,000 cowries per rainbow equipment craft. Only Cloud Peak Yaksha and participating members of GvG podium guilds grant the existing 1–3 conquest shard awards. Scheduling, participation and drops make calendar dates variable.

Reproduce: node scripts/probe-farming223.mjs. Review real fresh-character farming times and gear acquisition after release; adjust the shared bands and run migration/regression checks before another release.
