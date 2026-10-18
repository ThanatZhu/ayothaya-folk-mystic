# ถึง Claude (โน้ตบุ๊ก): รับช่วงงาน Ayothaya Folk Mystic ต่อ

สถานะล่าสุด: **0.61.3** · commit `79b30aa` บน `main` · วันที่ 2026-10-18
อ่านไฟล์นี้ให้จบก่อนแก้อะไร แล้วตรวจของจริงในเครื่อง (git status, branch, ไฟล์) ทุกครั้ง อย่าเดาจากเอกสาร

## โปรเจกต์
- เกม MMORPG 2.5D สไตล์ Ragnarok ธีมอยุธยา · ภาษาไทย · ตอบผู้ใช้เป็นภาษาไทยเสมอ
- Repo: https://github.com/ThanatZhu/ayothaya-folk-mystic (branch `main` = ที่ deploy จริง)
- เว็บ: https://ayothaya-folk-mystic.vercel.app/ · Vercel deploy อัตโนมัติจาก `main` (`npm run build` → `dist/`)
- เซิร์ฟเวอร์ออนไลน์: Render free `wss://ayothaya-folk-mystic.onrender.com/realtime` deploy อัตโนมัติจาก `main`
  เช็กได้ที่ `/health` (มี `commit` และ `authority:true` = พร้อม) · หลับหลังว่าง ~15 นาที ตื่น ~1 นาที
- Firebase project: `ayothaya-folk-mystic` (Auth + Firestore Spark ฟรี 20k writes/วัน รีเซ็ต 14:00 น. ไทย)
- Codex อาจทำงานใน repo เดียวกัน: `git fetch` + ดู `git log HEAD..origin/main` ก่อน push ทุกครั้ง แล้ว rebase ถ้ามีงานใหม่

## กติกาที่ต้องทำตาม (จากเจ้าของ)
- ห้ามย้ายเกมไปโปรเจกต์อื่น (เช่น nimma-ai) · คำสั่ง Firebase/gcloud ต้องระบุ `--project=ayothaya-folk-mystic`
- ห้ามนำ service-account key, OAuth token, `.local-multiplayer/profiles.json` ขึ้น Git/เว็บ · Firebase web config เป็น public ได้
  แต่ห้ามเอา admin credentials ไปไว้ frontend · ห้ามใส่ token ลงคำสั่งหรือ remote URL
- ถามก่อนเสมอเมื่อมี: ค่าใช้จ่ายใหม่ · สิทธิ์ระบบเพิ่ม · ลบข้อมูลจริง · แก้ Firestore rules บน production
- ห้าม force-push / reset ทับงาน · commit เฉพาะไฟล์ของงานนั้น (`git add <ไฟล์>` ไม่ใช้ `-A` ทั้ง repo)
- ห้ามบอกว่าเสร็จ/deploy แล้วถ้ายังไม่ได้ตรวจเว็บจริงและ `/health` ของ Render
- **เรื่องเซิร์ฟเวอร์เสียเงินและโดเมน ทำเป็นอย่างสุดท้าย** หลังเนื้อหาเกมครบ (เจ้าของสั่ง)
- เจ้าของ **ไม่ชอบโมเดลตัวละครชุดวาดใหม่** ให้ใช้ภาพตัวละครชุดเดิม (`assets/animation37/<class>.png` + `<class>-walk.png`)

## เริ่มงานบนโน้ตบุ๊ก
```
git clone https://github.com/ThanatZhu/ayothaya-folk-mystic.git
cd ayothaya-folk-mystic
npm ci
npm test                    # ~208 tests ต้องผ่าน
npm run test:multiplayer    # 16 tests
npm run check:content
npm run build               # ทดสอบในเครื่องเสิร์ฟจาก dist/
```
- เซิร์ฟเวอร์ทดสอบในเครื่อง: `AUTH_MODE=local PORT=8788 node server/host.js` (เสิร์ฟ `dist/` ที่ http://127.0.0.1:8788/
  ต้อง `npm run build` ก่อน) · หน้าเว็บ localhost ใช้ ws://127.0.0.1:8787 ถ้าใช้พอร์ตอื่นต้องแก้ใน test script
- Push: เจ้าของต้อง login เอง `gh auth login` (บัญชี GitHub **ThanatZhu**) · ถ้ามีหลายบัญชีใช้
  `GH_TOKEN="$(gh auth token --user ThanatZhu)" git push origin HEAD:main`
- gcloud (ดูโควตา Firestore/แก้ rules) ต้องให้เจ้าของ login เอง บัญชีเจ้าของโปรเจกต์ · rules deploy ผ่าน Rules API ได้
- Firestore rules test: `npm run test:rules` (ต้องมี Java)

