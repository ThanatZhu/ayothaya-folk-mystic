# Shared skill animation playback

Skill poses could be replaced by the optional directional actor or a generic cast clip, so the displayed body no longer matched the selected skill. Novice/legacy choreography now explicitly requests its authored frames, just like role skills. The shared avatar gives those frames and normal combat actions precedence over directional idle/walk art, then restores the selected directional view after combat.

`combat-animation165.js` provides one cast clock and pose sampler for the local actor, remote actors and painted role FX. Authority-supplied release beats map to the corresponding authored effect beats. The body finishes its recovery inside the existing advertised duration; particles retain their independent fade. A following basic event cannot erase an unfinished role pose. Incoming role casts clear obsolete basic/emote presentation, including on remote actors.

Self events wait one extra render frame in the game event queue. Their queue residence is now included in delivery age, once, so self playback does not restart later than the remote presentation of the same event. Lag catch-up, reduced motion and actor-scoped cancellation remain supported.

Preview-only horizontal lunges no longer shift live caster-anchored particles away from the actual actor. The approved preview compositions retain their authored motion; live body movement remains controlled by combat. Damage values, impact times, cooldowns, mana, poison, saved skill allocations and server combat rules are unchanged.

Coverage is Novice plus all seven professions, including both Master branches: all 84 active role skills share this playback path. Automated tests check every role beat, neutral recovery, effect tails, delivery age, male/female rendered texture selection, generic/directional override prevention, legacy skills, normal attacks, custom appearance/equipment handling, and resource lifecycle. Existing tests execute every one of the 84 skills through the live combat engine and retain the Assassin poison/detonation regressions.

Native Edge QA uses an isolated local store and real WebSocket host. A local actor and a second connected actor cast representative base and Master abilities for every profession; captured samples verify the actual avatar uses painted combat frames. Boxer and Shaman are exercised on touch viewports. Further visual checks cover sword, knee and spell effects with the daily popup dismissed. Production saves are never used.

Validation: focused animation/combat/rendering tests, root-module syntax checks, native game samples/screenshots, and `node build-vercel.mjs`. Cache chain: `game.html` → `game-boot.js?v=combat165` → `viewer-world.js?v=combat165` → updated game, multiplayer and avatar modules.
