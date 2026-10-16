# Item icon atlas (items 0.42) — art brief and drop-in rules

The game reads one file: `assets/items42/items.png`. A code-made placeholder ships now.
To re-skin, overwrite that file with the painted atlas — same name, same layout. No code change.

## File rules

- PNG with a transparent background (RGBA), exactly **1536 × 1024 px**.
- A grid of **6 columns × 4 rows**, each cell **256 × 256 px**, no gaps or borders between cells.
- One object per cell, centered, about 190–210 px tall, ~20 px empty margin. No text, labels, numbers or frames.
- Same style as `assets/equipment41/icons.png`: painted pixel-art icons, warm dark outline, soft top-left light,
  Thai folk-fantasy (Ayutthaya), slightly glowing for magic items.

## Cell order (row by row, left → right)

| # | id | Thai name | What to draw |
|---|---|---|---|
| 0 | straw-bundle | ฟางมัดเรืองแสง | a tied bundle of golden straw with faint spirit-green glow |
| 1 | rat-tooth | ฟันหนูยุ้ง | two curved rodent incisors, off-white, small threads of glowing fibre |
| 2 | hopper-wing | ปีกตั๊กแตนเกราะ | one armored grasshopper wing, bronze-green, plated like brass |
| 3 | rat-crown | มงกุฎพญาหนู | small crown woven from straw and grain with a red bead, regal (elite drop) |
| 4 | spirit-thread | เศษสายใยขวัญ | a short tangle of luminous gold-jade thread (story item, magical) |
| 5 | rice-sheaf | รวงข้าวขวัญ | a golden rice ear tied with a red cotton string |
| 6 | betel-nut | หมากที่ถูกฉก | a betel nut with a betel leaf, a little bite mark |
| 7 | tough-vine | เถาวัลย์เหนียว | a coiled thick green vine with small thorns |
| 8 | lantern-paper | กระดาษโคมเรืองแสง | a torn piece of mulberry lantern paper glowing warm orange |
| 9 | monkey-bangle | กำไลวานร | a gold bangle with a monkey-face charm (elite drop) |
| 10 | spirit-rope | เชือกขวัญพันเกลียว | a heavy twisted rope coil with glowing knots (boss drop, most special) |
| 11 | palm-leaf | ใบลานจารึก | an inscribed palm-leaf manuscript strip tied with cord |
| 12 | hp-small | ยาสมุนไพรแดง | small round clay/glass bottle of red herbal medicine, cork + string |
| 13 | hp-large | ยาสมุนไพรแดงขวดใหญ่ | larger red medicine bottle, gold band, same family as #12 |
| 14 | mp-small | น้ำมนต์ใส | small bottle of clear blue holy water, lotus stopper |
| 15 | mp-large | น้ำมนต์ทองคำ | larger holy-water bottle with gold leaf, blue liquid, glow |
| 16 | sticky-rice | ข้าวเหนียวห่อใบตอง | sticky rice wrapped in banana leaf, tied with bamboo strip |
| 17 | return-incense | ธูปกลับเมือง | three lit incense sticks in a small holder, smoke curl (future item) |
| 18 | cowrie | เบี้ย | one cowrie shell (the game currency), cream with brown speckles |
| 19 | cowrie-pile | กองเบี้ย | a small heap of cowrie shells |
| 20 | cloth-bag | ถุงย่าม | a Thai woven shoulder bag (ย่าม), indigo with red stripes (menu icon) |
| 21 | shop-sign | ป้ายร้านค้า | a little wooden market sign with a cloth awning (shop icon) |
| 22 | loot-bundle | ห่อผ้า | a cloth bundle tied at the top, slightly overflowing (loot icon) |
| 23 | treasure-chest | หีบสมบัติ | a small teak chest with gold corners (future item) |

## Prompt to paste into ChatGPT (image generation)

```
Create ONE PNG image, 1536x1024 pixels, transparent background.
It is an item icon sprite sheet for a Thai folk-fantasy MMORPG set in Ayutthaya.
Lay it out as an exact grid: 6 columns x 4 rows, every cell 256x256 pixels, no gaps, no borders, no grid lines.
Put exactly one item in each cell, centered, about 200 px tall, with clear empty margin around it.
Style: painted pixel-art game icons, crisp warm dark outlines, soft light from the top-left, rich but not neon colors,
the same style as classic Ragnarok Online item icons but with Thai culture. No text, no letters, no numbers, no frames.
Cells in order, left to right, top row first:
1 a tied bundle of golden straw with a faint spirit-green glow
2 two curved rodent incisor teeth, off-white, with small glowing fibres
3 one armored grasshopper wing, bronze-green, plated like brass
4 a small crown woven from straw and grain with a red bead
5 a short tangle of luminous gold and jade thread
6 a golden rice ear tied with a red cotton string
7 a betel nut with a betel leaf, with a small bite mark
8 a coiled thick green jungle vine with small thorns
9 a torn piece of mulberry-paper lantern glowing warm orange
10 a gold bangle with a small monkey-face charm
11 a heavy twisted rope coil with glowing knots
12 an inscribed palm-leaf manuscript strip tied with cord
13 a small round bottle of red herbal medicine with cork and string
14 a larger red medicine bottle with a gold band, same family as item 13
15 a small bottle of clear blue holy water with a lotus-shaped stopper
16 a larger holy-water bottle with gold leaf and glowing blue liquid
17 sticky rice wrapped in banana leaf, tied with a bamboo strip
18 three lit incense sticks in a small brass holder with a curl of smoke
19 one cowrie shell, cream with brown speckles
20 a small heap of cowrie shells
21 a Thai woven shoulder bag (yaam), indigo with red stripes
22 a small wooden market stall sign with a cloth awning
23 a cloth bundle tied at the top, slightly overflowing
24 a small teak treasure chest with gold corners
```

If the image comes back with a background, extra spacing or a different size, it will look misaligned in the
game. Check: 1536x1024, transparent, 24 items in a clean 6x4 grid.