## Workflow ทุกเวอร์ชัน
1. แก้ → `npm test` + `npm run test:multiplayer` (+ `check:content` ถ้าแตะ maps/items/story)
2. ทดสอบในเบราว์เซอร์ (คอม + มือถือแนวนอน 915×412) · ใช้ puppeteer หรือ browser tool
3. เปลี่ยนเลขเวอร์ชันใน `index.html` (`EARLY WORLD PREVIEW · 0.xx`)
4. commit (ภาษาอังกฤษ ลงท้าย `Co-Authored-By: Claude …`) → fetch/rebase → push `main`
5. รอ Vercel แสดงเวอร์ชันใหม่ + Render `/health` commit ตรง → ทดสอบบนเว็บจริง
6. บันทึกใน `docs/DEPLOYMENT-LOG.md` (บนพีซีเดิมใช้ `../../DEPLOYMENT.md` + mirror `outputs/ayothaya-scene-01`
   ด้วย `work/sync_mirror.py` — โน้ตบุ๊กไม่มีโฟลเดอร์นี้ ไม่ต้องทำ mirror)

## โครงสร้างหลัก (ไฟล์อยู่ root ของ repo)
- `combat-core.js` โลกการต่อสู้ (ใช้ร่วม client offline + server) · `monster-catalog.js` มอน + พฤติกรรม (`MONSTER_BEHAVIOUR`)
- `server/realm.js` เซิร์ฟเวอร์ authoritative (คำสั่งอยู่ใน set `allowed`) · `server/host.js` WebSocket/เซฟ/takeover · `server/storage.js`
- `items.js` ไอเทม/ดรอป/ร้าน/rarity/affix (`!` suffix) · `character-stats.js` · `refine.js` · `market.js` · `social.js` · `pets.js`
- `experience.js` เลเวล (50+6·(L−1) ต่อเลเวล) · `story-quests.js` เนื้อเรื่องบท 1–2 · `bounty.js` ค่าหัว/สมุดการ์ด
- UI: `bag-ui.js` `status-ui.js` `market-ui.js` `social-ui.js` `life-ui.js` `pet-ui.js` `quests-ui.js` `controls-ui.js`
  `feedback.js` (เสียง/เพลง synth) `life-npc.js` (ทหารรับจ้าง/NPC) `world-ui.js` (แผนที่ภาพจริง + ปุ่ม World วาร์ป) · mount ใน `viewer-world.js`
- แผนที่: `maps/world.json` (v43: ayutthaya, rice-fields, old-orchard, moonlit-mill, mill-cellar [instance], lotus-marsh)
- atlas ไอคอน 6×4×256: `assets/items42 gear43 refine44 cards45 social46 emblems47 emotes48 items48` · สคริปต์จัดกริด
  `scripts/normalize-icon-atlas.py`, `scripts/normalize-monster-sheet.py`

## งานที่ทำเสร็จแล้ว (สรุป)
0.46 ตลาด/แลกของ/คลัง · 0.47 เพื่อน/กิลด์ · 0.48 สถานะผิดปกติ/อีโมต/ล็อกอินรายวัน · 0.49 MVP/ดันเจี้ยนปาร์ตี้ · 0.50 สัตว์เลี้ยง/เทศกาล
0.51 ปรับปุ่มควบคุม · 0.53 เสียง/เพลง · 0.54 ไอคอนภาพจริง 7 ชีต + บอส · 0.57 เลเวลโค้ง/อาวุธขั้น 3–4/rarity/affix
0.58 พฤติกรรมมอน/คอมโบ · 0.59 แผนที่ภาพจริง + World วาร์ป · 0.60 บท 2 + บึงบัว + ค่าหัว + สมุดการ์ด · 0.61 ทหารรับจ้าง/NPC
0.61.2 ล็อกอินใหม่เตะเครื่องเก่า (แก้ "เชื่อมต่อไม่ได้" เมื่อเปิดสองที่) · 0.61.3 กลับไปใช้โมเดลตัวละครเดิม

## งานค้าง / ทำต่อได้
1. **รอภาพจาก ChatGPT** ตาม `docs/art-prompts-061.md` ใช้ได้: ข้อ 1 gear57 · ข้อ 2 marsh60 · ข้อ 3 cards45 ช่อง 12–16 · ข้อ 5 หน้าโหลดบึง
   (ข้อ 4, 6, 7 อ้างโมเดลชุดใหม่ที่เจ้าของไม่เอา → ข้าม) · ตอนนี้ของพวกนี้ใช้ภาพชั่วคราว (ไอคอนย้อมสี `tint`, มอนบึงยืมแถวเดิม)
   เมื่อได้ภาพ: ตรวจ → จัดกริดด้วยสคริปต์ → เปลี่ยน atlas/sheet ใน items.js/monster-catalog.js → ทดสอบ → deploy
2. ท่าเดินโมเดลเดิมขาไม่ค่อยสลับ — ถ้าเจ้าของต้องการ เขียน prompt ใหม่โดยใช้ `assets/animation37/<class>.png` (ท่ายืนเดิม) เป็นต้นแบบ
   โค้ดรองรับท่าเดินหันหน้า/หลัง (เฟรม 20–27 / 28–35) และท่ายืนเฟรม 23/31 อยู่แล้ว ถ้าไม่มีภาพจะ fallback เอง
3. ยังไม่ทำ: แสดงทหารรับจ้างของผู้เล่นคนอื่น · ทหารรับจ้างไม่ถูกเซฟ · บึงบัวใช้ผังสวนหมาก
4. **ข้อสุดท้าย:** เซิร์ฟเวอร์ (Render เสียเงิน ~$7/เดือน หรือ pinger) + โดเมน — ถามเจ้าของก่อน
