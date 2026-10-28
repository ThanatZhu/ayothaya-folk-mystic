# ภาคจุติ · ห้าภพแห่งไฟต้นแสง (แผนแมพ + เนื้อเรื่อง 5 บท สำหรับผู้เล่นที่จุติแล้ว)

> ร่างโดย Claude · 0.122 · ยังไม่ได้ต่อเข้าเกม รอภาพและแมพก่อน

## แนวคิด

- **ใครเข้าได้:** ผู้เล่นที่จุติแล้ว (จุติ ≥ 1) เท่านั้น ทางเข้าคือท่าเรือเจ้าพระยาในอยุธยา ตอนพลบค่ำจะมีท่าเรือในหมอกโผล่ขึ้นมา คนที่ยังไม่จุติจะมองไม่เห็นและกดเดินทางไม่ได้
- **ทำไมต้องเป็นคนจุติ:** คนที่เคยตายแล้วกลับมาเท่านั้นที่ข้าม "แม่น้ำข้ามภพ" ได้ เรื่องเล่าต่อจากบทที่ 2 (ประทีปเจ็ดดวง): ประทีปทั้งเจ็ดกลับมาสว่างแล้ว แต่ไฟของประทีปทุกดวงมาจาก **ไฟต้นแสง** ที่เชิงเขาพระสุเมรุ และ **ทศกัณฐ์ตนจริง** (ไม่ใช่เงาในบทที่ 2) กำลังจะไปดับมัน
- **เลเวล:** จุติแล้วกลับไป Lv.1 ทั้ง 5 แมพจึงเป็น **เส้นทางเก็บเลเวลใหม่ 1–99** สำหรับคนจุติ (บทละ ~20 เลเวล) ไม่ต้องกลับไปตีแมพเก่าซ้ำ
- **ตัวละครประจำภาค:** ยายจันทร์ (คนพายเรือข้ามภพ) อยู่ทุกบท · พระปัญญา (มีอยู่แล้ว) เปิดและปิดเรื่อง · NPC ใหม่ประจำบท: มาลัย (กินรี) · ทิพย์สุวรรณ (คนธรรพ์) · นางจันทรา (นักบวชจันทร์) · บทสุดท้ายทุกคนมารวมกัน
- **รูปแบบเดียวกับเควสเดิม:** บทละ 4 เควส (รวม 20) · แต่ละเควสมีภาพสตอรี่ 3 ช่องแบบเดิม (`assets/story160`) · แต่ละแมพมีมอน 4 ชนิด + หัวหน้าฝูง + บอส
- **เข้ากับระบบที่เพิ่งทำ:** มอนเลเวลสูงกว่าผู้เล่น 15+ จะตีก่อน จึงไม่ควรเดินข้ามบทเร็วเกินไป

| บท | แมพ (id) | เลเวล | ธีม | บอส |
|---|---|---|---|---|
| 1 | **ท่าน้ำข้ามภพ** (`rebirth-ferry`) | 1–20 | ผู้จุติจำชาติก่อนไม่ได้ ข้ามแม่น้ำหมอกไปตามหาความทรงจำที่ลอยอยู่ในโคม | พรายเจ้าท่า |
| 2 | **ป่ากัลปพฤกษ์** (`rebirth-kalpa`) | 20–40 | ป่าต้นไม้แห่งความปรารถนาของหิมพานต์ · กินรีถูกขโมยขนปีกจนบินกลับบ้านไม่ได้ | นกหัสดีลิงค์ |
| 3 | **นครคนธรรพ์ลอยฟ้า** (`rebirth-gandharva`) | 40–60 | เพลงของคนธรรพ์คือสิ่งที่ปลุกไฟในประทีปทุกดวง · แต่เพลงถูกลืมไปแล้ว | เจ้าคนธรรพ์ผู้ลืมเพลง |
| 4 | **แดนอสูรราหู** (`rebirth-rahu`) | 60–80 | ราหูกลืนดวงจันทร์จนแดนนี้มืดตลอดกาล · ถ้าจันทร์ไม่คืน ประทีปทั่วโลกจะริบหรี่ | ราหูอมจันทร์ |
| 5 | **ฝั่งทะเลสีทันดร** (`rebirth-sithandon`) | 80–99 | ต้นกำเนิดไฟของประทีปทั้งหมดอยู่ที่เชิงเขาพระสุเมรุ · ทศกัณฐ์ตนจริงหมายจะดับไฟต้นแสง | ทศกัณฐ์ (ร่างจริง) |

## ตัวละคร (ใช้คำบรรยายนี้ซ้ำทุก prompt เพื่อให้หน้าตาเหมือนกันทุกภาพ)

