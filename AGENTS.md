# Ayothaya project rules

## Gacha UI (owner requirement)

Before adding or changing any gacha screen or banner, read [docs/gacha-design-system199.md](docs/gacha-design-system199.md) and inspect the approved concept at docs/images/gacha-approved199.webp.

All future gachas must use that shared Thai emerald/gold banner design. Buttons must use generated image assets. Never use CSS box buttons or rectangular backplates/halos behind item art. Use transparent image hit targets for items. Visually inspect desktop and phone screenshots; overflow checks alone are insufficient.

Preserve server-owned prices, rates, pity, idempotency and rewards during UI work. Implement the shared slots/registry described in the design document and run its checks before delivery.

Companion UI and ritual motion: read docs/game-ui-review201.md. Use its shared motion clock and inspect a normal-motion recording before approval. Skills and layout tests alone do not prove visual quality.

## Installed design skills

For game UI/UX design, implementation and review, use the installed game-ui-design skill at ~/.codex/skills/game-ui-design/SKILL.md. For interaction animation and motion review, also use ui-animation at ~/.codex/skills/ui-animation/SKILL.md. Load their relevant references and keep this project's approved visual rules and gameplay authority requirements. These skills were installed at the owner's request on 28 October 2026.

For the current UI structure and validation evidence, read docs/game-ui-review202.md. Shared generated controls are owned by premium-controls202.css; keep decorative ends proportional using nine-slice rendering.

## Ground loot (owner requirement, 30 October 2026)

Read docs/ground-loot219.md before changing drops, AUTO collection or companion movement. Automatic ground pickup starts as soon as an owned pet is equipped/following, even with combat AUTO and pet skill AUTO OFF; no pickup switch or key is required. That pet must physically travel to the drop. Merely owning a pet or enabling combat AUTO is insufficient. Keep server authority, manual pickup, party priority, overflow mail and existing drop rates intact.

## S companion build rule (30 October 2026)

Read docs/pet-stat-build220.md before changing S pet bonuses. Keep player-chosen primary/secondary/support stats character-wide, preserve each star rank’s total bonus and pet-specific skills, and keep server-owned durable/idempotent saves. Never replace this with class-locked presets. Ground collection remains independent of combat AUTO.

## Illustrated window surfaces (owner requirement, 30 October 2026)

Read docs/ui-surfaces222.md before adding or changing window backgrounds. Use the generated jade surfaces; preserve gold frame edges and transparent corners, remove the old dark center fill, and keep cover sizing without pattern repetition. Inspect actual desktop and phone screenshots after images load.

## Frontend update continuity (223)
Never auto-reload on release discovery. Preserve active WebSockets and retained runtime/asset URLs. Follow docs/releases223.md: choose a new release ID, commit source/assets, freeze, commit archives, then build and push. Never edit archived files or publish modified runtime under an old ID. Backend container replacement is separate and cannot be described as zero-disconnect without hosting evidence. Premium benefits and profanity filtering remain deferred by the owner.

## Separate frontend publication (226, owner reports disconnects)

For UI-only updates, follow the frontend-only workflow in docs/releases223.md and run scripts/check-frontend226.mjs. Push the frozen/tested commit to frontend-live and publish only Vercel through its connected tools. Do NOT push UI-only releases to main while DigitalOcean auto-deploys main. Fetch frontend-live and preserve its newest code when beginning future work. Backend/shared-rule changes require a separate planned authority rollout; no zero-disconnect claim for those. Use the in-app browser or connectors for hosting; do not control the owner's native computer/browser.
