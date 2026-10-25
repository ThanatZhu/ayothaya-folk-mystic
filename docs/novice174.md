# Novice introduction — Job 1–10

The Novice uses three fundamentals rather than the professional 10 + 5 slot tree:

| Saved slot | Skill | Starting rank | Maximum | Purpose |
| --- | --- | --- | --- | --- |
| 0 | หมัดฝึกฝน | 1 | 4 | One-target training punch, 22 base damage, 5 MP, 3 s cooldown |
| 4 | พักหายใจ | 1 | 4 | Restore 32 base HP to self, 8 MP, 12 s cooldown |
| 5 | ตั้งรับ | 0 | 4 | Learn free after Rest rank 2; guard for 4 base seconds, 8 MP, 10 s cooldown |

Learning rank 1 remains free. Each rank above 1 costs one point. Three skills × three upgrades = the nine points earned from Job 1 to Job 10. Professional skill caps and Master branches are unchanged. The shared 15-number save shape is retained so class changes, AUTO, network snapshots and equipment shortcuts remain compatible. Reserved slots cannot be upgraded or cast, even with forged saved ranks. Normalizing a previous save clears retired Novice slots and clamps remaining Novice ranks to four: their spent points automatically return to the shared pool. Other profession allocations are preserved.

The skill window has a compact three-card training layout with per-class maximum labels, no empty branches and no Master tab. Current Novice shortcuts are packed into the first three skill positions (their relative saved order is preserved). AUTO skips reserved/passive entries; desktop shortcuts already validate those entries through the shared actionbar model.

## First attack presentation

`novice-combat174.js` samples existing whole-character painted poses for male and female characters: guard → wind-up → contact → pull back → guard → idle. Ordinary contact uses frame 6 at the authoritative 42% beat; the training skill uses its heavier frame 9 at that skill's release beat. Both avatars and local/remote renderers use the shared pose functions and advertised cast duration, including higher attack speeds. The intact quad receives a small facing-aware cosmetic weight transfer; combat coordinates, reach, damage and collision do not move. Reduced motion keeps the neutral pose. Fist trails lead into a small contact flash rather than a magic circle, and air swings have no Novice impact flash.

Browser import versions are refreshed to keep old cached profession definitions from restoring the retired skill list. The public beginner guide describes the same three-skill progression.

Validation: dedicated tests cover the 9-point budget, caps, old-save refunds, blocked retired skills at authority and combat layers, release frames and delayed damage. Existing professional/Master progression and motion tests remain in the complete suite. Browser checks use disposable local accounts and never alter production character data.

Final validation: all 675 tests pass; production static build succeeds; the real skill window was checked at 1440×900, 844×390 and 667×375 with three visible skills, no Master tab, contained dialog bounds, rank 4 labels, and successful server-owned Rest/Guard upgrades. Both genders sample frames 5/6/8 for wind-up/contact/recovery. Public `/health` exposes `noviceTraining` to verify the authority deployment separately from the frontend.