| NPC | คำบรรยายภาษาอังกฤษใน prompt |
|---|---|
| พระปัญญา | elderly Thai monk Phra Panya in saffron robe, shaved head, gentle lined face, wooden prayer beads |
| ยายจันทร์ | old Thai ferrywoman Yai Chan, white hair in a low bun, faded indigo blouse and dark sarong, long wooden oar, small brass lantern hanging from the boat prow |
| เจ้าจุก | Thai village child Chao Juk with a little topknot, plain cream shirt and red sash |
| มาลัย (กินรี) | gentle kinnaree maiden Malai, upper body of a young Thai woman in a modest classical Thai dance costume with high golden collar and full sleeves, lower body and wings of a cream-and-gold swan, delicate pointed golden crown |
| ทิพย์สุวรรณ (คนธรรพ์) | young gandharva musician Thipsuwan, slim Thai youth with long hair tied high, sky-blue silk jacket and golden sash, carrying a three-stringed Thai fiddle (saw sam sai) |
| นางจันทรา | serene moon priestess Nang Chantra, middle-aged Thai woman in silver-white robe and pale blue shawl, crescent-moon hairpin, holding a small round mirror that glows like the moon |

## รายการเควส

### บทที่ 1 · ท่าน้ำข้ามภพ (Lv.1–20)
1. **เสียงระฆังจากอีกฝั่ง** (`rb1`) · พระปัญญาได้ยินระฆังที่มีแต่ผู้จุติได้ยิน · ไปท่าเรือเจ้าพระยายามค่ำ
2. **ยายจันทร์ผู้พายเรือข้ามภพ** (`rb2`) · ยายจันทร์รับส่งเฉพาะคนที่ตายแล้วกลับมา · ข้ามแม่น้ำหมอก
3. **ความทรงจำในโคมลอย** (`rb3`) · โคมลอยหลงภพขโมยความทรงจำ · เก็บแสงความทรงจำคืน
4. **พรายเจ้าท่า** (`rb4`) · บอสบทที่ 1 · พรายที่เฝ้าท่าน้ำโบราณกักความทรงจำไว้
- มอน: โคมลอยหลงภพ · ปูเงาท่าน้ำ · ผีเสื้อราตรี · กบหมอก · หัวหน้าฝูง: นางพรายริมตลิ่ง · บอส: พรายเจ้าท่า

### บทที่ 2 · ป่ากัลปพฤกษ์ (Lv.20–40)
1. **ป่าที่ต้นไม้ให้พร** (`rb5`) · แรกเข้าป่ากัลปพฤกษ์ · ผลไม้อัญมณีร่วงหายไปทีละลูก
2. **ปีกที่หายไป** (`rb6`) · พบมาลัย กินรีที่ขนปีกถูกขโมยจนบินไม่ได้
3. **กวางทองลวงตา** (`rb7`) · ฝูงกวางทองลวงตาพาคนหลงป่า · ตามรอยจริงให้เจอ
4. **เงาปีกหัสดีลิงค์** (`rb8`) · บอสบทที่ 2 · นกหัสดีลิงค์สะสมขนกินรีไว้สร้างรัง
- มอน: กวางทองลวงตา · ภมรยักษ์ · กิ่งไม้ทิพย์เดินได้ · กระรอกอัญมณี · หัวหน้าฝูง: ราชสีห์หิมพานต์หนุ่ม · บอส: นกหัสดีลิงค์

### บทที่ 3 · นครคนธรรพ์ลอยฟ้า (Lv.40–60)
1. **บันไดสู่เมฆ** (`rb9`) · ขึ้นสู่นครลอยฟ้า · ระฆังทุกใบเงียบสนิท
2. **ซอสามสายที่ไม่มีเสียง** (`rb10`) · พบทิพย์สุวรรณ คนธรรพ์หนุ่มที่สีซอแล้วไม่มีเสียง
3. **เพลงที่ลมพัดหาย** (`rb11`) · เก็บเศษท่วงทำนองจากเมฆอสนีและระฆังที่หลงเสียง
4. **เจ้าคนธรรพ์ผู้ลืมเพลง** (`rb12`) · บอสบทที่ 3 · เจ้าคนธรรพ์ถูกเงาครอบจนลืมเพลงทั้งหมด
- มอน: เมฆอสนี · ระฆังลมหลงเสียง · นกการเวกพลัดฝูง · ภูตพิณร้าว · หัวหน้าฝูง: ครุฑน้อยเฝ้าหอ · บอส: เจ้าคนธรรพ์ผู้ลืมเพลง

### บทที่ 4 · แดนอสูรราหู (Lv.60–80)
1. **ใต้จันทร์ที่ถูกกลืน** (`rb13`) · แดนที่มืดเพราะราหูกลืนจันทร์ · พบนางจันทรา
2. **เศษแสงจันทร์** (`rb14`) · แสงจันทร์ที่ร่วงลงมาถูกอสูรเก็บไว้ · ตามเก็บคืน
3. **กระจกสะท้อนดวงจันทร์** (`rb15`) · นางจันทราเตรียมพิธีดึงจันทร์คืน · ต้องปกป้องพิธี
4. **ราหูอมจันทร์** (`rb16`) · บอสบทที่ 4 · ราหูตนจริงตื่นจากหลุมอุกกาบาต
- มอน: อสูรหินดำ · หมาไฟหางเพลิง · งูเงาจันทร์ · ค้างคาวอุปราคา · หัวหน้าฝูง: ทหารอสูรถือกระบอง · บอส: ราหูอมจันทร์

