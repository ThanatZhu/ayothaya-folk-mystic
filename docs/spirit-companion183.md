# Shaman spirit companion prototype (human183)

User requested a more beautiful persistent Shaman spirit and approved a playable prototype. The first masked/armored design was rejected as too similar to Ultraman. The selected replacement is a human-faced Thai female spirit with black hair, jasmine, antique ivory sabai, faded teal cloth, red sacred threads and a small takrut. Its lower body dissolves into mist. No mask, helmet, armor or metal crest.

## Review

Open spirit-companion-lab.html on a local server. Preview started at http://127.0.0.1:8938/spirit-companion-lab.html.
Controls: summon, toggle attacks, walk/follow, reset, or play the full sequence. The page uses the actual CombatWorld Shaman skill and damage rules. Visuals include a brief caster gesture, gold/jade ritual circle, summon/idle/attack/dismiss atlas frames, gentle hovering, curved soft-glow projectiles and impact mist. Root renderer: spirit-companion-vfx.js.

Selected generated bitmap: assets/spirit-companion182/spirit-human-v2.png. Generation used built-in image_gen with transparent background; exact final prompt is saved in prompt-human-v2.json. The rejected masked sheet is kept only in outputs/spirit182/rejected-mask-sheet.png and is not referenced by the prototype.

## Scope

This is a review prototype. The normal live game keeps its existing spirit renderer and combat behavior. Set world.spiritPrototype=true to opt into the new movement and projectile timing. Default rooster attacks are unchanged. Existing Shaman values remain: base lifetime14s, shield70, cooldown20s; Master lifetime24s, shield130, cooldown30s; attack interval1.2s and damage coefficients unchanged.

Prototype spirits use a fixed-camera shoulder offset x-1.15/z-.5 with eased following. They acquire an existing owner target within12units and fire from the shoulder instead of chasing within6units. Damage is queued to resolve .30s after launch. This positioning/range presentation is prototype-only and needs a camera-relative anchor before any broad live rollout. Base and Master metadata exist, but the reviewed art is the base spirit; a distinct Master model is not part of this review.

The engine emits spiritSummon/spiritShot/spiritImpact/spiritDismiss with stable pet/shot identity and timing. Dead/invalid targets, blocked sight, owner death, expiration/removal and re-summon cancel queued hits. Server snapshots carry additive pet metadata; event timestamps translate onto the realm clock. The VFX renderer never deals damage. Character sprites and radial glow texture are shared; impacts are pooled and particle budgets reduced for small/coarse-pointer screens.

## Validation

- Full Node suite:720/720 passed, outputs/spirit183-full-tests.log.
- Seven focused new tests cover base/Master values, exact .30s hit timing,1.2s cadence, follow anchor, cancellation, default live behavior and snapshot timing. Existing role-live tests also pass.
- Browser QA:7 checks passed; six viewports320x568 through1440x900; no console/asset errors or page overflow; all control buttons at least44px.
- Actual measured shot→impact .30s; damage emitted in the same simulation tick as impact, HP1200→1172.
- Final human-model screenshots visually inspected, including clear shoulder spacing. outputs/spirit182/ contains captures and checks.json.
- Static build passed. No production accounts were used. No push/deployment performed.

## Distinct companion attacks (spirit-shot184)

User approved the human-faced spirit and requested visibly distinct companion attacks. The prototype now has:
- Pre-shot soulflame gathering at the spirit's palm, a visible casting/throw pose, and a short source aura pulse.
- A newly generated painted jade comet with jasmine petals and sacred-thread details (spirit-shot-v3.png; exact built-in image_gen prompt in prompt-shot-v3.json).
- A continuous soft curved ribbon from the spirit to the moving projectile. The flight arcs above the player so its origin stays legible; no player swing animation is triggered by the companion.
- A painted lotus/mist seal and petals at impact. Sprite-atlas borders feather in the renderer to avoid rectangular cut edges and neighboring-frame fragments.
- Teal floating damage with the source label พราย. Only prototype companion hits get source/pet/shot attribution; prior damage context restores even if damage handling throws. Subsequent player hits retain their normal source.

Damage strength, the1.2s cadence and .30s impact delay are unchanged. Reviewed mid-flight and full impact frames. Final checks:23/23 focused tests (spirit combat, existing role-live, localization),8 browser checks including mid-flight capture, source-labelled damage, exact impact timing and six viewport sizes; no console/shader/asset errors. Static build passed. New screenshots: outputs/spirit182/mid-flight-detail.png and impact-detail.png. Still a review prototype; no deployment performed.
