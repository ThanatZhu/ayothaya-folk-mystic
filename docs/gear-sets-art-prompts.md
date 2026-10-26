# Prompt เจนไอคอนอุปกรณ์ใหม่ (ส่ง ChatGPT) · ฉบับแยกตามอาชีพ

ใช้คู่กับ `docs/gear-sets-proposal.md`

**ทุกอาชีพเลือกได้ครบทั้ง 5 สาย** เช่น พระใส่ชุดทะลวงไปตีดาเมจได้ แต่หน้าตาของชุดเป็นแบบของอาชีพนั้น
**พระกับแม่ชีเป็นคนละไอเท็ม** ส่วนเครื่องประดับและพระเครื่องพักไว้ก่อน (เจ้าของจะทำเป็นกาชาเอง)

**ของเซ็ทมี 4 ช่อง:** หมวก เสื้อ ผ้าคลุม รองเท้า

**รูปทั้งหมด 57 รูป**
- ของเซ็ท 48 รูป (8 ชุดอาชีพ × 6 ขั้น)
- เซ็ทบอส 8 รูป
- ของเริ่มต้น 1 รูป

## วิธีใช้

1. แนบรูปขั้น 1 ที่เจนรอบล่าสุด (ถ้าชอบสไตล์) หรือ `assets/gear106/head-garment.png` ให้ ChatGPT ดูสไตล์
2. วาง prompt ต่อกัน **4 ส่วน**:
   1. **STYLE**
   2. **SHEET**
   3. **อาชีพ** (เลือก 1 ใน 8)
   4. **ขั้น** (เลือก 1 ใน 6)
3. เซฟชื่อ `outputs/gear-sets/<อาชีพ>-t<ขั้น>.png` เช่น `swordsman-t1.png` หรือ `nun-t3.png`
4. ถ้าวางผิดช่อง ให้พิมพ์ "redo, keep the exact grid and row order"
5. **แนะนำ:** ทำขั้น 1 ให้ครบ 8 อาชีพก่อน แล้วส่งให้ Claude ดูว่าแต่ละอาชีพดูต่างกันพอไหม ค่อยทำขั้นต่อไป

---

## 1. STYLE (ใส่ทุกครั้ง)

```
Use the attached icon sheet as the exact style reference: painted game item icons, warm Thai folk-fantasy
(Ayutthaya / Himmapan) look, clean dark outline, soft drop shadow, readable at 48 px, transparent background.
No text, no letters, no numbers, no grid lines, no frames, no background tiles.
Each icon is centred in its own cell, fills about 75% of the cell, and never touches the cell edge.

MUST look clearly THAI (Ayutthaya period), not European, Japanese, Chinese or generic fantasy:
- Ornament: Thai lai kranok flame scrolls, lai prajam yam four-petal flowers, gold leaf on red or black lacquer
  (lai rod nam), nielloware, mother-of-pearl inlay, Benjarong enamel colours.
- Silhouettes: pointed Thai spires and tiered finials, flared Thai shoulder wings, upturned Thai pointed toes,
  Thai temple-roof curves (chofa hooks).
- Clothing: yantra shirts (suea yan), sabai shoulder sashes, chong kraben, pha khao ma checked cloth,
  mongkhon headrings.
- Footwear: Thai sandals, cloth ankle wraps or pointed-toe Thai slippers. No laced boots.
- AVOID: kimono or hanfu wrap collars, European plate armour, Roman/Viking helmets, western laced boots,
  Buddha images or Buddhist amulets.
```

## 2. SHEET (ใส่ทุกครั้ง)

```
Create ONE PNG, 1024 x 1536 px, fully transparent background, exactly 4 columns x 6 rows of 256 px cells.
All 20 armour pieces belong to ONE character class (described below) so they share that class's silhouette,
but each row is a different set with its own colour family:
Columns, left to right: 1 headwear, 2 upper garment or armour, 3 sash, shawl or short cape, 4 footwear.
Row 1 = PIERCE set: black iron + red, sharp spikes and fang shapes.
Row 2 = EXECUTIONER set: dark purple + silver, sleek blades and shadow shapes.
Row 3 = MANTRA set: jade green + gold, yantra script and lotus shapes.
Row 4 = DIAMOND WALL set: stone grey + brass, thick plates and round studs.
Row 5 = WIND set: leaf green + white, light cloth, feathers and wing shapes.
Row 6: see the class block (weapon in column 1, or leave empty).
Inside one row the 4 pieces must clearly match each other.
```

## 3. อาชีพ (เลือก 1)