### บทที่ 5 · ฝั่งทะเลสีทันดร (Lv.80–99)
1. **ทะเลเจ็ดชั้น** (`rb17`) · ยายจันทร์พามาถึงทะเลรอบเขาพระสุเมรุ · ทุกคนที่เคยช่วยมารวมตัว
2. **ไฟต้นแสง** (`rb18`) · พระปัญญาเผยว่าไฟของประทีปทุกดวงมาจากที่นี่
3. **ทัพยักษ์ข้ามทะเล** (`rb19`) · กองทัพยักษ์สิบหน้าบุกข้ามวงแหวน · ต้องป้องกันสะพานแก้ว
4. **ทศกัณฐ์** (`rb20`) · บอสบทที่ 5 · ทศกัณฐ์ตนจริงมาเพื่อดับไฟต้นแสง · จบภาคจุติ
- มอน: ทหารยักษ์สิบหน้า (บริวารทศกัณฐ์) · ม้าทะเลสีทันดร · ปลาอานนท์น้อย · เงาประทีปดับ · หัวหน้าฝูง: ขุนยักษ์ถือทวน · บอส: ทศกัณฐ์ (ร่างจริง)

---

## วิธีใช้ prompt

**ภาพสตอรี่ (20 ภาพ):** เปิดแชตใหม่ใน ChatGPT แล้ววาง prompt ทีละอัน 1 อัน = 1 ภาพ ขนาด 1024×1536 แนวตั้ง แบ่ง 3 ช่องแนวนอน
- **ให้หน้าตา NPC เหมือนเดิม:** แนบภาพเก่าใน `assets/story160` (เช่น `t3.webp` ที่มีพระปัญญา) เป็นภาพอ้างอิงสไตล์ไปด้วย
- **ตั้งชื่อไฟล์:** ตาม id (`rb1.webp` ถึง `rb20.webp`) แล้วส่งมาให้ผม

**แมพ (5 แมพ):** ทำทีละแมพ แมพละ 1 แชต วาง **ส่วน A (สเปกเทคนิค)** ก่อน แล้วตามด้วย **ส่วน B ของแมพนั้น** ในข้อความเดียวกัน ได้ไฟล์ `.glb`, `.blend` และ JSON แล้วส่งมาให้ผมทีละแมพ

---

## ภาพสตอรี่ (คัดลอกทีละกล่อง)

### บทที่ 1 · ท่าน้ำข้ามภพ

#### rb1 · เสียงระฆังจากอีกฝั่ง

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Dusk establishing view of the Ayutthaya Chao Phraya pier; a silver mist bank rolls in from the river and, inside it, an old wooden pier that was never there before glimmers faintly, uncanny calm.
MIDDLE: Close intimate shot of elderly Thai monk Phra Panya in saffron robe, shaved head, gentle lined face, wooden prayer beads under temple eaves, eyes closed, one hand raised as if listening to a distant bell nobody else hears, small votive lamps beside him.
BOTTOM: Low wide view from behind a small anonymous traveller standing at the end of the real pier, facing the ghostly pier in the mist; a single soft bell-shaped ripple spreads across the water.
```

#### rb2 · ยายจันทร์ผู้พายเรือข้ามภพ

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Medium shot of old Thai ferrywoman Yai Chan, white hair in a low bun, faded indigo blouse and dark sarong, long wooden oar, small brass lantern hanging from the boat prow standing in her narrow wooden boat at the misty pier, offering a wrinkled hand, kind but knowing smile.
MIDDLE: Wide calm shot of the small boat gliding across a vast silver river at twilight, hundreds of floating lotus lanterns glowing blue-gold on the water around it.
BOTTOM: Close detail of one floating lotus lantern drifting beside the oar; inside its glow a faint tiny scene flickers like a memory, mysterious and gentle.
```

#### rb3 · ความทรงจำในโคมลอย

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Eerie wide view of a half-sunken abandoned raft-house village on the misty river, lantern spirits with soft paper bodies drifting between the posts, no battle yet.
MIDDLE: Close shot of old Thai ferrywoman Yai Chan, white hair in a low bun, faded indigo blouse and dark sarong, long wooden oar, small brass lantern hanging from the boat prow holding up her brass lantern, warm light revealing small glowing memory sparks caught in reeds, she points the way.
BOTTOM: Dreamlike vision panel in muted gold: a back-facing anonymous traveller in a past life standing on a windy mountain peak above clouds, the memory blurred at the edges, nostalgic.
```

#### rb4 · พรายเจ้าท่า

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Dramatic wide view of the ancient water gate at the top of the river, broken mooring posts and a stone arch half in the water, cold blue mist swirling, ominous stillness.
MIDDLE: Tall pale river wraith with long wet black hair and tattered pale-green Thai shawl rising slowly from the water, many tiny memory lights trapped in her hair, eerie not gory.
BOTTOM: Over-shoulder view of old Thai ferrywoman Yai Chan, white hair in a low bun, faded indigo blouse and dark sarong, long wooden oar, small brass lantern hanging from the boat prow in her boat behind a small anonymous back-facing traveller, both facing the rising wraith from a distance, tense anticipation, no fight yet.
```

### บทที่ 2 · ป่ากัลปพฤกษ์

