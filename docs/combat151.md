# Shared mobile combat template

The owner's approved 2796×1290 screenshot is the sole source of mobile combat geometry. Its centres are recorded at a 932×430 logical baseline in `mobile-combat-layout.js`: four skill positions, attack, page swap, and target selection. The same right/bottom anchoring and uniform scale apply to every class, learned-skill page, Master page, and hotbar order; geometry has no profession or device-brand branches.

`mobile-combat-ui.js` positions the real existing controls, preserving their skills, cooldowns and click handlers. Small landscapes retain the template silhouette while transparent hit areas remain at least 44×44. The game area's ResizeObserver and resize fallback prevent stale heights after rotation or browser chrome changes. Desktop controls restore their original inline styles. The old decorative rail is hidden because the approved image contains individual circular buttons.

Legacy dragged positions for the seven combat controls are removed in both orientations. AUTO and movement-stick preferences remain intact. The editor retains those two adjustable controls and describes the standard skill positions. Other mobile HUD geometry, menus, chat, profile, buffs and event rows are unchanged.

Validation: eight focused tests passed for measured screenshot centres, fourteen viewport shapes, non-overlapping hit circles, preference migration, pagination and translations. Native Edge QA (`scripts/check-combat151.mjs`) checked all eight classes across 25 total base/Master pages, seven viewport sizes (932×430, 844×390, 667×375, 568×320, 960×432, 1024×768, 390×844), DPR 1/3 parity, old saved positions, editor controls, reversed hotbars, native page/skill taps and unchanged desktop layout. No page errors; static build passed. Portrait bounds are checked; the game's existing landscape gate remains. QA artifacts: `outputs/combat151/`.

No new artwork or server combat changes are included.
