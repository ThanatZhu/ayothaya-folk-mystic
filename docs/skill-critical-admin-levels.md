# Skill criticals and administrative level increases

Damaging skill impacts use the character's existing `derived.crit` probability and
`derived.critMult` multiplier (default 1.5). Physical and magic skills use the same
rule. Each impact/target rolls independently, including multi-hit skills, fields,
summoned skill companions, poison and premium pet attacks. Damage is multiplied
after the skill's existing defence, elemental and combo calculations. This does
not introduce additional hits or change release timing. Healing and shields do
not crit. Reflection transfers the resolved amount without another critical roll.

`skill-critical.js` preserves the cast ID, impact index and damage source while
calling the existing authoritative damage path. Critical hits carry the gold
number colour and `crit: true` in PvE and PvP events; boss damage tables record
the actual HP damage after mitigation and the overkill cap.

The admin Players tab now shows Base and Job levels. On selecting a character,
two controls accept the number of levels to add, defaulting to one. Base caps at
99; Job follows the current stage: Novice 10, class 40, Master 30. Reaching the
cap disables that control. Class changes and rebirth still require their normal
actions.

`POST /admin/levels` accepts an online peer or an offline character ID and
absolute `baseLevel`/`jobLevel` targets. It uses the existing verified admin and
origin checks and records before/after levels in the evidence log. Invalid
levels are rejected; stale or repeated targets cannot lower levels or grant
rewards twice. EXP is set to at least the start of the requested level, so
stat points, skill points and Job unlocks use their normal progression rules.

Online changes pause that character's simulation during the durable checkpoint;
only after a successful write are EXP, derived stats and snapshots updated.
Failed writes close the affected session instead of acknowledging an unsaved
change. Offline changes use the existing lease-checked store transaction.
Milestone gifts are combined into one mail in the same transaction, and the
live experience event does not grant those gifts a second time.