#### rb5 · ป่าที่ต้นไม้ให้พร

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Sweeping establishing view of a Himmapan wish-tree forest, giant trees with gold-green leaves, jewel-like fruits and small hanging lanterns, clear stream, magical morning light.
MIDDLE: Close shot of a branch where jewel fruits hang on silk threads; several threads are cut and empty, a few golden feathers caught on the bark, puzzling detail.
BOTTOM: Small anonymous back-facing traveller stepping through an arch of twisted roots into the forest, a trail of single golden feathers leading deeper inside.
```

#### rb6 · ปีกที่หายไป

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Medium shot of gentle kinnaree maiden Malai, upper body of a young Thai woman in a modest classical Thai dance costume with high golden collar and full sleeves, lower body and wings of a cream-and-gold swan, delicate pointed golden crown sitting sadly at the edge of a lotus pond beside a small wooden pavilion, one wing visibly thin with missing feathers.
MIDDLE: Close shot of Malai's hands holding three remaining golden feathers, soft reflection of her worried face in the pond, gentle and sorrowful.
BOTTOM: Wide shot of Malai pointing toward distant cliffs where a huge shadow of wings passes over the forest canopy, the anonymous traveller small in the foreground from behind.
```

#### rb7 · กวางทองลวงตา

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Enchanting wide view of a flower meadow where several identical golden deer stand among the trees, some slightly transparent like illusions, curious and beautiful.
MIDDLE: Close detail of hoofprints in soft earth: only one set of tracks is real and leaves crushed flowers, the others leave nothing, subtle clue composition.
BOTTOM: Back-facing anonymous traveller kneeling to touch the real tracks, gentle kinnaree maiden Malai, upper body of a young Thai woman in a modest classical Thai dance costume with high golden collar and full sleeves, lower body and wings of a cream-and-gold swan, delicate pointed golden crown watching hopefully from behind a tree trunk, calm before the chase.
```

#### rb8 · เงาปีกหัสดีลิงค์

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Dramatic low view up a rocky cliff to an enormous nest woven from branches and glittering golden feathers, wind-blown clouds, sense of scale.
MIDDLE: Majestic Thai mythical Hatsadiling bird with an elephant head and trunk, huge crimson-and-gold wings, perched on the nest, eyes narrowing, powerful but not gory.
BOTTOM: Wide shot from behind the anonymous traveller at the bottom of the cliff path, gentle kinnaree maiden Malai, upper body of a young Thai woman in a modest classical Thai dance costume with high golden collar and full sleeves, lower body and wings of a cream-and-gold swan, delicate pointed golden crown hovering low behind on weak wings, both looking up, no fight yet.
```

### บทที่ 3 · นครคนธรรพ์ลอยฟ้า

#### rb9 · บันไดสู่เมฆ

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Breathtaking wide view of floating islands above a sea of clouds, Thai pavilions with tiered roofs, rope bridges and stone stairs connecting them, golden wind chimes everywhere, all perfectly silent.
MIDDLE: Close shot of a large golden wind chime hanging still in strong wind, cloth ribbons fluttering but the bells motionless, quiet uncanny detail.
BOTTOM: Small anonymous back-facing traveller climbing the last stone steps onto the first island, cloud sea far below, lone pavilion ahead.
```

#### rb10 · ซอสามสายที่ไม่มีเสียง

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Medium shot of young gandharva musician Thipsuwan, slim Thai youth with long hair tied high, sky-blue silk jacket and golden sash, carrying a three-stringed Thai fiddle (saw sam sai) sitting on the edge of a pavilion floor, playing his fiddle passionately but no sound ripples appear, frustrated expression.
MIDDLE: Close detail of the saw sam sai fiddle strings: faint broken musical light-threads dissolving into the air like smoke, symbolic and elegant.
BOTTOM: Wide shot of Thipsuwan gesturing toward a tall bell tower on the highest island where dark storm clouds coil, the anonymous traveller beside him from behind.
```

#### rb11 · เพลงที่ลมพัดหาย

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Wide view of a garden island where small storm-cloud spirits with crackling edges drift among stone lanterns, and confused bell spirits hop on the path, no battle yet.
MIDDLE: Close shot of glowing fragments of melody shaped like curling golden notes without any letters, caught inside a small storm cloud, beautiful and strange.
BOTTOM: young gandharva musician Thipsuwan, slim Thai youth with long hair tied high, sky-blue silk jacket and golden sash, carrying a three-stringed Thai fiddle (saw sam sai) cupping a few recovered melody lights in his palms, a faint sound ripple returning, hopeful smile, warm sunset glow.
```

#### rb12 · เจ้าคนธรรพ์ผู้ลืมเพลง

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Dramatic wide view of a great bell tower on the highest island surrounded by a spiral of dark storm clouds, lightning without rain, ominous.
MIDDLE: Regal gandharva king in tarnished gold Thai regalia and tall crown, eyes clouded by drifting shadow, holding a cracked golden harp, sorrowful and dangerous, not gory.
BOTTOM: Over-shoulder from behind the anonymous traveller and young gandharva musician Thipsuwan, slim Thai youth with long hair tied high, sky-blue silk jacket and golden sash, carrying a three-stringed Thai fiddle (saw sam sai) at the tower stairs, both looking up at the king, wind tearing at their clothes, no fight yet.
```

