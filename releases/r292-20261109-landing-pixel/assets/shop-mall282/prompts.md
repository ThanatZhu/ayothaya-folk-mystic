# ร้านค้าใหม่ · prompt รูปสำหรับ ChatGPT (9 พ.ย. 2026)

กรอบหน้าต่างใช้กรอบมาตรฐานเมนู 236 (`assets/ui-unified236/frame.png` + พื้นหินหยก `matte-jade.png`) ตามกฎ docs/unified-menu236.md ไม่เจนกรอบใหม่ · ปุ่มหยก/ทองใช้ของเดิม
ไอคอนสินค้าที่ขายอยู่แล้ว (ยา ปีก ธูป เหล็กไหล ยันต์ ฯลฯ) ใช้ของเดิมในเกม

ต้องเจนใหม่ 3 รูป ส่งทีละรูป แล้วส่งไฟล์ PNG กลับมา ตั้งชื่อตามหัวข้อ

ทุก prompt ขึ้นต้นด้วยกฎกลางชุดเดียวกับรูปร้านค้าเดิม (คัดลอกทั้งก้อนได้เลย)

---

## 1. `shop-category-icons.png` · ไอคอนหมวดสินค้า 12 อัน (ตารางเดียว)

ลำดับ ซ้าย→ขวา บน→ล่าง: แนะนำ · แพ็กคุ้มค่า · อาหารบัฟ · ของใช้เดินทาง · ตีบวก · ตัวละคร · รายการโปรด · ยันต์ EXP/ดรอป · กรอบชื่อ · ออร่า · ชุดแฟชั่น · พาหนะ

```
Production game UI art for Ayothaya Thai fantasy MMORPG. Hand-painted 2D style, deep emerald lacquer and warm aged gold, restrained Thai lotus and leaf ornament, crisp readable silhouette, coherent with a classic painted MMORPG HUD. No words, numbers, letters, logos or watermarks. Not a photograph or plastic 3D render.
ONE icon sheet, 1536 x 1024, fully transparent background, a strict grid of 4 columns x 3 rows, 12 equal cells of 384 x 341 px. Each cell holds ONE small round shop-category emblem, centered, about 70 percent of the cell, with clear transparent padding so nothing touches the cell edges. Every emblem shares the same base: a dark emerald lacquer disc with a thin aged-gold rim; only the object on the disc changes. Objects, left to right, top to bottom:
1 a golden lotus star (featured), 2 a small red-and-gold lacquer treasure box with a silk bow (value bundles), 3 Thai snacks wrapped in banana leaf on a small tray (buff food), 4 a leather travel satchel with a green feather wing tucked in (travel items), 5 a smith hammer crossed over a small anvil with a spark (refining), 6 a blank rolled name scroll with a quill pen (character services), 7 a gold heart shaped like a lotus bud (favorites), 8 a glowing yantra paper charm with abstract geometric lines and no letters (EXP and drop charms), 9 an ornate empty gold name plaque (name frames), 10 a swirling ribbon of golden-green spirit light (auras), 11 a folded emerald silk garment with gold trim on a small wooden hanger (fashion), 12 an ornate saddle cloth and small howdah seat (mounts).
Readable at 24 px. No people, no faces, no Buddha images, no text.
```

## 2. `shop-bundle-icons.png` · ไอคอนแพ็กคุ้มค่า 6 แบบ

ลำดับ: แพ็กมือใหม่ · แพ็กนักผจญภัย · แพ็กตีบวก · แพ็กอาหารบัฟ · แพ็กของใช้ · แพ็กพรีเมียม

```
Production game UI art for Ayothaya Thai fantasy MMORPG. Hand-painted 2D style, deep emerald lacquer and warm aged gold, restrained Thai lotus and leaf ornament, crisp readable silhouette, coherent with a classic painted MMORPG HUD. No words, numbers, letters, logos or watermarks. Not a photograph or plastic 3D render.
ONE item icon sheet, 1536 x 1024, fully transparent background, a strict grid of 3 columns x 2 rows, 6 equal cells of 512 x 512 px. Each cell holds ONE bundle item in a three-quarter view, centered, about 75 percent of the cell, soft drop shadow, transparent padding on every side. Value grows left to right, top to bottom:
1 a small woven bamboo basket with a red herbal potion and a bread roll (starter pack), 2 a worn leather satchel overflowing with red potion bottles, a gold holy-water flask and a green feather wing (adventurer pack), 3 a dark ironwood chest, lid open, glowing silver-blue meteoric ore and a violet paper charm inside (refining pack), 4 a round rattan tray of Thai snacks wrapped in banana leaf, sticky rice in bamboo and sweet dumplings (buff food pack), 5 a sturdy wooden crate tied with rope, potion bottles and incense sticks peeking out (supply crate), 6 a tall red-and-gold Thai lacquer box with a lotus lid ornament and golden glow (premium pack).
No people, no faces, no Buddha images, no text.
```

## 3. `shop-fitting-room.png` · ฉากหลังห้องลองชุด (แนวตั้ง)

ตัวละครผู้เล่นจะถูกวาดทับตรงกลางด้วยโค้ด ฉากต้องว่างตรงกลาง

```
Production game UI art for Ayothaya Thai fantasy MMORPG. Hand-painted 2D style, deep emerald lacquer and warm aged gold, restrained Thai lotus and leaf ornament, crisp readable silhouette, coherent with a classic painted MMORPG HUD. No words, numbers, letters, logos or watermarks. Not a photograph or plastic 3D render.
ONE portrait background, 1024 x 1536, edge-to-edge opaque. Inside an old Thai teak pavilion dressing room: a low round emerald-and-gold display pedestal in the lower middle (its top surface at about 72 percent of the height), soft warm light falling on it from above, tall carved teak columns on both sides, gathered emerald silk curtains with gold tassels framing the top corners, a tall arched lattice window glowing softly behind, folded fabrics on low shelves fading into shadow. The center column of the image, from 30 to 70 percent width and 25 to 72 percent height, stays calm and uncluttered for a character standing on the pedestal. Gentle vignette, darker toward the edges.
No people, no mannequins, no deities, no Buddha images, no text, no UI.
```

---

ไม่ต้องเจน: ช่องสินค้า (ทำด้วยโค้ดบนพื้นหยก เพราะกฎ 236 ห้ามเพิ่มกรอบตกแต่งซ้อน) · ริบบิ้น "ใหม่ / ขายดี / จำกัด" (ทำด้วยโค้ด ตัวหนังสือ Mali) · หมวดที่ขึ้น "เร็วๆ นี้" ยังไม่ต้องเจนรูปสินค้า จนกว่าจะเริ่มทำระบบนั้น
