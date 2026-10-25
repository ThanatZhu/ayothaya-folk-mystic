# Equipment refinement +20

All six combat equipment slots can refine to +20. Existing IDs, cards and random
affixes are retained: for example `sword-iron+20~card-monkey!s2`. IDs above +20,
zero/leading-zero refinement suffixes and refinement on non-equipment are rejected.
Saved +1 through +10 items need no migration and receive the new milestone bonus
when their stats are recalculated.

| Refine level | Refine Tier | Item stat bonus |
|---|---|---|
| 0–4 | None | 0% |
| 5–9 | Tier 1 | 5% |
| 10–14 | Tier 2 | 10% |
| 15–19 | Tier 3 | 15% |
| 20 | Tier 4 | 20% |

Only the highest reached percentage applies. These are refinement Tiers, separate
from equipment rarity and its existing common/fine/elite crafting tiers.

The shared `refine-tiers.js` rules first apply existing per-level improvements:
ATK/MATK gains of `max(2, round(base × .08))` per level, and +1 DEF per level on
non-weapon equipment. The item's current Tier then multiplies its ATK, MATK, DEF,
MDEF and its own STR/AGI/VIT/INT/DEX/LUK bonuses, including its random affix. Item
contributions retain two decimals, so a small +1 stat still gets its +5% increase.
Final derived character ATK/MATK round once for combat as before. Cards, pets,
food, allocated stats and rebirth bonuses are added independently, never multiplied
by an equipment Tier. +20 means 20%, not 50% from adding all milestones together.

Success chances through +10 are retained; +11 through +20 continue the 10% base
chance of +10. Existing ore rules, `next level × 100` Bia cost, +20 percentage
points from Lek Lai and break protection apply unchanged. +20 is checked before
any resource is spent. No new currency or material is introduced.

The forge displays all four milestones, the selected item's current Tier, the
next milestone unlock, and actual item stats before/after the upgrade. Tier data
remains on the previous level until the hammer sequence reveals the server's
result. Badges also appear below worn items in the bag, in item details and in
the status equipment list. Mobile layout keeps the actor and Tier milestones
visible; no new generated art is required for the existing forge artwork.

`tests/refine-tiers167.test.mjs` covers milestone boundaries, item-only formulas,
fractional bonuses, cards/affixes, +11–20 bag round trips, failed/guarded results,
the real server's +19→20 upgrade and cap enforcement. Existing refining tests
now validate all 20 supported levels for every equipment definition.