### บทที่ 4 · แดนอสูรราหู

#### rb13 · ใต้จันทร์ที่ถูกกลืน

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Ominous wide view of a black-and-red volcanic plain under a total lunar eclipse, only a thin glowing ring of moon in the sky, cooling lava channels glowing orange.
MIDDLE: Medium shot of serene moon priestess Nang Chantra, middle-aged Thai woman in silver-white robe and pale blue shawl, crescent-moon hairpin, holding a small round mirror that glows like the moon at a small stone shrine, holding her moon mirror which has gone dim, worried but composed.
BOTTOM: Small anonymous back-facing traveller arriving on a stone path between cracked pillars, faint moon-ring light on their shoulders, uneasy calm.
```

#### rb14 · เศษแสงจันทร์

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Wide view of a ruined asura temple of dark stone with huge carved demon faces, small pale moon shards glowing among the rubble, black stone asuras patrolling, no battle yet.
MIDDLE: Close detail of a pale silver moon shard resting in a crack of black basalt, its cool light reflecting on the stone, precious and fragile.
BOTTOM: serene moon priestess Nang Chantra, middle-aged Thai woman in silver-white robe and pale blue shawl, crescent-moon hairpin, holding a small round mirror that glows like the moon holding the mirror up as a moon shard rises into it, the mirror glowing a little brighter, the anonymous traveller watching from behind.
```

#### rb15 · กระจกสะท้อนดวงจันทร์

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Wide view of a circular stone altar on a hill under the eclipsed moon, serene moon priestess Nang Chantra, middle-aged Thai woman in silver-white robe and pale blue shawl, crescent-moon hairpin, holding a small round mirror that glows like the moon kneeling at its center with the mirror raised, ritual circles of soft silver light.
MIDDLE: Close shot of fire-tailed hounds and shadow serpents gathering at the edge of the light circle, eyes glowing, tense, no attack yet.
BOTTOM: Back-facing anonymous traveller standing guard at the altar steps facing the darkness, silver light behind, determined stance.
```

#### rb16 · ราหูอมจันทร์

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Dramatic wide view of a vast crater under the eclipse, the moon ring above reflected in a pool of dark glass at the crater floor, rocks floating slightly.
MIDDLE: Colossal Thai mythical Rahu, upper body only with dark green skin, fierce fanged face, ornate golden Thai crown and jewellery, holding the dim moon between his hands near his mouth, awe-inspiring, not gory.
BOTTOM: Wide shot from behind the anonymous traveller and serene moon priestess Nang Chantra, middle-aged Thai woman in silver-white robe and pale blue shawl, crescent-moon hairpin, holding a small round mirror that glows like the moon at the crater rim, tiny against Rahu, the mirror catching a thin beam of moonlight, no fight yet.
```

### บทที่ 5 · ฝั่งทะเลสีทันดร

#### rb17 · ทะเลเจ็ดชั้น

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Majestic wide view of seven concentric ring seas of clear turquoise water around golden rock islands, a towering golden mountain on the horizon, glass bridges catching dawn light.
MIDDLE: Warm group shot on a golden pier: old Thai ferrywoman Yai Chan, white hair in a low bun, faded indigo blouse and dark sarong, long wooden oar, small brass lantern hanging from the boat prow, gentle kinnaree maiden Malai, upper body of a young Thai woman in a modest classical Thai dance costume with high golden collar and full sleeves, lower body and wings of a cream-and-gold swan, delicate pointed golden crown, young gandharva musician Thipsuwan, slim Thai youth with long hair tied high, sky-blue silk jacket and golden sash, carrying a three-stringed Thai fiddle (saw sam sai) and serene moon priestess Nang Chantra, middle-aged Thai woman in silver-white robe and pale blue shawl, crescent-moon hairpin, holding a small round mirror that glows like the moon gathered, looking toward the mountain, hopeful and serious.
BOTTOM: Small anonymous back-facing traveller stepping onto the first glass bridge, ring sea glittering below, the golden mountain far ahead.
```

#### rb18 · ไฟต้นแสง

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Serene wide view of an open Thai pavilion on an island at the foot of the golden mountain, a single calm golden flame floating above a stone basin at its center.
MIDDLE: Close shot of elderly Thai monk Phra Panya in saffron robe, shaved head, gentle lined face, wooden prayer beads, who has crossed with them, holding a small unlit clay lamp toward the great flame, the flame reflected in his calm eyes.
BOTTOM: Detail of many tiny lights flowing from the great flame across the ring seas toward the horizon like a river of fireflies, connecting to distant lamps, wonder.
```