### นักดาบ → `swordsman-t?.png`
```
CLASS: Ayutthaya swordsman, front-line soldier with sword and shield.
Headwear: Thai soldier helmets with a pointed spire and side flaps. Upper: chest guard of lamellar or a round
breast disc over a yantra shirt, flared Thai shoulder wings. Sash/cape: wide waist sash with a short tail or
short battle sabai. Footwear: sturdy Thai war sandals with ankle guards.
Row 6, column 1: this tier's sword (Thai daab, drawn diagonally). Columns 2-4 empty.
```

### นักทวน → `lancer-t?.png`
```
CLASS: Royal guard spearman, tall and disciplined.
Headwear: tall pointed Thai guard helmets (lompok-like cone) with a cheek strap. Upper: long armoured tunic
to the hips with high Thai collar and embroidered panels. Sash/cape: long hanging sabai banner-sash down the back.
Footwear: pointed Thai boots-like shin wraps over sandals.
Row 6, column 1: this tier's spear or ngao glaive (drawn diagonally). Columns 2-4 empty.
```

### นายพราน → `hunter-t?.png`
```
CLASS: Thai forest hunter (phran pa), light and practical.
Headwear: woven rattan or bamboo hunter hats, or cloth head wraps with a feather. Upper: sleeveless leather or
bark-cloth vest with a quiver strap across the chest. Sash/cape: pha khao ma cloth over one shoulder or a short
leaf cape. Footwear: soft hide sandals with long leg wraps.
Row 6, column 1: this tier's bow (drawn diagonally). Columns 2-4 empty.
```

### นักมวย → `boxer-t?.png`
```
CLASS: Muay Boran fighter.
Headwear: mongkhon sacred headrings (thick braided ring with a tail), each one different. Upper: open yantra
vest or chest wrap showing the fighter's build, no sleeves. Sash/cape: wide fighter's waist sash with long tails
(pha prajiad colours). Footwear: Muay Boran ankle and foot wraps (no shoes).
Row 6, column 1: this tier's hand wraps or gauntlets (pair, upright). Columns 2-4 empty.
```

### จอมโจร → `rogue-t?.png`
```
CLASS: Night thief / outlaw chief (khun jon), quick and hidden.
Headwear: face-covering head wraps and hoods that leave only the eyes. Upper: tight dark sleeveless top with
hidden knife loops. Sash/cape: long scarf that wraps the neck and flows behind. Footwear: silent soft cloth
foot wraps with split toes.
Row 6, column 1: this tier's twin daggers (crossed pair). Columns 2-4 empty.
```

### หมอผี → `shaman-t?.png`
```
CLASS: Thai sorcerer (mor phi / jom khamang wet), magic user.
Headwear: red or black cloth head wraps covered with yantra script, tall sorcerer caps with a spire.
Upper: long-sleeved suea yan yantra shirts fully covered with yantra grids. Sash/cape: yantra cloth cape with
hanging paper talismans or bead strings. Footwear: simple wooden or cloth sandals with yantra ankle cords.
Row 6, column 1: this tier's sorcerer staff (drawn diagonally). Columns 2-4 empty.
```

### พระ → `monk-t?.png`
```
CLASS: Buddhist monk, calm and modest. Keep it respectful: no armour, no weapons, no Buddha images.
Base colour of every robe is saffron / ochre; the set colour (row colour) appears only as trim, folded border,
gems and glow.
Headwear: a glowing halo ring or a small thudong umbrella-hat (klot) - never a helmet. Upper: folded saffron
robe (chiwon) worn over one shoulder. Sash/cape: folded outer shoulder cloth (sanghati) or a simple shawl.
Footwear: plain Thai sandals.
Row 6, column 1: this tier's prayer beads (round loop). Columns 2-4 empty.
```

### แม่ชี → `nun-t?.png`
```
CLASS: Thai Buddhist nun (mae chi), calm and modest. Keep it respectful: no armour, no Buddha images.
Base colour of every garment is white; the set colour (row colour) appears only as trim, embroidery, gems and glow.
Headwear: a soft glowing halo ring or lotus circlet - never a helmet. Upper: white long-sleeved blouse with a
neat collar. Sash/cape: white sabai worn across the chest and shoulder. Footwear: plain white-strapped Thai sandals.
Row 6: leave empty (nuns share the monk's prayer beads).
```

## 4. ขั้น (เลือก 1)

### ขั้น 1 · Lv.10
```
TIER 1: simple village gear - cotton, palm leaf, buffalo leather and plain iron, small kranok details only.
Motifs: rice fields, field rats, little monkeys, grasshoppers, straw scarecrows.
```

### ขั้น 2 · Lv.25
```
TIER 2: moonlit marsh and old rice mill - a bit more ornament, faint moon glow.
Motifs: reeds and thorns, ghost lanterns, lotus, turtle shell, windmill blades.
```

