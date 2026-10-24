# All-slot refinement and the forge window — 136

All six stat equipment slots can refine to +10: weapon, head, armor, garment, shoes and accessory. This applies to existing items, generated bracket gear, affixes and carded pieces. Refined IDs persist through bag normalization, equipping, unequipping, storage/trading and saves using the existing suffix format. Cosmetic appearance selections remain a separate system.

Weapons retain their existing ATK/MATK gain of `max(2, round(base × 0.08))` per level. Each other equipped slot gains one DEF per level, including accessories with no base DEF. Item description DEF is updated without changing the base stat used by combat, so it is not counted twice. Five non-weapon pieces at +10 add 50 DEF in total.

The existing costs and risk remain: one iron ore for weapons, one laterite for other slots, `next level × 100` Bia, +1–+4 guaranteed, then the existing rates. Lek Lai adds 20 percentage points up to 100%. A Safeguard Talisman is consumed only on a failed attempt from +5. Failure without protection destroys that piece and its attached card/affix, as before.

The centered forge window shows the painted blacksmith on the left and six worn equipment choices on the right. Select a piece, review the next level/chance/materials, choose optional safeguards and press Refine. The list and controls freeze during the hammer sequence; incoming saved equipment does not reveal the result early. The footer remains available while the equipment list scrolls on small screens. Tutorial instructions point to the new select-then-refine flow.

The server rolls and saves immediately. A client presentation gate waits for both its matching response and 2100 ms of animation. Three hammer impacts and sparks precede the success, guarded failure or destruction reveal. Closing the window does not cancel a submitted attempt; reopening shows its result. Reduced motion uses the ready pose and the same gate. A unique attempt ID prevents stale/duplicate responses from displaying against another piece. Rejections carry that ID. A 15-second missing result is shown as unconfirmed and blocks new attempts until a late answer or a reload; it is never automatically retried or shown as success.

Art: [generated sheet and exact prompt](../assets/forge136/README.md). The built-in imagegen tool produced the transparent eight-pose NPC. The final sheet is in `assets/forge136/blacksmith.png`.

Verification:

- `tests/refine136.test.mjs`: every gear ID and level, affixes, bag/equip persistence, correct costs, failure/guard behavior, real DEF gains, result timing/correlation and authoritative six-slot commands/rejections.
- Existing refinement, card, crafting, loot, item, story, announcement and translation tests. Full regression suite: 503 passed.
- `scripts/check-refine136.mjs <absolute Playwright module>`: a real local WebSocket host and an isolated account. Exercises all six successful refinements, frozen pre-roll artwork, exact spend, forced guarded failure/destruction, reduced motion, closing/reopening during a pending roll, and centered reachable controls at seven desktop/phone viewport sizes. No production inventory is modified.

Deployment capabilities: `/health` exposes `refineSlots: 6` and `refineSequence: 1`. Existing clients can continue to submit the old command without an attempt ID.
