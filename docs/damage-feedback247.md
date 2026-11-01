# Confirmed-hit damage feedback (248, single-line presentation)

Replaces the accumulated feedback.css number overrides with damage-floats247.js/css. game-controls retains the existing event/impact scheduling and world anchors; server damage, critical flags, formulas and timing are unchanged. Numeric text preserves the exact supplied amount, without added signs or aggregation.

Physical ivory, critical gold, magic blue, magic critical violet, received damage red, healing green; companion numbers keep their mint color and Thai source label. Heavy and critical hits have distinct sizes. The critical exclamation and radial flare have been removed.

Glyph-only impact lasts 180 ms (normal) or 240 ms (critical), separate from world projection. Critical peak scale is 1.3. A short rise and 200 ms exit fade complete a 840 ms normal / 1020 ms critical lifetime. Owner correction: exactly one line above each target. The newest hit replaces its previous number; no sideways lanes, upward stack or damage aggregation. AOE targets still show independently, with a global cap of 40. No extra animation frame loop, new font download, audio, screen flash or screen shake is added. Existing combat shake remains unchanged.

Reduced motion disables glyph transforms and upward travel; the head anchor remains fixed and opacity still fades. Preference is cached via a live media query rather than allocated for every number/frame. The active queue is bounded and cleaned after expiry.

Validation: headless browser on desktop and phone landscape, exact displayed amounts/types, 100-hit stress cap, target cap, expiry cleanup and reduced-motion style; actual game runtime loaded with local authority, successive injected presentation events and no page errors. Motion recording and screenshots are local outputs/damage247. Only test-world presentation events are injected; no live account or reward changes.
