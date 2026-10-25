# NPC conversations and personal quest cinematics

The user chose mockup A for all NPC conversations and in-game cinematics using the actual player's appearance rather than a fixed video protagonist.

Ordinary NPCs and story conversations share a bottom gold/jade strip: authentic portrait left, scrollable dialogue centre, service/quest controls right. Teachers use the same strip and preserve existing training gates, branch choices and server requests. Existing service hooks still insert before `close-npc`. Space/tapping reads pages, while only clicking the labelled final quest response sends `questTalk`. Closing, asking questions and watching a scene cannot finish a quest.

The cinematic stage is a runtime 2D canvas with actual painted player animation frames, saved gender/dye/cosmetic equipment, authentic NPC gestures and monster atlases. It layers those moving actors over the game's six existing story paintings with camera zoom, spirit threads, particles and captions. It is not an MP4 and does not call a video-generation service. Main story narrative covers all 22 quests / 43 steps; daily, weekly and class/Master tasks have contextual previews using the same stage. These short previews share choreography and paintings, rather than providing a separate new film for each repeatable task.

Current and completed main-story steps can be watched from the quest journal; future steps stay locked. An unseen current scene starts once when the world is safe, no other modal/loading/menu is active, and the player is not walking, fighting or using AUTO. Otherwise it waits. Seen IDs are stored per server/character in local storage. A failed load can be retried; skip remains usable while assets load. Pause, seek, replay and skip never change quest state. Hidden tabs stop the animation clock, reduced motion removes moving camera/attack loops, and closed scenes do not keep a render loop. Incoming damage closes playback; the online world never gains invulnerability or freezes. Playback may cancel a route and switch an already-active AUTO off, but sends no attack, movement target, reward or quest-completion action.

Validation:
- `node --test tests/cinematic155.test.mjs tests/story-dialogue.test.mjs tests/story-quests.test.mjs tests/i18n.test.mjs tests/shop-lifecycle155.test.mjs`: 26 passing checks after merging main, for catalogue coverage, replay locks, deterministic seeking, reduced motion, unchanged story authority, translation coverage and the concurrently shipped shop lifecycle.
- `scripts/check-npc155.mjs <playwright-module>`: isolated real game/server, explicit talk acceptance exactly once, read/ask/replay purity, real female rogue cosmetics, six viewport bounds, touch pause/skip, all 8 classes × 2 genders, seven monster encounter atlases, mentor layout, damage interruption, stale-load cancellation, Escape returning to the underlying conversation, automatic playback waiting for routes and future-scene rejection. Screenshots/report are under untracked `outputs/npc155/`.
- `scripts/check-market154.mjs <playwright-module>`: desktop/touch shop escrow, search, buying stores, refunds and empty inventory remain functional.
- Native Edge/Chromium touch emulation was used. Physical iPhone/Safari devices were not tested.

No story progression, rewards, payments, combat balance or approved mobile combat-button positions change in this release.
