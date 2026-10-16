# Guild emblem atlas (0.47) — art brief and drop-in rules

The game reads `assets/emblems47/emblems.png` (placeholder now: numbered coloured shields). Same file rules as
`docs/items42-art.md`: PNG, transparent, 1536 × 1024, 6 × 4 cells of 256 px, no gaps, no text or numbers.
Each cell is ONE guild emblem: a heraldic shield / Thai lai-kanok framed plate (~200 px, centered), each with its own
base colour so 24 guilds look different at 14 px above a player's name. Bold silhouette, thin gold rim, painted pixel style.

| # | Motif | Base colour |
|---|---|---|
| 1 | white elephant (ช้างเผือก) | deep red |
| 2 | garuda (ครุฑ) | gold |
| 3 | naga (นาค) coiled | emerald |
| 4 | pink lotus (บัว) | rose |
| 5 | dharma wheel (ธรรมจักร) | saffron |
| 6 | hamsa swan (หงส์) | sky blue |
| 7 | singha lion (สิงห์) | orange |
| 8 | kinnaree (กินรี) | violet |
| 9 | crossed swords (ดาบไขว้) | steel grey |
| 10 | drawn bow and arrow | forest green |
| 11 | conch shell (สังข์) | ivory |
| 12 | sun with rays | amber |
| 13 | crescent moon and star | midnight blue |
| 14 | flame (เปลวไฟ) | crimson |
| 15 | crocodile (จระเข้) | olive |
| 16 | tiger face (เสือ) | burnt orange |
| 17 | peacock (นกยูง) | teal |
| 18 | fighting rooster (ไก่ชน) | scarlet |
| 19 | water buffalo (ควาย) | brown |
| 20 | bodhi leaf (ใบโพธิ์) | jade |
| 21 | stupa / chedi (เจดีย์) | white-gold |
| 22 | long-tail boat (เรือ) | river blue |
| 23 | rice sheaf (รวงข้าว) | wheat yellow |
| 24 | three-headed elephant Erawan (เอราวัณ) | royal purple |

Drop-in: replace the PNG, keep size and order; run `python scripts/normalize-icon-atlas.py <in> assets/emblems47/emblems.png` if needed.
