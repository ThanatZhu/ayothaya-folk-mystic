# ไอคอน UI ชุดใหม่ (0.63) · ปุ่มเมนูด้านบน + สัญลักษณ์บนแผนที่

ใช้แชตใหม่ใน ChatGPT แล้วแนบภาพอ้างอิงสองไฟล์นี้จาก repo:
- `assets/items42/items.png` (ชีตไอคอนเดิม เพื่อคุมสไตล์ลายเส้นและแสง)
- ภาพหน้าจอเกมที่เห็นแถบเมนูด้านบน (`outputs/game-screens-062/v2-ayutthaya-spawn.png` ในโฟลเดอร์ outputs ข้าง repo)

บันทึกผลเป็น `ui-menu63.png` แล้วส่งกลับมาพร้อมข้อความ "ถึง Claude: ได้ภาพ ui-menu63 แล้ว"
Claude จะตรวจ จัดกริดด้วย `scripts/normalize-icon-atlas.py` แล้วเปลี่ยนปุ่มเมนูและสัญลักษณ์บนแผนที่ให้

ถ้าภาพที่ได้มีตัวหนังสือ เส้นกริด หรือพื้นหลังไม่โปร่งใส ให้สั่งซ้ำ: "redo: transparent background, no grid lines, no text"

---

## ui-menu63 — 20 ไอคอน · ตาราง 6×4 · 256 px ต่อช่อง
```
Create ONE PNG image: a game UI icon sprite sheet in exactly the art style of the attached item icon sheet
(painted pixel-art icons, warm dark-brown outline, soft top-left light, Thai folk-fantasy, Ayutthaya era).
These are menu and map icons for a cozy 2.5D MMORPG HUD, so every icon must read clearly at 40 px:
one bold simple silhouette, high contrast, limited palette of gold, lacquer red, jade green, cream and teal.
No circular frame or button behind the icon; the game draws its own frame.

Canvas: exactly 1536 x 1024 px with a fully transparent background (real alpha; no white, no checkerboard,
no glow halo outside the icon). Grid: 6 columns x 4 rows of 256 x 256 px cells, no gaps, no borders,
do not draw grid lines. Each used cell holds ONE icon, centered, about 180 px on its longest side,
at least 32 px of empty space to every cell edge. No text, letters, numbers or exclamation marks anywhere.
Order left to right, top to bottom; cell 1 is top-left. Cells 21 to 24 stay completely empty and transparent.

Menu buttons:
1. Character: head-and-shoulders bust of a young Thai traveler with a topknot and red scarf
2. Skills: a glowing golden yant sigil (sacred geometric tattoo pattern) with small sparks
3. Status: a golden four-point star over a small balance scale
4. Bag: a woven Thai cloth shoulder bag (yaam) in red and cream stripes
5. Social: two hands holding a jasmine flower garland (phuang malai)
6. Pet: a tiny friendly golden lion cub (singha) sitting
7. Quests: a rolled palm-leaf manuscript (bai lan) tied with red string and a wax seal
8. Players: three small traveler silhouettes standing together, jade green
9. Chat: a cream speech bubble with a small lotus at its tail
10. Map: a folded old parchment map with a tiny red route line
11. World / warp: a golden Thai compass rose with eight points
12. Settings: a carved teak-wood cog with a gold rim

Map markers (must stay readable at 24 px):
13. Portal / travel gate: a glowing golden temple arch gateway
14. Talk to NPC: a cream speech bubble with three dots
15. Quest giver: a golden lotus bud with a soft glow
16. Shop: a coin pouch with old Thai bullet coins (pod duang)
17. You are here: a teal arrowhead pointing up, white outline, soft glow
18. Teachers' court: a crossed Thai sword and monk staff emblem
19. Boss / MVP: a red yaksha demon mask with gold horns
20. Party member: a small blue flame marker
```
