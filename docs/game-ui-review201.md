# Game UI and motion review — 28 October 2026

## Research
Reviewed these community skill sources, then installed both globally at the owner's request on 28 October 2026. Their SKILL.md files and referenced Markdown documents were verified after installation.
- Game UI Design: https://github.com/jeremylongworth-source/AgentSkills/tree/main/skills/game-ui-design
- Game UI checklist: https://github.com/jeremylongworth-source/AgentSkills/blob/main/skills/game-ui-design/references/game-ui-checklist.md
- UI Animation: https://github.com/mblode/agent-skills/tree/main/skills/ui-animation
- Motion diagnosis: https://github.com/mblode/agent-skills/blob/main/skills/ui-animation/references/debugging-symptoms.md

The curated installer list was checked; it did not contain these two skills.
Their guidance is input to design judgment, not proof that an implementation is attractive.

## Current direction
Desktop companions: quiet owned-companion rail, large selected creature, name/stars and actual bonuses beside it; follow and upgrade actions next to their effects. Active-companion skill controls remain separate below. The two management actions keep their actual semantics and server commands.

Portrait: selected creature and management content first; horizontally scrollable collection underneath. Short screens scroll management content without moving the window frame. Landscape: compact collection rail and readable details, with touch targets at least 44 px.

Use existing generated jade/gold capsule controls and generated close artwork. Creature/item hit targets remain transparent, including selected state. No UI framework, extra 3D renderer or full-screen video is needed.

## Ritual clock
Both gacha categories share gacha-motion201.js and gacha-motion201.css.
- Request waiting: neutral closed seal/egg; no reward art or assumed successful charge.
- Gather: 840 ms, continuous same-object lift and restrained rings.
- Anticipation: 300 ms, small compression.
- Impact: 260 ms, one localized soft light release.
- Arrival: 420 ms plus 40 ms per extra slot.
- Reveal on tap: shell opacity leaves over 160–220 ms, saved reward resolves from 94% scale over 480 ms.
- Reduced motion/skip/interruption: settle directly to unopened saved results. Never reroll.
No pose-swapping flutist, full-screen flash texture, scale-from-zero reward, perpetual musician loop or rectangular item glow in the banner ritual.

## Ownership
- pet-companion201.css owns companion management presentation.
- gacha-motion201.js owns the shared ritual timing and neutral focus markup.
- gacha-motion201.css owns ritual presentation for the banner layout.
- Existing draw functions, account normalization, pity, receipts and reward persistence remain authoritative.
- Legacy standalone ritual views retain their existing art; banner presentation uses the shared focus.
- Future visual changes must edit the owning stylesheet instead of stacking arbitrary patches into unrelated UI files.

## Review evidence
Run scripts/check-gacha-banner200.mjs for five viewports and transaction/retry flows.
For this revision outputs/design201/check-motion.mjs records the actual browser sequence and verifies both categories reach all five phases, category interruption, skip, and runtime reduced-motion preference changes.
A CSS/layout check alone cannot approve the visual design. Inspect desktop, short landscape and portrait screenshots and watch the actual browser recording before delivery.
