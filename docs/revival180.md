# Revival talisman (revival180)

Supersedes the free-here behavior in death178. Item ID: `soul-talisman`, Thai name: ยันต์คืนขวัญ.

- Generated transparent inventory art: assets/revival180/soul-talisman.png; built-in image_gen prompt retained alongside it.
- Revive here consumes exactly one talisman, restores full HP/MP and preserves position. The dialog shows item art, owned count and cost. With no talisman the button is disabled and the capital button remains enabled.
- Server validates death and inventory before mutation; duplicate requests while alive never charge again. The final item is removed from the stack. The bag and HP use the existing authoritative checkpoint system. The legacy returnToSpawn command also requires a talisman, so it cannot bypass the fee.
- Offline play uses the same pure consumption rule; writes the new inventory before revival, rejecting storage failure instead of granting a free use.
- Reviving in Ayutthaya and party healing/revival do not consume this item.
- Inventory category: usable. Cannot be used as a normal potion, cannot trigger recall, and cannot be sold to NPCs. No automatic rewards have been added.
- Acquisition/source and price are pending the user's answer. No shop/drop price was invented; item is defined in the common item catalog and can be issued through existing admin item grants.

Checks: 32 focused unit tests passed covering item rules, online death, missing inventory, last-item removal, reconnect persistence, normal items and healer revival; full static build plus real-browser respawn checks use scripts/check-death178.mjs with one test talisman seeded on the isolated account.

Not pushed to production. Backend and frontend need deployment together.

Real-browser check completed: 8 checks passed, no browser errors; all 7 viewport sizes fit. Confirmed one-item deduction, disabled here button at zero, free capital transfer and free party revival. Reviewed mobile and zero-stock screenshots.
