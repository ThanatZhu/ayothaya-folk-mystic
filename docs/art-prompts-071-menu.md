# ไอคอนแถบเมนูด้านบน ชุด 0.71 · 18 ปุ่ม (ui-menu71)

ใช้แชตใหม่ใน ChatGPT แนบภาพอ้างอิงสองไฟล์:
- `assets/ui63/ui-menu63.png` (ไอคอนชุดปัจจุบัน ให้สไตล์ต่อเนื่องกัน)
- ภาพหน้าจอเกมปัจจุบันที่เห็นแถบเมนูด้านบน

บันทึกผลเป็น `ui-menu71.png` วางไว้ที่ `outputs/ui-menu71.png` แล้วส่งข้อความกลับมาว่า "ถึง Claude: ได้ภาพ ui-menu71 แล้ว"
Claude จะตัดแสงฟุ้ง จัดกริด ใส่ปุ่มทั้ง 18 ปุ่มบนแถบด้านบน (มือถือเลื่อนซ้าย-ขวาได้) แล้วขึ้นเว็บให้

ถ้าภาพมีตัวหนังสือ เส้นกริด หรือพื้นหลังไม่โปร่งใส ให้สั่งซ้ำ: "redo: transparent background, no grid lines, no text"

| ช่อง | ปุ่ม | ฟีเจอร์ในเกม |
|---|---|---|
| 1 | ตัวละคร | โปรไฟล์ บัญชี เปลี่ยนตัวละคร |
| 2 | กระเป๋า | กระเป๋า (B) |
| 3 | สกิล | หน้าต่างสกิล |
| 4 | สถานะ | ค่าสถานะ อุปกรณ์ |
| 5 | ภารกิจ | เควสต์ ค่าหัว |
| 6 | ตลาดกลาง | ตลาดกลาง ร้านค้าง ค้นหาของ |
| 7 | สังคม | เพื่อน กิลด์ |
| 8 | ปาร์ตี้ | ผู้เล่นออนไลน์ ปาร์ตี้ |
| 9 | สัตว์เลี้ยง | สัตว์เลี้ยง |
| 10 | แผนที่ | แผนที่ วาร์ป (M) |
| 11 | ของรางวัลรายวัน | ล็อกอินรายวัน |
| 12 | สมุดการ์ด | อัลบั้มการ์ด |
| 13 | ตีบวก | ตีบวกอุปกรณ์ |
| 14 | ตู้เสื้อผ้า | แต่งตัว |
| 15 | อีโมต | ท่าทาง |
| 16 | แชต | แชต |
| 17 | กิจกรรม | เทศกาล ฝูงคลั่ง MVP |
| 18 | ตั้งค่า | ตั้งค่า |

---

## Prompt (คัดลอกทั้งกล่อง)
```
Create ONE PNG image: a game UI menu icon sprite sheet that matches the attached icon sheet exactly in style
(painted pixel-art icons, warm dark-brown outline, soft top-left light, Thai folk-fantasy, Ayutthaya era,
palette of gold, lacquer red, jade green, cream and teal). These are top-bar menu buttons of a cozy 2.5D MMORPG,
so every icon must read clearly at 36 px: one bold simple silhouette, high contrast, no tiny details.
No circular frame, button plate or background behind the icon; the game draws its own button.

Canvas: exactly 1536 x 1024 px with a fully transparent background (real alpha; no white, no checkerboard,
no glow halo outside the icon, no ground shadow). Grid: 6 columns x 4 rows of 256 x 256 px cells, no gaps,
no borders, do not draw grid lines. Each used cell holds ONE icon, centered, about 170 px on its longest side,
at least 40 px of empty space to every cell edge. No text, letters, numbers or exclamation marks anywhere.
Order left to right, top to bottom; cell 1 is top-left. Cells 19 to 24 stay completely empty and transparent.

1. Character: head-and-shoulders bust of a young Thai traveler with a topknot and red scarf
2. Bag: a woven Thai cloth shoulder bag (yaam) in red and cream stripes
3. Skills: a golden yant sigil (sacred geometric pattern) with small sparks, purely geometric
4. Status: a golden four-point star above a small balance scale
5. Quests: a rolled palm-leaf manuscript tied with red string and a red wax seal
6. Central market: a small Thai market stall with a red-and-cream striped awning and a gold coin in front
7. Social: two hands holding a jasmine flower garland
8. Party: three small traveler silhouettes standing together, jade green
9. Pet: a tiny friendly golden lion cub (singha) sitting
10. Map: a folded old parchment map with a small red route line
11. Daily reward: a red lacquer gift box tied with a gold ribbon
12. Card album: a small stack of three painted cards fanned out, gold edges
13. Refine: a small anvil with a glowing golden hammer and two sparks
14. Wardrobe: a Thai traditional shirt on a wooden hanger
15. Emote: a cream speech bubble containing a small heart
16. Chat: a cream speech bubble with a small lotus at its tail
17. Events: a floating krathong (lotus float) with a lit candle
18. Settings: a carved teak-wood cog with a gold rim
```
