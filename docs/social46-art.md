# Social / market / system icon atlas (0.46–0.50) — art brief and drop-in rules

The game reads `assets/social46/social.png` (placeholder now). Same file rules as `docs/items42-art.md`:
PNG, transparent, 1536 × 1024, 6 × 4 cells of 256 px, no gaps, no text or numbers.
Each cell holds ONE centered icon (~190 px), same painted pixel style and warm lighting as the items42 sheet,
dark outline, readable at 32 px. Cells are numbered left→right, top→bottom from 1.

| # | id | Thai name | What to paint |
|---|---|---|---|
| 1 | storage-chest | คลังเก็บของ | a carved teak chest with a brass lock and lotus corner caps |
| 2 | trade-hands | แลกของ | two hands exchanging: one gives a cowrie shell, the other a cloth bundle |
| 3 | stall-sign | ป้ายแผง | a small wooden vendor signboard hanging under a red-gold cloth awning (blank board) |
| 4 | market-stalls | ตลาด | a little market stall with an oiled-paper umbrella and baskets of goods |
| 5 | whisper | กระซิบ | a speech bubble with a hand cupped beside it (secret message) |
| 6 | friend | เพื่อน | two jasmine garlands linked together |
| 7 | guild-flag | กิลด์ | a Thai triangular temple banner (ธงตะขาบ) on a short pole |
| 8 | guild-seal | ตรากิลด์ | an empty gold-rimmed shield/seal plate, ready for an emblem |
| 9 | st-poison | พิษ | a small green bottle with a dripping skull drop |
| 10 | st-stun | มึนงง | three spinning yellow stars in a ring |
| 11 | st-sleep | หลับ | a crescent moon with soft "z" shapes made of clouds (no letters) |
| 12 | st-silence | ใบ้ | lips sealed with a paper talisman (ยันต์) strip |
| 13 | st-blind | ตาบอด | a closed eye covered by a dark cloth band |
| 14 | st-curse | คำสาป | a small purple straw doll with a pin and purple smoke |
| 15 | daily-gift | ของขวัญรายวัน | a gift wrapped in banana leaf tied with red string and a marigold |
| 16 | death-soul | วิญญาณหลุด | a pale blue spirit wisp rising, faint face |
| 17 | mvp-crown | MVP | a golden Thai chada crown with red gems |
| 18 | boss-timer | เวลาบอส | a burning incense stick in a brass holder with a ring of smoke (a clock) |
| 19 | dungeon-gate | ดันเจี้ยน | a ruined stone temple gate with a dark doorway and roots |
| 20 | pet-food | อาหารสัตว์เลี้ยง | a clay bowl with rice and a small fish |
| 21 | pet-egg | ไข่สัตว์เลี้ยง | a speckled egg in a small woven nest |
| 22 | pet-bell | กระดิ่งสัตว์เลี้ยง | a red collar with a small brass bell |
| 23 | event-krathong | กระทง | a banana-leaf krathong with a candle and incense |
| 24 | event-token | เหรียญงานวัด | a round festival token with a ribbon |

Cells 1–4 are used from 0.46; the rest light up as 0.47–0.50 ship (until then they are only in the sheet).
Drop-in: replace `assets/social46/social.png`, keep the size and order; run `python scripts/normalize-icon-atlas.py` if icons are off-center.
