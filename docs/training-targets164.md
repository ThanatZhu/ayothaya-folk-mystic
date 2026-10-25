# Training quest destinations

The teacher trial tracker now links each unfinished hunt, boss, material or cowrie requirement to a real monster spawn. The title button chooses the next missing requirement; individual rows choose that requirement. Completed rows are grouped in an expandable list. When everything is ready, the title button returns to the teacher; the existing server-validated turn-in still requires the player's confirmation.

`training-targets164.js` reads the combat monster indices, spawn catalogue and actual `DROPS` entries. Material searches prefer regular monsters, then nearby reachable maps, then better expected drops. They never substitute a similarly named item or route through an instance or guild hall. The hint shows the chosen monster and map.

`training-walk164.js` uses existing authoritative `walkTo` commands. On the current map it follows the nearest reachable living monster of the chosen type and selects it on arrival. It does not start automatic combat. If all matching monsters are dead, it walks to their spawn area and explains that they must respawn. Between maps it walks to each ordinary portal and uses existing free gate travel, without charging a warp fare.

A session-storage continuation contains only the objective, trial signature, online flag and timestamp. It is scoped to the server/character slot, expires after ten minutes, waits for loading/online readiness, and revalidates the trial at every hop. Cancelled/completed trials cannot resume. Manual movement still cancels the existing walker and never restarts it; manual steering before a pending continuation is ready clears that continuation too.

Validation:

- `node --test tests/training-targets164.test.mjs tests/city-life40.test.mjs tests/auto-walk149.test.mjs tests/training-network40.test.mjs`: 20 passing tests, including source validity for both trial tiers, continuation scope/expiry, offline rules, target death, manual cancellation, authoritative movement and unchanged trial submission.
- Actual local game/realm browser checks on desktop and touch: correct source label, walking with a menu open, arrival/selection without automatic combat, manual cancellation, and a real portal transition from Moonlit Mill to Lotus Marsh with no currency charge.
- `node build-vercel.mjs`.
