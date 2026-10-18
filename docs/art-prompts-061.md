# ชุด prompt ภาพที่ยังขาด (0.61)

รูปอ้างอิงทั้งหมดอยู่ใน `outputs\art-prompts-061\references\` · ใช้แชตใหม่ 1 แชตต่อ 1 prompt สั่งพร้อมกันได้
เจนเสร็จบันทึกที่ `outputs\art-061-handoff\` ตามชื่อไฟล์ที่ระบุ แล้วส่งข้อความ "ถึง Claude:" กลับมา
Claude จะจัดกริด ตรวจ แล้วเปลี่ยนจากภาพชั่วคราวเป็นภาพจริงให้

ลำดับแนะนำ: 1 (ไอคอนอาวุธใหม่) → 2 (มอนบึง) → 3 (การ์ดใหม่) → 4 (ท่าเดินขึ้น/ลง 7 อาชีพ) → 5 (ภาพหน้าโหลดบึง) → 6 (เดินถืออาวุธแต่งตัว)

---

## 1) gear57 — อาวุธขั้น 3–4 และเกราะใหม่ (16 ช่อง) · แนบ `style-items.png` และ `gear43.png`
บันทึกเป็น `gear57.png`
```
Create ONE PNG image: a game equipment icon sprite sheet in exactly the art style of the attached reference sheets
(painted pixel-art icons, warm dark outline, soft top-left light, Thai folk-fantasy, Ayutthaya era).
These are higher-tier upgrades of the weapons in the attached gear sheet: same weapon type, clearly more ornate.
Tier 3 items are gold-trimmed and finely engraved; tier 4 items are legendary: glowing, with gems and a faint aura.

Canvas: exactly 1536 x 1024 px with a fully transparent background (real alpha; no white, no checkerboard, no glow halo
outside the item). Grid: 6 columns x 4 rows of 256 x 256 px cells, no gaps, no borders, do not draw grid lines.
Each used cell holds ONE item, centered, about 190 px on its longest side, at least 24 px of empty space to every cell edge.
Long weapons go diagonally from bottom-left to top-right. No text, letters or numbers anywhere.
Order left to right, top to bottom; cell 1 is top-left. Cells 17 to 24 stay completely empty and transparent.

1. tier 3 Thai sword "Royal Command": gold-inlaid blade, red-lacquer grip
2. tier 3 spear "Thousand-Weight Gold": heavy gold spearhead with red tassels
3. tier 3 bow "Victory Craft": lacquered recurve bow with gold tips
4. tier 3 boxing wraps "Lek Lai": dark wraps with silver liquid-metal studs
5. tier 3 twin daggers "Stingray Tail": curved blades with ray-skin grips
6. tier 3 staff "Eight Directions": staff topped with an eight-point yant star
7. tier 3 prayer beads "Mani Crystal": clear crystal beads with a gold tassel
8. tier 4 sword "Divine Vision": glowing white-gold blade with a sapphire guard
9. tier 4 spear "Naga King": spear whose head is a coiled serpent, emerald glow
10. tier 4 bow "Rama's Bow": great golden bow with a sun motif and blue glow
11. tier 4 boxing wraps "Elephant Lord": ivory-and-gold wraps with an elephant crest
12. tier 4 twin daggers "Moon Shadow": dark blades with crescent-moon silver glow
13. tier 4 staff "Naga Staff": staff wrapped by a naga with glowing eyes
14. tier 4 prayer beads "Relic": gold beads around a small glowing relic casket
15. a chain-mail armour vest woven with gold links (tier 3 armour)
16. naga-scale armour: green-gold scale vest with a serpent collar, faint glow (legendary)

When the image is finished, write a short handoff message in Thai that starts with "ถึง Claude:".
Include the sheet name (gear57) and a cell-by-cell check (off-center, crossing a border, halo/white edge,
size mismatch, wrong subject, text), and confirm cells 17-24 are empty.
```

## 2) marsh60 — มอนบึงบัว 5 ตัว ท่าละ 8 เฟรม · แนบ `field-monsters.png` `orchard-monsters.png` `elite-monsters.png`
บันทึกเป็น `marsh60.png`
```
Create ONE PNG image: a monster animation sprite sheet that matches the attached reference sheets exactly in style,
camera angle (3/4 top-down, facing right), outline and lighting (painted pixel art, Thai folk-fantasy).
These are swamp versions of existing monsters from a haunted lotus marsh at dusk: wetter, mossier, darker, with lotus,
reeds and murky water details, clearly different from the originals but in the same family.