#### rb19 · ทัพยักษ์ข้ามทะเล

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Dramatic wide view of a giant army of Thai yaksha soldiers in dark gold armour wading through the outer ring sea toward the glass bridges, banners of black cloth, storm gathering.
MIDDLE: Close shot of a glass bridge beginning to crack under the weight of a heavy demon spear planted on it, cold reflections, tension.
BOTTOM: Back-facing anonymous traveller standing at the bridge head with gentle kinnaree maiden Malai, upper body of a young Thai woman in a modest classical Thai dance costume with high golden collar and full sleeves, lower body and wings of a cream-and-gold swan, delicate pointed golden crown hovering above and young gandharva musician Thipsuwan, slim Thai youth with long hair tied high, sky-blue silk jacket and golden sash, carrying a three-stringed Thai fiddle (saw sam sai) raising his fiddle, defensive line, no battle yet.
```

#### rb20 · ทศกัณฐ์

```text
Use case: illustration-story. Asset type: production story artwork for the Thai fantasy MMORPG Ayothaya Folk Mystic. Create ONE portrait 1024x1536 story triptych with EXACTLY THREE equal horizontal cinematic panels stacked top to bottom, each panel full width 1024x512, no gutters, no borders. Each third will be cropped and displayed separately as a wide 2:1 scene. Render three distinct carefully composed shots, not three copies of one composition. Art direction: authored classic hand-painted Asian MMORPG story illustration, charming rounded young/adult Thai characters, expressive natural poses, painterly gouache textures with clean confident outlines, period Ayutthaya wooden houses and Thai clothing, cinematic light, restrained magical details. No photorealism, no glossy plastic 3D, no Western castles, no text or lettering, no UI or subtitles or watermarks. Key action in central 75% of each panel, lower 20% visually quiet for live narrative captions. If an adventurer appears, use a small anonymous back-facing traveller in simple linen, no fixed identifiable face, no class-specific weapon. Narrative is an introduction to a quest: do NOT depict the monster already slain or quest reward already won. Maintain NPC identity across all three panels. Panels:
TOP: Epic wide view of the flame pavilion under a darkening sky, a vast shadow with ten heads rising behind the golden mountain, the great flame flickering.
MIDDLE: Thotsakan from the Thai Ramakien, ten-faced demon king with green skin, layered golden crowns of faces, twenty arms holding traditional weapons, magnificent ornate Thai armour, imposing and regal, not gory.
BOTTOM: Wide shot from behind the anonymous traveller standing alone before the great flame, all allies behind in a protective arc, the flame steady again behind the traveller, no fight yet.
```

---

## แมพ · ส่วน A (สเปกเทคนิค วางทุกครั้ง ห้ามแก้)

```
ช่วยสร้างฉาก 3D ใน Blender 4.x ด้วยสคริปต์ Python (bpy) สำหรับเกม MMORPG บนเว็บ มุมกล้องเอียงมองจากด้านบน
สไตล์ "Thai folk fantasy" อบอุ่น สีอิ่มแต่ไม่จัดจ้าน แบบ low-poly ผิวเรียบ (vertex color หรือ texture เล็ก) เข้ากับตัวละครพิกเซลอาร์ต

สเปกที่ต้องทำตามทุกข้อ:
1. หน่วยเมตร แกน Z ชี้ขึ้น พื้นที่เล่น 140×140 ม. ศูนย์กลาง (0,0) คือ X และ Y อยู่ในช่วง -70 ถึง 70
   รอบนอกเขตนี้ให้มีขอบฉากปิดอีก ~20 ม. (ภูเขา ผา ป่าทึบ หรือกำแพง) ให้ดูไม่เป็นขอบโล่ง
2. พื้นที่เดินได้ต้องอยู่ที่ Z = 0 ถึง 0.6 ม. สิ่งที่สูงเกิน 0.62 ม. นับเป็นกำแพง/สิ่งกีดขวาง
   สะพาน ชานเรือน ลานยก สูงไม่เกิน 0.6 ม. และมีทางลาดขึ้น ขั้นแต่ละขั้นห้ามสูงเกิน 0.3 ม.
3. ผิวน้ำ: ชื่อ object ขึ้นต้นด้วย "Water surface" และอยู่ที่ Z = -0.3 ถึง 0
4. ของที่ตัวละครเดินทะลุได้ (หญ้า ใบไม้ กอไม้เตี้ย ดอกไม้ ตะไคร่) ตั้งชื่อ object ขึ้นต้นด้วยชื่อใดชื่อหนึ่งนี้ แล้วตามด้วย " | ชื่ออะไรก็ได้":
   "Fine meadow grass blades", "Organic understory shrubs", "Fine leafy canopy twigs", "Stone moss patches", "Wetland reed leaves"
5. จุดบังคับ (พิกัด Blender X,Y):
   - จุดเกิดผู้เล่น (0, 60)
   - ประตูกลับแมพก่อนหน้า (0, 66)
   - ประตูไปแมพถัดไป (0, -66)
   ทั้งสามจุดต้องอยู่บนทางเดินที่ต่อถึงกันหมด ทุกพื้นที่เดินได้ต้องเดินถึงกันได้ ห้ามมีเกาะที่ไปไม่ถึง
