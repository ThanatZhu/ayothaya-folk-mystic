# Ayothaya project rules

## Gacha UI (owner requirement)

Before adding or changing any gacha screen or banner, read [docs/gacha-design-system199.md](docs/gacha-design-system199.md) and inspect the approved concept at docs/images/gacha-approved199.webp.

All future gachas must use that shared Thai emerald/gold banner design. Buttons must use generated image assets. Never use CSS box buttons or rectangular backplates/halos behind item art. Use transparent image hit targets for items. Visually inspect desktop and phone screenshots; overflow checks alone are insufficient.

Preserve server-owned prices, rates, pity, idempotency and rewards during UI work. Implement the shared slots/registry described in the design document and run its checks before delivery.

Companion UI and ritual motion: read docs/game-ui-review201.md. Use its shared motion clock and inspect a normal-motion recording before approval. Skills and layout tests alone do not prove visual quality.

## Installed design skills

For game UI/UX design, implementation and review, use the installed game-ui-design skill at ~/.codex/skills/game-ui-design/SKILL.md. For interaction animation and motion review, also use ui-animation at ~/.codex/skills/ui-animation/SKILL.md. Load their relevant references and keep this project's approved visual rules and gameplay authority requirements. These skills were installed at the owner's request on 28 October 2026.

For the current UI structure and validation evidence, read docs/game-ui-review202.md. Shared generated controls are owned by premium-controls202.css; keep decorative ends proportional using nine-slice rendering.
