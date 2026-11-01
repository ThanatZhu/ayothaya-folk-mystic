# Explicit skill damage formula (244)

Owner approved an ATK/MATK percentage plus optional flat-damage model, inspired by
ROX, on 2 November 2026. This is our game's formula, not a claim to reproduce ROX.

`skillDamageBase = finalAttack * attackPercent / 100 + flatDamage`.

Final attack comes from `deriveStats`: equipped items, refinement/Tier, allocated
stats and the existing applicable bonuses. Physical classes use ATK (STR-based,
DEX-based for Hunter); Shaman and Acolyte use MATK (INT-based). Never add allocated
stats or weapon attack again after deriving this value.

Existing power n maps to attackPercent = n * 2.5 and flatDamage = n. Thus power 90
becomes 225% ATK + 90, preserving the old balance curve. This migration changes
the formula's representation and explanations, not its intended damage output.
The nonzero flat component keeps an unequipped Novice able to attack.

CombatWorld.power uses the shared formula directly, then existing affinity,
defense/penetration and rooted-target modifiers. Existing situational/passive
modifiers stay in their existing execution paths. Skill criticals still roll
once per damaging impact. Multi-hit casts divide power before resolving each
hit; stored poison and reflection are not passed through attack scaling twice.
Healing, shields, cooldowns, points, skill unlocks, drops and PvP balance rules
are unchanged. No new STR/DEX/INT passive multipliers are added in this release.

`skillPower` remains in derived stats for old clients and the equivalent status
metric only. It is not multiplied into the new damage calculation.

Skill details show the formula and approximate base value before situational
bonuses, defense and criticals. Multi-hit values are totals before per-hit
rounding. Fields, poison and summons identify their per-tick/per-hit values.
Class/branch-specific extra hits, conditions and summon passive modifiers still
apply after this base estimate. Formula data is shared with the authority.

Validation: tests/skill-damage244.test.mjs plus combat, character stats, live role
skills, criticals, poison, prologue and PvP regression suites. This document does
not declare publication; retain old releases and freeze a new runtime before
shipping frontend changes.