Canvas: exactly 2048 x 1280 px with a fully transparent background (real alpha; no white, no checkerboard, no glow halo).
Grid: 8 columns x 5 rows of 256 x 256 px cells, no gaps, no borders, do not draw grid lines.
Each row is ONE monster, the same character in all 8 cells, feet on the bottom of the cell with about 12 px margin,
never crossing into a neighbouring cell. No text.
Frames, left to right: 1 idle, 2 walk step A, 3 walk step B (legs clearly alternate), 4 wind-up (clearly telegraphing
an attack), 5 strike, 6 hit recoil (leaning back), 7 recovering, 8 defeated (collapsed on the ground).

Row 1: "Giant Marsh Rat" - a bloated grey-green swamp rat with moss on its back and a lotus leaf stuck to its tail (about 150 px tall).
Row 2: "Bog Hopper" - a dark green armoured grasshopper with wet, muddy plates and reed-like antennae (about 170 px tall).
Row 3: "Lotus Vine" - a living tangle of lotus stems and thorny vines with a closed pink lotus bud as its head (about 200 px tall).
Row 4: "Bog Lantern" - a floating lantern of rotten paper with a sickly green-blue ghost flame, dripping water (about 200 px tall);
       frame 4 glows brighter, frame 5 bursts with a ring of ghostly light around it.
Row 5: "Marsh Ape King" - a huge muddy ape king with a crown of lotus pods and reeds, glowing eyes (about 235 px tall).

When the image is finished, write a short handoff message in Thai that starts with "ถึง Claude:".
Include the sheet name (marsh60) and list any frame that changes size, drifts, has feet off the baseline, crosses a cell,
or where the walk legs do not alternate.
```

## 3) cards45 ช่อง 12–16 — การ์ดมอนบึง 5 ใบ · แนบ `cards45.png` (ถ้าทำข้อ 2 แล้ว แนบ marsh60.png ด้วย)
บันทึกเป็น `cards45.png`
```
In the attached card sheet (6 columns x 4 rows of 256 x 256 cells, cell 1 = top-left), draw NEW cards ONLY in cells 12 to 16.
Keep cells 1-11 pixel-identical and cells 17-24 empty and transparent. Same card design as cells 1-11: an aged palm-leaf
card about 170 x 230 px with a thin gold Thai border, the monster painted inside, transparent background, no text.

12. a bloated grey-green swamp rat with moss on its back and a lotus leaf on its tail
13. a dark green armoured grasshopper with wet, muddy plates
14. a living tangle of lotus stems and thorny vines with a closed pink lotus bud head
15. a floating rotten-paper lantern with a sickly green-blue ghost flame
16. a huge muddy ape king with a crown of lotus pods (elite: thicker gold border)

When finished, write a short Thai handoff starting with "ถึง Claude:" (sheet cards45, cells 12-16) with a per-cell check.
```

## 4) ท่าเดินขึ้น/ลง 7 อาชีพ — 28 ไฟล์ (สั่งทีละไฟล์)
แนบ `<อาชีพ>-walk-<เพศ>.png` ของอาชีพนั้น · ทำ 2 ไฟล์ต่ออาชีพต่อเพศ: `front` (เดินลง หันหน้าเข้ากล้อง) และ `back` (เดินขึ้น หันหลัง)
ชื่อไฟล์: `<อาชีพ>-walk-front-<เพศ>.png` / `<อาชีพ>-walk-back-<เพศ>.png` เช่น `swordsman-walk-front-male.png`
แนะนำเริ่มจากอาชีพที่เล่นบ่อยก่อน · เปลี่ยน 3 คำในวงเล็บเหลี่ยมให้ตรงไฟล์

```
Using the attached side-view walk strip of the [MALE / FEMALE] [CLASS] as the exact design reference (face, hair, outfit,
weapon, colours, proportions, painted pixel-art style), draw the same character [walking TOWARD the viewer (front view,
the face clearly seen) / walking AWAY from the viewer (back view: back of the head, no face)].

Output: ONE PNG, exactly 2048 x 320 px, fully transparent background (real alpha, no white, no checkerboard).
8 frames side by side, each frame centred in its own 256 x 320 slot. Every frame: the same body size (about 280 px tall),
head at the same height (2-4 px bob only), feet on ONE ground line 12 px above the bottom edge, nothing crossing into the
next slot. No text, no ground shadow. The torso stays upright and does not rotate.
An 8-frame walk cycle: frame 1 the character's RIGHT foot steps forward, frame 5 the LEFT foot steps forward; frames 3 and 7
the back leg passes the standing leg with the foot lifted; arms swing opposite to the legs; the loop 8 -> 1 is seamless.
Weapon: [see the table below], held the same way in every frame and never cut off.