6. ทางเดินหลักกว้าง 7–10 ม. มีทางแยกวนกลับมาบรรจบกัน (ไม่ใช่เส้นเดียวตรง ๆ) และมีลานโล่งให้ต่อสู้อย่างน้อย 4 จุด กว้างอย่างน้อย 14×14 ม.
7. งบประมาณ: .glb ไม่เกิน 5 MB, รวมไม่เกิน ~250,000 สามเหลี่ยม, texture รวมไม่เกิน 2048×2048
   ของที่ซ้ำกัน (ต้นไม้ หิน ไผ่) ใช้ linked duplicates
8. ห้ามใส่กล้อง แสงไฟ ตัวละคร มอน หรือ animation (เกมใส่เอง)
9. ส่งมอบ 3 อย่าง:
   (ก) สคริปต์ Python ที่รันใน Blender แล้วสร้างฉากเสร็จ และ export เป็น <id>.glb (glTF binary, +Y up, apply modifiers)
   (ข) ไฟล์ <id>.blend
   (ค) JSON เลย์เอาต์ (พิกัด Blender X,Y) รูปแบบนี้:
   {
     "id":"<id>",
     "spawn":[0,60],
     "portals":{"<แมพก่อนหน้า>":[0,66],"<แมพถัดไป>":[0,-66]},
     "water":[[cx,cy,w,d], ...],
     "bridges":[[[ax,ay],[bx,by],width], ...],
     "roads":[[[x,y],[x,y],...,width], ...],
     "plazas":[[cx,cy,w,d], ...],
     "districts":{"ชื่อย่าน":[x,y], ...},
     "npcs":{"บทบาท NPC":[x,y], ...},
     "monsterAreas":[{"name":"...","center":[x,y],"radius":12,"level":"a-b"}, ...],
     "bossArena":[x,y,radius]
   }
