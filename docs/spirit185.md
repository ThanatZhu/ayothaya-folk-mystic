# Live spirit companion release 185

Integrates the approved human Thai spirit and jade comet attack into the real game, preserving main's 0.119 skill catalog, poses, global cooldown and map updates.

- Current summon: Spirit Master's `sm-lord` (`greatSpirit`). Existing lifetime20s, cooldown30s, shield130, damage coefficients and target acquisition12 remain unchanged.
- Follows beside the owner's shoulder, oriented by the owner's facing. Uses the approved human atlas and painted jasmine/red-thread projectile atlas.
- Server owns launch, target, hit and damage. Each shot has a stable owner/pet/shot identity; damage resolves after0.30s. Both owner and observers receive the same events.
- Jade damage numbers carry the label `พราย` / `Spirit`; ordinary attacks retain their own attribution. Companion hits bypass the player's animation hold queue.
- Event presentation uses buffered event lag so prediction-clock drift does not skip a short projectile. Camera-relative facing and projectile rotation work with the real game's rotating camera.
- One shared character atlas and one effect atlas; bounded mobile/desktop effect pools. Legacy ghost sprites and old summon VFX are suppressed only when the server advertises `spiritCompanionSchema:1`.
- Host health exposes `spiritCompanion:185`, `respawnChoice:1` and `revivalTalisman:200`. Frontend entry chain uses `live185`.

Also includes the pending death choices, generated revival artwork and durable200-gold-bar talisman purchase described in `death178.md` and `revival180.md`. Drop and quest sources for the talisman remain unspecified.

Validation: full Node suite, focused presentation-clock regressions, prototype browser regression, and `scripts/check-spirit-live185.mjs` against an isolated local host with two current-format accounts. The browser check covers real skill commands, observer rendering, damage attribution, camera rotation, viewport fit and death/purchase/respawn behavior. QA saves and screenshots stay under ignored/untracked `outputs/`, never production profiles.