### ขั้น 3 · Lv.40
```
TIER 3: haunted bamboo forest and ruined temple - red lacquer, bamboo, old stone, small gold details.
Motifs: sharpened bamboo, phi pop shadows, temple bells, yaksha guardian faces, night bats.
```

### ขั้น 4 · Lv.55
```
TIER 4: mythic Himmapan forest - carved ivory, beast motifs, richer ornament and a soft magical glow.
Motifs: elephant tusks, vine tigers, hermit (ruesi) mist mushrooms, crystal-tusk boars, leaf-flame birds.
```

### ขั้น 5 · Lv.70
```
TIER 5: Naga underwater cave - scales, glowing stones, ornate Thai patterns, clear magical glow.
Motifs: serpent fangs, jade scales, naga jewels (mani), glowing crab shells, flowing water.
```

### ขั้น 6 · Lv.85
```
TIER 6: celestial Mount Kailash - the most ornate and radiant tier, Thai deva and garuda style, strong glow.
Motifs: garuda feathers and talons, storm-cloud yaksha, deva crowns, crystal goat horns, great white wings.
```

---

## เซ็ทบอส กรอบรุ้ง: 1 รูปต่อ 1 อาชีพ (1536 x 1024, 3 x 2)

กรอบรุ้งวาดด้วยโค้ด ใช้ STYLE กับหัวนี้:

```
Create ONE PNG, 1536 x 1024 px, fully transparent background, exactly 3 columns x 2 rows of 512 px cells.
One legendary class set, the most ornate items in the game, with a subtle prismatic (rainbow) shimmer on the
metal and gems. Cells: 1 weapon, 2 headwear, 3 upper garment or armour, 4 sash or cape, 5 footwear, 6 empty.
```

- **นักดาบ ขุนศึกอโยธยา** `boss-swordsman.png`: `Royal Ayutthaya war-general set in gold, deep red and black lacquer: long gold-hilted daab with red tassel; tall gold general's helmet with a Thai spire; gold and red lamellar with lion-face shoulders; long red war sash-cape with gold border; gold-greaved war sandals.`
- **นักทวน ทวนพญาครุฑ** `boss-lancer.png`: `Garuda king set in gold and crimson with feathers: gold glaive with garuda-head blade; garuda-beak tall helmet; tunic armour with wing-shaped shoulders; cape of crimson and gold feathers; talon-tipped shin guards.`
- **นายพราน พรานหิมพานต์** `boss-hunter.png`: `Himmapan master hunter set in forest green, gold and antler white: great bow of antler and gold; hunter hat with kinnara feather crest; green leather vest with gold leaf kranok; cloak of leaves and feathers; gold-trimmed hide sandals with leg wraps.`
- **นักมวย ครูมวยหนุมาน** `boss-boxer.png`: `Hanuman muay master set in white, gold and red: gold-and-white gauntlets with monkey-king motifs; white-and-gold mongkhon headring with a Hanuman crest; open gold yantra vest; red waist sash with gold tails; gold-banded foot wraps.`
- **จอมโจร เงาราตรี** `boss-rogue.png`: `Night shadow set in black, violet and silver with moon motifs: twin silver crescent daggers; black face-wrap with silver moon mask; black top with violet trim; smoky violet scarf fading into mist; silent black foot wraps with silver claws.`
- **หมอผี อาคมนวหรคุณ** `boss-shaman.png`: `Grand sorcerer set in teal, gold and fire orange: staff topped with a burning yantra wheel; tall sorcerer cap covered in gold yantra; yantra shirt glowing with gold script; cape with floating paper talismans; gold-embroidered sandals.`
- **พระ พุทธคุณ** `boss-monk.png`: `Radiant monk set, saffron robes with soft gold light, respectful and modest, no Buddha images: radiant gold prayer beads with a lotus; bright golden halo ring; saffron robe with glowing gold border; folded saffron shoulder cloth with light; simple gold sandals.`
- **แม่ชี พุทธคุณ** `boss-nun.png`: `Radiant nun set, white garments with soft gold light, respectful and modest, no Buddha images: (cell 1 empty); glowing lotus circlet halo; white blouse with gold lotus embroidery; white sabai with glowing gold border; white-and-gold sandals.`

---

## ของเริ่มต้น Lv.1–9 + อาวุธผู้ฝึกตน → `starter.png`

```
Create ONE PNG, 1536 x 1024, fully transparent background, exactly 3 columns x 2 rows of 512 px cells.
Plain Thai beginner gear in beige cotton and palm leaf, no set colours:
1 plain white pha khao ma headband; 2 plain cotton Thai shirt; 3 beige pha khao ma shoulder cloth;
4 woven palm-leaf sandals; 5 pair of hemp hand wraps for a novice; 6 empty.
```
