# Ayothaya Folk Mystic

เกมแฟนตาซีไทยแบบ Chibi Pixel 2.5D หมุนกล้องได้ เดินทางระหว่าง 6 เมือง โดยมี **อยุธยาเป็นเมืองหลวง**

**[เปิดเล่นออนไลน์](https://ayothaya-folk-mystic.vercel.app/)** · **[ภาพทั้ง 6 เมือง](https://ayothaya-folk-mystic.vercel.app/world-gallery.html)**

![อยุธยา](maps/ayutthaya-preview.png)

## โลกขยาย (0.12)

6 เมืองเป็นเขตปลอดภัยทั้งหมด และมีแมพนอกเมืองแยกอีก 6 แห่ง: ทุ่งนอกกำแพง ป่าไทรและบึงหมอก ซากเมืองศิลา ป่าไผ่นอกค่าย ป่าริมแคว และชายฝั่งเครื่องเทศ รวม 12 แมพ ขนาดพื้นที่เดินหลัก 234 × 195.3 หน่วยต่อแมพ ประมาณ 50 เท่าของฉากเดิม โดยคงขนาดตัวละครและบ้านเดิม

เมืองมี 9 จุดรถเกวียนสำหรับย้ายภายในเมือง เปิดด้วย M / แผนที่โลก และมีประตูเหนือเชื่อมแมพผจญภัยของตนเอง เมืองหลวงเชื่อมหัวเมืองทั้งห้า มอนสเตอร์อยู่เฉพาะแมพผจญภัย ไม่ข้ามกลับเมืองหรือเกิดในเมือง แม้ตั้งค่า spawn ผิดไว้ก็ตาม

NPC หลัก 30 คน มีชื่อและบทสนทนาเบื้องต้นตามร่างเรื่องสายใยขวัญ ใช้ภาพ NPC เดิมร่วมกันในรุ่นนี้ ยังไม่มีระบบเควสต์ ร้านค้า ครูฝึกจริง หรือภาพเฉพาะครบ 30 คน อาคารและของตกแต่งใช้ชุด Asset เดิมประกอบเป็นย่านใหม่

โหลดโมเดลเฉพาะแมพที่ผู้เล่นอยู่ และใช้ frustum culling ของ Three.js ยังไม่ได้แบ่งโหลดเป็น chunk ภายในแมพหรือวัด FPS บนมือถือจริง ภาพตัวอย่างเดิมใน gallery เป็นมุมท่าเรือเก่าของเมือง

สร้างฉากและ navigation ใหม่ด้วย `blender --background --python build_regions12.py` ซึ่งต่อยอดโมดูลจาก build_world05.py; อย่ารันตัวสร้างรุ่นเก่าเพื่อเผยแพร่ทับโลกใหม่

## เมือง

อยุธยา · บางไทร · ละโว้ · สุพรรณ · พิษณุโลก · นครศรีธรรมราช

แต่ละเมืองมีผังอาคาร จุดเกิด NPC และเส้นทางเดินทางของตัวเอง พร้อมน้ำไหล เรือโยก ลม ใบไม้ร่วง และพืชประจำภูมิภาค ผังเมืองเป็นแฟนตาซี ไม่ใช่การจำลองแผนที่ประวัติศาสตร์

## ควบคุม

- คอม: WASD เดิน, Space โจมตี, F ออโต้, 1–9 และ 0 สกิล, Q/E หมุนกล้อง
- M แผนที่โลก, R คุย/เดินทางเมื่ออยู่ใกล้, V ดูทั้งเมือง
- มือถือ: **เล่นแนวนอนเท่านั้น** จอยซ้ายเดิน ปุ่มขวาโจมตี/สกิล ลากฉากฝั่งขวาหมุนกล้องและสองนิ้วซูม
- แนวตั้งแสดงหน้าขอให้หมุนเครื่องและพักเกม ปุ่มเต็มจอพยายามล็อกแนวนอนเมื่อเบราว์เซอร์รองรับ เบราว์เซอร์ที่ไม่รองรับต้องหมุนเครื่องเอง

เว็บเปิดเล่นได้ผ่านอินเทอร์เน็ต เกมรุ่นนี้เป็น **single-player prototype** พร้อม Google Login และเซฟผ่าน Firebase ไม่มีเซิร์ฟเวอร์ผู้เล่นร่วมโลกเดียวกัน

## หน้าเข้าเกม

หน้าแรกเป็นล็อบบีแยกจากฉากเกม: **Google Login / ทดลองเล่น → เซิร์ฟ 1 หรือ 2 → สร้างหรือเลือกตัวละคร → เข้าเกม** แต่ละบัญชีมีหนึ่งตัวละครต่อเซิร์ฟเวอร์ ตั้งชื่อ 2–16 ตัวและเลือกรูปลักษณ์ชาย/หญิงได้ เลือกได้ 7 อาชีพ: นักดาบ นักทวน นายพราน นักมวย จอมโจร หมอผี และพระ/แม่ชี แต่ละอาชีพมีรูปลักษณ์ชาย/หญิง ท่าและสกิลต่างกัน

ภาพหน้าเข้าเกมเป็น Ayutthaya Pixel Folk Mystic พร้อมโมชั่นละอองแสงและตัวละคร ปิดโมชั่นได้และเคารพ prefers-reduced-motion ตัวเกมโหลด 3D หลังเลือกตัวละครแล้วเท่านั้น `index.html` / `lobby.js` คือหน้าเข้าเกม และ `game.html` คือฉากเล่น

เซิร์ฟ 1/2 เป็นพื้นที่แยกตัวละครและเซฟ ยังไม่ใช่เซิร์ฟเวอร์มัลติเพลเยอร์ เซฟต้นแบบเดิมถูกคัดลอกไปยังตัวละครแรกในเซิร์ฟ 1 โดยยังเก็บต้นฉบับไว้

## อาชีพและแอนิเมชัน (0.9)

- เลือกอาชีพก่อนสร้าง หรือเปลี่ยนอาชีพตัวละครเดิมในล็อบบีได้ฟรีในรุ่นทดลอง เก็บชื่อ เพศ เมือง ความคืบหน้าและคูลดาวน์เดิมไว้
- สไปรต์ 14 รูปลักษณ์: แต่ละรูปมีท่ายืน เดินสองจังหวะ และโจมตี/ร่าย ใช้ atlas 4 คอลัมน์ × 2 แถว (ชายบน หญิงล่าง) เป็นแอนิเมชันพื้นฐาน ไม่ใช่ชุดแปดทิศหรือคอมโบหลายเฟรมสมบูรณ์
- ชุดสกิลต้นแบบ 10 ช่องต่ออาชีพ: ระยะ ความเร็ว การโจมตี เอฟเฟกต์ และการฟื้นฟูต่างกัน แต่บางสกิลใช้กลไกพื้นฐานร่วมกัน ยังไม่ผ่านบาลานซ์สำหรับ multiplayer
- NPC หายใจ/โยกตัว; มอนสเตอร์มี idle, เดินโยก, พุ่งโจมตีและสะดุ้ง; UI เปลี่ยนขั้นตอนและสถานะอย่างนุ่มนวล รองรับ reduced-motion
- ไฟล์ภาพใหม่ใน `assets/classes/` สร้างด้วย built-in ImageGen; prompt ครบชุดอยู่ใน `assets/classes-prompts-09.json` ต้นฉบับเก่ายังคงอยู่
- แก้ข้อมูลอาชีพที่ `classes.js` และจังหวะท่าที่ `sprite-motion.js`

## บัญชีและเซฟ

กด **เข้าสู่ระบบด้วย Google** ที่หน้าแรก แล้วเลือกเซิร์ฟและตัวละคร เพื่อเล่นต่อข้ามเครื่อง เซฟ HP/MP จำนวนมอนที่ปราบ คูลดาวน์ เมือง ตำแหน่ง ซูม มุมกล้อง และสถานะโมชั่น ทุก 10 วินาทีเมื่อมีข้อมูลเปลี่ยน ก่อนเปลี่ยนเมือง และก่อนออกจากระบบ มีปุ่มเซฟทันที และพยายามเซฟเมื่อสลับแท็บ การปิดแอปทันทีอาจทำให้ข้อมูลหลังเซฟครั้งล่าสุดยังไม่ส่งถึงคลาวด์

โหมดเล่นบนเครื่องนี้เก็บใน localStorage แยกจากบัญชี Google ไม่ย้ายหรือเขียนทับตัวละครคลาวด์อัตโนมัติ กระเป๋า อุปกรณ์ เงิน และเควสต์ยังไม่ถูกสร้าง จึงยังไม่มีข้อมูลเหล่านั้นให้บันทึก

Firebase project: `ayothaya-folk-mystic`, Firestore Standard `(default)` ที่ `asia-southeast3` (Bangkok), Spark plan. เซฟอยู่ที่ `players/{uid}/saves/server-1` และ `server-2`; `main` เก็บเซฟเก่าก่อนมีล็อบบี; กฎอนุญาตเฉพาะเจ้าของและตรวจรูปแบบข้อมูล ใช้ transaction/revision ป้องกันแท็บเก่าทับเซฟใหม่ เมื่อเกิดข้อขัดแย้งต้องโหลดเซฟล่าสุดก่อนเล่นต่อ

นี่เป็นระบบเซฟต้นแบบฝั่ง client; กฎป้องกันการแก้เซฟคนอื่น แต่ยังไม่ตรวจผลการต่อสู้บนเซิร์ฟเวอร์ ก่อนเพิ่มการซื้อขาย อันดับ หรือเงินจริง ต้องย้ายการคำนวณรางวัลไปเซิร์ฟเวอร์

## รันในเครื่อง

ใช้ Python 3: `python -m http.server 8767` แล้วเปิด `http://localhost:8767/`

ทดสอบด้วย Node.js: `npm test` (ไม่ต้องติดตั้งแพ็กเกจ)

ไลบรารี Three.js อยู่ใน `vendor/` พร้อมไฟล์ลิขสิทธิ์ Firebase SDK 13 โหลดจาก CDN ของ Google ค่าใน `firebase-config.js` เป็น public web configuration; ห้ามใส่ service account หรือ admin credential ในหน้าเว็บ

## แก้แมพและภาพ

`maps/world.json` คือข้อมูลฉากและเส้นทาง `maps/*.blend` และ `maps/*.glb` คือโครงสร้างฉากทั้ง 6 เมือง สร้างใหม่ด้วย Blender: `blender --background --python build_regions12.py`

Blender เก็บ geometry/UV; ตัวละคร พืช พื้นผิว แสง และโมชั่นประกอบใน `viewer-world.js` กับ `ambient-motion.js` ภาพ PNG และพรอมป์จาก built-in ImageGen อยู่ใน `assets/`

ล็อบบีและเซิร์ฟ: `lobby.js`, `realm-state.js`, `realm-store.js`; ส่วนเกม: `combat-core.js`, `game-controls.js`; การเดินทาง: `world-ui.js`, `world-state.js`; แนวนอนมือถือ: `mobile-layout.js`, `mobile-layout.css`

## ตรวจสอบ

65 automated tests ครอบคลุมการเดิน การชน ทางอ้อม ต่อสู้ จุดเกิดทุกเมือง ข้ามเมือง กฎแนวนอน การคืนค่าเซฟ และ revision conflict; ยังไม่ได้ยืนยัน hardware orientation lock หรือ multitouch ด้วยมือถือจริง

## เผยแพร่

Vercel เชื่อม repository นี้กับ branch `main` และเผยแพร่ที่ https://ayothaya-folk-mystic.vercel.app/ อัตโนมัติเมื่อ push ใช้ `npm run build` เพื่อคัดลอกไฟล์เล่นเกมไป `dist/` โดยไม่ส่งไฟล์ Blender ต้นฉบับ ชุดทดสอบ หรือกฎ Firestore ขึ้นเว็บ การตั้งค่าอยู่ใน `vercel.json`

โดเมน Vercel เพิ่มใน Firebase Authentication Authorized domains แล้ว ใช้ Firebase project เดิม บัญชี Google เดิมจึงอ้างอิงข้อมูลคลาวด์ชุดเดิม ส่วนเซฟทดลองใน localStorage แยกตามโดเมนและไม่ย้ายจาก GitHub Pages อัตโนมัติ การทดสอบล็อกอิน Google และเซฟคลาวด์ด้วยบัญชีจริงยังต้องยืนยันเพิ่มเติม

GitHub Pages ใช้ branch `main` ที่ root โฟลเดอร์นี้มี `.nojekyll` และใช้เส้นทาง relative เพื่อรองรับชื่อ repository ใน URL ผลัก commit ใหม่เพื่ออัปเดตเว็บ

ภาพล็อบบีและตัวละครชาย/หญิงสร้างด้วย built-in ImageGen เก็บใน `assets/login-ayutthaya.png` และ `assets/shaman-genders.png` พรอมป์อยู่ใน `assets/lobby-prompts.json`


## Detail and mobile HUD update (0.13)
- Added district benches, lanterns, herb beds, handcarts, merchandise, laundry, temple offerings and garden pools; wilderness rock clearings and rest stops. Collision remains authored with scenery.
- Top-right minimap opens travel; camera controls moved to a modal menu. Town target banner hidden.
- Mobile: five visible skill buttons per bank, all ten available through a 44px switch; 44px+ main controls, safe-area positioning and compact status panel. Desktop retains all ten skills.
- Local regression: 59 tests pass, static production build passes. Responsive browser checks at 844x390 and 568x320; physical-device FPS and multitouch not measured.


## Character customization and progression (0.14)
- Appearance and advanced profession persist per UID and server alongside existing game state; legacy characters remain compatible. Active-account checks prevent a stale session from saving to another account. Autosave every 10 seconds when dirty.
- Wardrobe supports garment overlays, outfit/hair/eye palettes, hair additions, facial hair and yantra marks. Preview and in-game atlas share the same compositor. Original baked-in hair/facial hair is retained; monastic classes retain shaved heads.
- Ten motion states reuse the existing four illustrated frames with class-sensitive transforms. Four emotes are available in the game menu. These are not ten newly drawn sprite animations.
- Each of seven base classes has two advanced branches with combat stat/skill modifiers. Unlock at level 10 (90 total defeats); prototype XP = defeats x 10. No advancement quest or separate advanced-class sprite atlas yet.
- Wardrobe has touch-sized controls and internal scrolling. Closing without applying discards the draft. Existing character edits use revision-checked saves.
- Validation: 65 automated tests; production build; local save/reload, appearance in game, emote and mobile wardrobe/cancel checks. Live authenticated cloud roundtrip still requires verification.
