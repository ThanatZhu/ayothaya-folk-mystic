# Illustrated window surfaces — 222

Owner requirement: replace the black stretched window interiors with newly generated in-game backgrounds.

- Use assets/ui-surfaces222/jade-silk.webp for ordinary panels, jade-paper.webp for crafting, extraction, refinement, stores and markets. Phone versions are selected at <=700px width or <=550px height.
- Exact prompts, original generation paths and provenance are in assets/ui-surfaces222/prompts.json. Original PNG masters are preserved in outputs/ui-surfaces222 locally.
- jade-surfaces222.js installs once and paints standard dialogs, HUD panels and popovers on opening, stylesheet load and resize. It uses no permanent rendering or polling loop.
- Keep authored gold frames and transparent corners. Remove only the frame center fill; never stretch an old dark frame center across the content. Craft, card insertion, mail and NPC talk use existing inset backing pseudo-elements.
- Keep background sizing at cover, centered, without repeat. ui-kit.css has an old 28px pattern shorthand, so shared overrides must win over that sizing as well as the image.
- Preserve approved pet/gacha illustrated scenes and cinematic/victory art. Item rarity halos remain silhouette-based; do not apply a rectangular texture to item art.
- Retain real text, focus states and generated controls. Changing a surface does not authorize changing fees, odds, rewards or gameplay.
- Desktop images: silk 295,224 bytes, paper 213,602 bytes. Phone images: silk 15,658 bytes, paper 20,090 bytes.
- Validation: five viewport component and gacha regressions; actual WebGL inventory/status/extraction/crafting/shop, including authoritative equipment/card/batch-sale transactions. Wait for styles and frame images before taking screenshots.

Owner correction: generated backing images must end inside the frame. Native backgrounds use padding-box clip/origin; inset pseudo-element backings never expand beyond the inside of their frame. Do not fix bleed by clipping the whole dialog, because ornaments, portraits and focus indicators must remain visible.

Owner tooltip exception: item stat hover callouts use a plain rounded text bubble with no illustrated backing and no decorative frame. Exclude item-hover221 from the shared surface painter. Keep stat values, contrast, keyboard focus and viewport clamping intact.

Owner boss-meter exception (230): the live boss DPS overlay is a compact, plain translucent rounded text bubble at the upper left, beside the quest HUD. No generated backing, gold frame, ornate toggle or textured progress trough. Exclude boss-live-meter from the shared surface painter. Keep the actual damage/share numbers, party expansion, collapse, focus and touch targets. It moves below an update notice on narrower displays instead of covering it. This changes presentation only; the authority damage/party model remains untouched.