```

## แมพ · ส่วน B (ทีละแมพ)

### 1. ท่าน้ำข้ามภพ
```
แมพ: ท่าน้ำข้ามภพ · id: rebirth-ferry · มอนเลเวล 1–20
แมพก่อนหน้า: ayutthaya (ท่าเรือเจ้าพระยา · เฉพาะผู้จุติ) · แมพถัดไป: rebirth-kalpa
บรรยากาศ: แม่น้ำกว้างยามพลบปกคลุมด้วยหมอกเงิน โคมดอกบัวลอยน้ำนับร้อยส่องแสงฟ้าอมทอง ท่าเรือไม้เก่า ศาลาริมน้ำ เรือนแพร้าง
จุดสำคัญ:
- ท่าเรือไม้ของยายจันทร์ใกล้จุดเกิด (ศาลาเล็ก + เรือจ้าง)
- สะพานไม้ยาวข้ามคุ้งน้ำ 2 จุด
- หมู่บ้านเรือนแพร้างกลางแมพ (ลาน ~18×14 ม.)
- ดงกกและโคมลอยเกยตื้นริมตลิ่ง
- ลานบอสท่าน้ำโบราณด้านบน (ฝั่ง -Y) วงกลม ~20 ม. มีเสาท่าเรือหักและซุ้มประตูน้ำ
- มอนในแมพ (ให้เว้นลานต่อสู้ไว้ ไม่ต้องโมเดลมอน): โคมลอยหลงภพ · ปูเงาท่าน้ำ · ผีเสื้อราตรี · กบหมอก · หัวหน้าฝูง: นางพรายริมตลิ่ง · บอส: พรายเจ้าท่า
```

### 2. ป่ากัลปพฤกษ์
```
แมพ: ป่ากัลปพฤกษ์ · id: rebirth-kalpa · มอนเลเวล 20–40
แมพก่อนหน้า: rebirth-ferry · แมพถัดไป: rebirth-gandharva
บรรยากาศ: ป่าต้นไม้ใหญ่ใบสีทองอมเขียว ผลเป็นอัญมณีและโคมห้อยระย้า ลำธารใส ดอกไม้หิมพานต์ ทุ่งหญ้าแสงลอด
จุดสำคัญ:
- ทางเข้าจากท่าน้ำ (ฝั่ง +Y) เป็นซุ้มต้นไม้โค้ง
- สระบัวกินรีกลางแมพ มีศาลาไม้ริมสระ (บ้านมาลัย)
- ต้นกัลปพฤกษ์ยักษ์ 1 ต้นเป็นจุดเด่น
- ทุ่งดอกไม้ 2 ลานสำหรับต่อสู้
- ลานบอสหน้าผาหินด้านบน (ฝั่ง -Y) มีรังนกยักษ์
- มอนในแมพ (ให้เว้นลานต่อสู้ไว้ ไม่ต้องโมเดลมอน): กวางทองลวงตา · ภมรยักษ์ · กิ่งไม้ทิพย์เดินได้ · กระรอกอัญมณี · หัวหน้าฝูง: ราชสีห์หิมพานต์หนุ่ม · บอส: นกหัสดีลิงค์
```

### 3. นครคนธรรพ์ลอยฟ้า
```
แมพ: นครคนธรรพ์ลอยฟ้า · id: rebirth-gandharva · มอนเลเวล 40–60
แมพก่อนหน้า: rebirth-kalpa · แมพถัดไป: rebirth-rahu
บรรยากาศ: เกาะลอยฟ้าเชื่อมด้วยสะพานเชือกและบันไดหิน ศาลาทรงไทยหลังคาซ้อน ทะเลเมฆด้านล่าง ระฆังลมทองห้อยทุกชายคา ลมแรงพอดี
จุดสำคัญ:
- ลานเกาะแรกที่จุดเกิด มีกระดิ่งลมใหญ่
- สะพานเชือกและบันไดหินเชื่อมเกาะ 4–5 เกาะ (ทุกเกาะเดินถึงกัน)
- หอดนตรีกลาง (ลาน ~18×14 ม.)
- สวนบนเกาะ 2 ลานต่อสู้
- ลานบอสหอระฆังใหญ่ด้านบน (ฝั่ง -Y)
- มอนในแมพ (ให้เว้นลานต่อสู้ไว้ ไม่ต้องโมเดลมอน): เมฆอสนี · ระฆังลมหลงเสียง · นกการเวกพลัดฝูง · ภูตพิณร้าว · หัวหน้าฝูง: ครุฑน้อยเฝ้าหอ · บอส: เจ้าคนธรรพ์ผู้ลืมเพลง
```

### 4. แดนอสูรราหู
```
แมพ: แดนอสูรราหู · id: rebirth-rahu · มอนเลเวล 60–80
แมพก่อนหน้า: rebirth-gandharva · แมพถัดไป: rebirth-sithandon
บรรยากาศ: ที่ราบหินภูเขาไฟสีดำแดง จันทร์ถูกบังเหลือแค่วงแหวน ลาวาเย็นเรืองส้ม เสาหินแตก ซากวิหารอสูร ลมร้อน
จุดสำคัญ:
- จุดเกิดที่ศาลาหินของนางจันทรา
- หุบลาวาเย็นที่มีสะพานหิน 2 จุด
- ซากวิหารอสูรกลางแมพ (ลาน ~18×14 ม.)
- ทุ่งเสาหินแตก 2 ลานต่อสู้
- ลานบอสหลุมอุกกาบาตด้านบน (ฝั่ง -Y) วงกลม ~22 ม.
- มอนในแมพ (ให้เว้นลานต่อสู้ไว้ ไม่ต้องโมเดลมอน): อสูรหินดำ · หมาไฟหางเพลิง · งูเงาจันทร์ · ค้างคาวอุปราคา · หัวหน้าฝูง: ทหารอสูรถือกระบอง · บอส: ราหูอมจันทร์
```

### 5. ฝั่งทะเลสีทันดร
```
แมพ: ฝั่งทะเลสีทันดร · id: rebirth-sithandon · มอนเลเวล 80–99
แมพก่อนหน้า: rebirth-rahu · แมพถัดไป: —
บรรยากาศ: ทะเลวงแหวนเจ็ดชั้นสีฟ้าใส เกาะหินทองระหว่างวงแหวน ภูเขาทองสูงเสียดฟ้าเป็นฉากหลัง สะพานแก้ว ศาลาไฟต้นแสง แสงทองยามเช้า
จุดสำคัญ:
- จุดเกิดที่ท่าเรือทองริมวงแหวนแรก (ยายจันทร์รอส่ง)
- สะพานแก้วข้ามวงแหวนน้ำ 3 จุด
- เกาะศาลากลาง (ลาน ~18×14 ม.) NPC ทุกตัวมารวมกัน
- เกาะหิน 2 ลานต่อสู้
- ลานบอสศาลาไฟต้นแสงด้านบน (ฝั่ง -Y) วงกลม ~24 ม. มีเปลวไฟทองกลางลาน
- มอนในแมพ (ให้เว้นลานต่อสู้ไว้ ไม่ต้องโมเดลมอน): ทหารยักษ์สิบหน้า (บริวารทศกัณฐ์) · ม้าทะเลสีทันดร · ปลาอานนท์น้อย · เงาประทีปดับ · หัวหน้าฝูง: ขุนยักษ์ถือทวน · บอส: ทศกัณฐ์ (ร่างจริง)
```

---

## PvP สำหรับจุติ 4 ขึ้นไป (เจ้าของเกมตกลงแล้ว 2026-10-28 · ทำตอนต่อแมพภาคจุติเข้าเกม)

- ไม่เปิด PvP ทุกแมพ: คนจุติ 4+ แข็งกว่าคนทั่วไปมาก ถ้าตีได้ทุกที่ คนใหม่และคนเก็บเลเวลจะโดนไล่ฆ่า
- **ใครตีได้:** จุติ 4+ ตีได้เฉพาะจุติ 4+ ด้วยกันเท่านั้น คนจุติไม่ถึง 4 ตีไม่ได้และไม่โดนตี
- **ที่ไหน:** เฉพาะแมพภาคจุติบทที่ 4–5 (\`rebirth-rahu\`, \`rebirth-sithandon\`)
- **ตายแล้ว:** ไม่เสียของและไม่เสีย EXP (ต่างจากตายเพราะมอน)
- **ปุ่มเปิด/ปิดโหมดสู้:** ต้องเปิดทั้งสองฝ่ายถึงจะตีกันได้ (opt-in) มีเวลาหน่วงตอนปิด กันกดปิดหนีกลางไฟต์