When finished, write a short Thai handoff starting with "ถึง Claude:" naming the file and listing any frame where the size
changes, the body drifts, a foot leaves the ground line, something crosses a slot, or the legs do not alternate.
```

| อาชีพ (CLASS) | อาวุธ (ใส่แทนข้อความ Weapon) |
|---|---|
| swordsman | sword in one hand pointing down, round shield on the other arm |
| lancer | spear held upright beside the body; the whole spear including the tip stays inside the 256 px slot |
| hunter | bow held low in one hand, quiver on the back (visible in the back view) |
| boxer | fists loosely raised at chest height, hand wraps visible |
| rogue | one short dagger in each hand held low |
| shaman | staff held upright in one hand, touching the ground on frames 1 and 5 |
| acolyte | prayer beads in one hand; robe hem sways but both feet stay visible under it |

## 5) ภาพหน้าโหลด "บึงบัวต้องมนตร์" · แนบ `loading-old-orchard.png`
บันทึกเป็น `lotus-marsh-loading.png`
```
Create ONE illustration in exactly the painting style, framing and mood of the attached loading-screen art
(painted Thai folk-fantasy, Ayutthaya era, soft painterly light). Size exactly 1672 x 941 px, no text, no logo, no UI.
Scene: a haunted lotus marsh at dusk behind an old rice mill. Pink and white lotus fields on still dark water, a long
wooden plank bridge, tall reeds, an old sala on stilts, and a few floating paper lanterns with faint green-blue ghost
flames hovering over the water. Warm orange sky fading to violet, mist low on the water.
When finished, write a short Thai handoff starting with "ถึง Claude:" naming the file lotus-marsh-loading.png.
```

## 6) (ไม่บังคับ) เดินถืออาวุธแต่งตัว 7 อาชีพ — 14 ไฟล์ · แนบ `<อาชีพ>-walk-<เพศ>.png`
ตอนนี้ถ้าสวมอาวุธแต่งตัว อาชีพเหล่านี้ยังเดินท่าเก่า · ชื่อไฟล์ `<อาชีพ>-walk-crafted-<เพศ>.png`
```
Edit the attached 8-frame walk strip: replace ONLY the weapon in every frame with [CRAFTED WEAPON], held in the same hand,
at the same angle and position as the current weapon. Keep the character, pose, size, outline, colours, frame layout,
transparent background and canvas size (2048 x 320) exactly the same. No text.
When finished, write a short Thai handoff starting with "ถึง Claude:" naming the file and listing any frame where the
new weapon floats, changes size, or crosses the slot.
```

| อาชีพ | CRAFTED WEAPON |
|---|---|
| swordsman | a jade-bladed Thai sword with a matching jade-rimmed round shield |
| lancer | a golden trident with a red tassel |
| hunter | an ivory-and-jade bow |
| boxer | red boxing wraps painted with yant symbols (no readable letters) |
| rogue | twin daggers with indigo moon-crescent blades |
| shaman | a staff topped with a glowing crescent moon and spirit wisps |
| acolyte | prayer beads of jade with a gold lotus tassel |

## 7) ท่ายืนหายใจ + ท่าโจมตี สไตล์ใหม่ — 2 ไฟล์ต่ออาชีพต่อเพศ · แนบ `<อาชีพ>-walk-<เพศ>.png`
ให้ท่ายืนและท่าตีเป็นสไตล์เดียวกับท่าเดินใหม่ (ตอนนี้ท่าตีและท่ายืนของอาชีพที่ยังไม่มีภาพหันหน้า ยังเป็นภาพเก่า)
ชื่อไฟล์ `<อาชีพ>-idle-<เพศ>.png` และ `<อาชีพ>-attack-<เพศ>.png` (อาชีพ: novice, swordsman, lancer, hunter, boxer, rogue, shaman, acolyte)
```
Using the attached walk strip of the [MALE / FEMALE] [CLASS] as the exact design reference (face, hair, outfit, weapon,
colours, proportions, painted pixel-art style), draw [IDLE: a 4-frame standing breathing loop facing the viewer at a
slight 3/4 angle, feet together on the ground, gentle chest rise, weapon at rest / ATTACK: a 4-frame basic attack facing
RIGHT: 1 ready, 2 wind-up, 3 strike (weapon fully extended, motion smear allowed inside the slot), 4 recover].

Output: ONE PNG, exactly 1024 x 320 px, fully transparent background (real alpha). 4 frames side by side, each centred in
its own 256 x 320 slot; same body size as the reference (about 280 px tall), feet on ONE ground line 12 px above the
bottom edge, nothing crossing into the next slot. No text, no ground shadow.
When finished, write a short Thai handoff starting with "ถึง Claude:" naming the file and listing any frame where the
size changes, the body drifts or something crosses the slot.
```
