# Ayothaya Online · ท่าทางตัวละครรายสกิล (prompt สำหรับเจนภาพ)

สร้างจาก `assets/skills-next/catalog.js` · 98 สกิลกดใช้ (อาชีพ + Master) · 1 ชีตต่อ 1 สกิล

ตอนนี้แต่ละอาชีพมีท่าแอ็กชันแค่ 12 ท่า (เฟรม 0–11 ใน `assets/animation37`) ทุกสกิลของอาชีพเดียวกันจึงใช้ท่าซ้ำกัน ชีตชุดนี้ทำให้ทุกสกิลมีท่าของตัวเอง

## รูปแบบชีต (เหมือนกันทุก prompt)

- ผ้าใบ **1920 × 640** PNG พื้นโปร่งใส **6 คอลัมน์ × 2 แถว** ช่องละ **320 × 320**
- แถว 1 = ชาย, แถว 2 = หญิง ชุดเหมือนภาพอ้างอิงของอาชีพ (`assets/animation37/<อาชีพ>.png` หรือ `<อาชีพ>-male.png` / `<อาชีพ>-female.png`) **แนบภาพอ้างอิงทุกครั้ง**
- มุมข้าง หันขวา สัดส่วนชิบิเท่าภาพอ้างอิง เท้าอยู่ที่เส้นเดียวกัน (**y = 276** ของแต่ละช่อง) ตัวอยู่ในช่องครบพร้อมขอบว่าง ไม่มีเงาพื้น ไม่มีเอฟเฟกต์ ไม่มีตัวอักษร
- เฟรมซ้ายไปขวา: **0 เตรียม → 1 ง้าง → 2 ปล่อย → 3 ปะทะ/พีก (โชว์ตรงจังหวะดาเมจจริง) → 4 ตามแรง → 5 คืนท่า**
- เกมจับจังหวะจาก hit จริงของเซิร์ฟเวอร์: เฟรม 3 ตรงจังหวะโดน, 0–2 กระจายในช่วงง้าง/ร่าย, 4–5 ช่วงคืนท่าสั้นๆ ความเร็วโจมตีสูงหรือร่ายเร็วขึ้นท่าก็เล่นเร็วตาม สกิลหลายฮิตวน 2→3 ทุกฮิต
- ตั้งชื่อไฟล์ตามคอลัมน์ "ไฟล์" แล้ววางใน `assets/skills-next/poses-2026-10/`

## Prompt template (ภาษาอังกฤษ ใส่ ACTION ของแต่ละสกิลแทน «action»)

> Production 2D hand-painted chibi character sprite sheet for a Thai Ayutthaya folk-fantasy MMORPG, matching the attached character reference exactly (same face, costume, colours, weapon, proportions, line weight and painterly shading). 1920x640 transparent PNG, 6 columns x 2 rows of 320x320 cells, row 1 the male version, row 2 the female version, side view facing right, feet on the same baseline in every cell, no shadow, no VFX, no text, no grid lines. Six-frame action, left to right: anticipation, wind-up, release, contact/peak, follow-through, recover. ACTION: «action». Strong readable silhouette at small size, clear weight shift; the contact frame is the most extended pose.

## นักดาบ (swordsman)

| สกิล | id | ไฟล์ | ACTION |
|---|---|---|---|
| ฟันเปิดทาง · อาชีพ | `sword-open` | `pose-sword-open.png` | a heavy committed overhead-to-diagonal strike that drives through the target (ฟันเปิดทาง ทำดาเมจและลดเกราะเป้าชั่วคราว) |
| คำรามท้าศึก · อาชีพ | `sword-roar` | `pose-sword-roar.png` | a wide chest-out war cry, weapon raised high, other hand beckoning enemies (ดึงศัตรูรอบตัวให้หันมาตีเรา) |
| โล่รับคม · อาชีพ | `sword-shield` | `pose-sword-shield.png` | a low braced stance behind the shield or forearms, weight on the back foot (กันดาเมจจากด้านหน้า ต้องหันรับให้ถูกทิศ) |
| ดาบกวาดวง · อาชีพ | `sword-cleave` | `pose-sword-cleave.png` | a full horizontal 360 degree spinning sweep, body twisting from the hips (หมุนดาบกวาดศัตรูรอบตัว) |
| ก้าวคุ้มกัน · อาชีพ | `sword-cover` | `pose-sword-cover.png` | a lunging side-step dash to shield an ally, shield or arm thrown out (พุ่งไปหาเพื่อน แล้วรับดาเมจแทนชั่วคราว) |
| ★ ดาบอาญาสิทธิ์ · อาชีพ | `sword-royal` | `pose-sword-royal.png` | a long forward thrust or beam release, whole body extended in one line toward the target; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ชาร์จแล้วฟาดคลื่นดาบทองเป็นแนวยาว) |
| เขตพิทักษ์ · ขุนดาบพิทักษ์ | `guard-bastion` | `pose-guard-bastion.png` | planting the weapon or palms into the ground to raise a protective circle (วางเขต เพื่อนในเขตโดนตีเบาลง) |
| สายใยโล่ · ขุนดาบพิทักษ์ | `guard-link` | `pose-guard-link.png` | one arm extended to an ally with a glowing thread, other arm guarding (ผูกเพื่อน 1 คน รับดาเมจแทนบางส่วน) |
| ดึงศัตรู · ขุนดาบพิทักษ์ | `guard-hook` | `pose-guard-hook.png` | a hooking throw then a hard backward yank with both arms (เกี่ยวศัตรูมาหน้าเรา บอสเสียหลักแทน) |
| ★ กำแพงกรุงศรี · ขุนดาบพิทักษ์ | `guard-wall` | `pose-guard-wall.png` | both arms crossed then thrown open to raise a wall or seal in front; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ทั้งปาร์ตี้ในวงได้โล่ใหญ่และสะท้อนแรง) |
| ดาบสวนวายุ · ขุนดาบทะลวง | `duel-riposte` | `pose-duel-riposte.png` | a parry deflect then an instant counter-cut (ตั้งรับแล้วสวนหนัก ขัดท่าศัตรูที่กำลังร่าย) |
| ตราดาบทะลวง · ขุนดาบทะลวง | `duel-brand` | `pose-duel-brand.png` | a precise marking slash then pointing at the target (ติดตราให้เป้ารับดาเมจเพิ่ม) |
| พุ่งฟันพายุ · ขุนดาบทะลวง | `duel-storm` | `pose-duel-storm.png` | a long forward thrust or beam release, whole body extended in one line toward the target (พุ่งฟันทุกตัวในแนว) |
| ★ กากบาทพิฆาต · ขุนดาบทะลวง | `duel-cross` | `pose-duel-cross.png` | a crouched, coiled finishing blow: rise and drive the blade down through the target; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ฟันกากบาท แรงสองเท่ากับเป้า HP ต่ำ) |

## นักทวน (lancer)

| สกิล | id | ไฟล์ | ACTION |
|---|---|---|---|
| แทงทะลุแนว · อาชีพ | `lance-pierce` | `pose-lance-pierce.png` | a long forward thrust or beam release, whole body extended in one line toward the target (แทงโดนทุกตัวในแนวเส้น) |
| กวาดทวนผลัก · อาชีพ | `lance-sweep` | `pose-lance-sweep.png` | a wide sweeping shove with the weapon shaft, knocking enemies back (กวาดทวนผลักศัตรูออก) |
| ปลายทวนสกัด · อาชีพ | `lance-check` | `pose-lance-check.png` | a sharp short jab, clinch or headbutt aimed at the head to stop a cast (ขัดการร่ายและตรึงเป้า) |
| เขตปลายทวน · อาชีพ | `lance-zone` | `pose-lance-zone.png` | drawing a circle on the ground with the weapon tip, then planting it (วางเขต ศัตรูในวงเดินช้าและโดนทวนเป็นระยะ) |
| ย่างเท้ารักษาระยะ · อาชีพ | `lance-step` | `pose-lance-step.png` | a light backward or sidestep hop, body low, ready to strike again (ถอยหลังและหลบหลีกชั่วคราว) |
| ★ ทวนพญานาคทะลวงฟ้า · อาชีพ | `lance-naga` | `pose-lance-naga.png` | a spiralling charging thrust, spear or body corkscrewing forward; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ขว้างทวนพญานาคทะลุแนวยาวและลดเกราะ) |
| กำแพงทวน · ขุนทวนหลวง | `van-wall` | `pose-van-wall.png` | stamping the spear butt down so a wall of spears rises in front (ปักแนวทวนกั้นทาง ทำดาเมจและหยุดศัตรู) |
| ทวนเกี่ยวกลับ · ขุนทวนหลวง | `van-hook` | `pose-van-hook.png` | a hooking throw then a hard backward yank with both arms (เกี่ยวศัตรูไกลมาหน้าเรา) |
| กระบวนทวน · ขุนทวนหลวง | `van-phalanx` | `pose-van-phalanx.png` | a formation stance, spear levelled forward, body fully braced (แทงทะลวงพร้อมให้โล่เพื่อนรอบตัว) |
| ★ ค่ายกลทวนพันเล่ม · ขุนทวนหลวง | `van-array` | `pose-van-array.png` | a leaping skyward strike calling a storm of weapons, landing in a crouch; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ทวนพุ่งขึ้นจากพื้นหลายระลอกในวงใหญ่) |
| ทวนพญานาค · ทวนศึก | `war-drill` | `pose-war-drill.png` | a spiralling charging thrust, spear or body corkscrewing forward (หมุนทวนเจาะแนวเส้นและลดเกราะ) |
| แทงทะลุขบวน · ทวนศึก | `war-chain` | `pose-war-chain.png` | a chained series of three thrusts down one line (แทงแนวยาว แรงขึ้นตามจำนวนศัตรูในแนว) |
| กระโดดทวน · ทวนศึก | `war-leap` | `pose-war-leap.png` | leaping or raising both hands to the sky, then smashing down as the attack falls from above (กระโดดทิ่มทวนลงพื้นที่) |
| ★ ดาวทวนถล่ม · ทวนศึก | `war-stars` | `pose-war-stars.png` | a leaping skyward strike calling a storm of weapons, landing in a crouch; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ทวนไฟตกจากฟ้าหลายระลอกในวงกว้าง) |

## นายพราน (hunter)

| สกิล | id | ไฟล์ | ACTION |
|---|---|---|---|
| ศรเจาะจุด · อาชีพ | `hunt-shot` | `pose-hunt-shot.png` | a heavy committed overhead-to-diagonal strike that drives through the target (ยิงศรเจาะเกราะเป้าเดียว) |
| หมายตาพราน · อาชีพ | `hunt-mark` | `pose-hunt-mark.png` | drawing the bow slowly while one eye sights the target (ตีตราให้ทั้งทีมทำดาเมจใส่เป้านี้เพิ่ม) |
| บ่วงเถาวัลย์ · อาชีพ | `hunt-snare` | `pose-hunt-snare.png` | kneeling to set a vine snare on the ground, then stepping back (วางบ่วงตรึงศัตรูที่เหยียบ) |
| ฝนศร · อาชีพ | `hunt-rain` | `pose-hunt-rain.png` | drawing the bow almost vertically and loosing high into the sky (ยิงศรลงวงพื้นที่หลายระลอก) |
| ศรถอยพง · อาชีพ | `hunt-retreat` | `pose-hunt-retreat.png` | a backward jump while turning to loose an arrow mid-air (ยิงแล้วกระโดดถอยออก) |
| ★ ศรพระราม · อาชีพ | `hunt-rama` | `pose-hunt-rama.png` | a long forward thrust or beam release, whole body extended in one line toward the target; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ง้างศรเทพยิงทะลุแนวยาวสุดลูกหูลูกตา) |
| ศรแตกแขนง · พรานไพร | `rang-fan` | `pose-rang-fan.png` | loosing a fanned volley, bow sweeping across (ยิงพัดกว้างด้านหน้า) |
| ซุ่มยิงพงไพร · พรานไพร | `rang-ambush` | `pose-rang-ambush.png` | crouched in hiding, then a sudden full-draw shot (พรางตัวแล้วเปิดยิงหนัก) |
| ดงหนามพราน · พรานไพร | `rang-thorns` | `pose-rang-thorns.png` | slamming a palm on the ground so thorn vines burst forward (วางดงหนามทำดาเมจต่อเนื่องและชะลอ) |
| ★ ห่าศรหิมพานต์ · พรานไพร | `rang-storm` | `pose-rang-storm.png` | drawing the bow almost vertically and loosing high into the sky; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ศรตกเป็นห่าฝนในวงใหญ่) |
| ฝูงจิกวิญญาณ · พรานอาคม | `spirit-flock` | `pose-spirit-flock.png` | a low crouch exploding into a rising uppercut or rising summon (ส่งฝูงไก่วิญญาณจิกเป็นวง ขัดท่าศัตรู) |
| ขันปลุกขวัญ · พรานอาคม | `spirit-crow` | `pose-spirit-crow.png` | raising an arm to rally allies, a confident encouraging shout (ไก่ขันเพิ่มดาเมจทีมชั่วคราว) |
| ไก่ชนจิกตา · พรานอาคม | `spirit-peck` | `pose-spirit-peck.png` | a sharp short jab, clinch or headbutt aimed at the head to stop a cast (ไก่กระโจนจิกเป้า ขัดท่าและทำให้มึนงง) |
| ★ ไก่ชนหิมพานต์ · พรานอาคม | `spirit-giant` | `pose-spirit-giant.png` | a long two-handed invocation, arms rising as a giant spirit beast appears; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · เรียกไก่ชนยักษ์ทองคำมาช่วยสู้) |

## นักมวย (boxer)

| สกิล | id | ไฟล์ | ACTION |
|---|---|---|---|
| หมัดนำ · อาชีพ | `box-jab` | `pose-box-jab.png` | a fast straight lead punch, shoulder rolling forward, rear hand guarding the chin (หมัดเร็วสะสมจังหวะมวย) |
| เข่าลอยพุ่ง · อาชีพ | `box-knee-dash` | `pose-box-knee-dash.png` | a running jump into a flying knee, landing on the target (พุ่งเข่าเข้าหาเป้าและขัดจังหวะ) |
| จับคอเข่าลอย · อาชีพ | `box-clinch` | `pose-box-clinch.png` | a sharp short jab, clinch or headbutt aimed at the head to stop a cast (จับล็อกคอแล้วตีเข่า เป้าขยับไม่ได้ชั่วครู่) |
| ศอกกลับหลัง · อาชีพ | `box-elbow` | `pose-box-elbow.png` | a full horizontal 360 degree spinning sweep, body twisting from the hips (หมุนศอกรอบตัว ขัดการร่ายทุกตัวในวง) |
| ย่างสามขุม · อาชีพ | `box-triangle` | `pose-box-triangle.png` | a light backward or sidestep hop, body low, ready to strike again (ย่างหลบดาเมจทั้งหมดชั่วครู่) |
| ★ หนุมานถวายแหวน · อาชีพ | `box-hanuman` | `pose-box-hanuman.png` | a final rising monkey-king combination ending in a big two-fisted finish; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · อัปเปอร์คัตหนุมาน ยิ่งสะสมจังหวะยิ่งแรง) |
| แม่ไม้ต่อเนื่อง · ครูมวย | `mb-maemai` | `pose-mb-maemai.png` | a rapid flowing chain of punches, elbows and knees (ชุดท่าต่อเนื่อง เติมจังหวะมวยเต็ม) |
| เข่าเหินเวหา · ครูมวย | `mb-flying-knee` | `pose-mb-flying-knee.png` | a running jump into a flying knee, landing on the target (กระโดดเข่าจากระยะไกลลงใส่เป้า) |
| มวยคาดเชือก · ครูมวย | `mb-headband` | `pose-mb-headband.png` | raising an arm to rally allies, a confident encouraging shout (ปลุกใจ ทีมทำดาเมจแรงขึ้นชั่วคราว) |
| ★ หนุมานประสานหมัด · ครูมวย | `mb-barrage` | `pose-mb-barrage.png` | a flurry of rapid punches in place, arms blurring; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ร่างหนุมานรัวหมัดใส่เป้าเดียว) |
| กายคงกระพัน · มวยคงกระพัน | `ib-stone` | `pose-ib-stone.png` | a low braced stance behind the shield or forearms, weight on the back foot (ตั้งกายรับดาเมจลดลงมากชั่วคราว) |
| ปักหลักรับศึก · มวยคงกระพัน | `ib-anchor` | `pose-ib-anchor.png` | a deep rooted horse stance, fists at hips, unmovable (ยั่วศัตรูรอบตัวพร้อมได้โล่) |
| โขกศีรษะ · มวยคงกระพัน | `ib-headbutt` | `pose-ib-headbutt.png` | a sharp short jab, clinch or headbutt aimed at the head to stop a cast (โขกหัวเป้า ขัดท่าและทำให้มึนงง) |
| ★ หมัดสะท้อนภูผา · มวยคงกระพัน | `ib-mountain` | `pose-ib-mountain.png` | absorbing a blow then hitting back with a mountain-heavy straight punch; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ตั้งรับแล้วปล่อยหมัดภูผาสวนกลับ) |

## จอมโจร / มีดคู่ (rogue)

| สกิล | id | ไฟล์ | ACTION |
|---|---|---|---|
| มีดคู่เฉือน · อาชีพ | `rogue-slash` | `pose-rogue-slash.png` | a quick twin-dagger double slash, body low and close (ฟันมีดคู่เร็ว แรงขึ้นมากถ้าออกจากพรางตัว) |
| พรางเงา · อาชีพ | `rogue-stealth` | `pose-rogue-stealth.png` | pulling the scarf over the face and fading into a crouch (พรางตัว การโจมตีถัดไปแรงขึ้น) |
| มีดเงาทะลวง · อาชีพ | `rogue-shadowstab` | `pose-rogue-shadowstab.png` | a quick twin-dagger double slash, body low and close (วาร์ปไปหลังเป้าแล้วแทง) |
| มีดอาบพิษ · อาชีพ | `rogue-poison` | `pose-rogue-poison.png` | drawing a dagger along a vial so it drips with venom (ทำให้เป้าติดพิษ) |
| ควันพรางทาง · อาชีพ | `rogue-smoke` | `pose-rogue-smoke.png` | throwing a smoke bomb down at the feet (กางควันให้เพื่อนในวงหลบหลีกเพิ่ม) |
| ★ มีดปิดชีพ · อาชีพ | `rogue-execute` | `pose-rogue-execute.png` | a crouched, coiled finishing blow: rise and drive the blade down through the target; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ฟันรวดเดียว แรงสองเท่ากับเป้า HP ต่ำ) |
| เงาแยกร่าง · โจรเงา | `shade-clones` | `pose-shade-clones.png` | a spinning flourish splitting into shadow copies (สร้างร่างเงาล่อศัตรูพร้อมพรางตัว) |
| ม่านเงาคุ้มกัน · โจรเงา | `shade-curtain` | `pose-shade-curtain.png` | throwing a smoke bomb down at the feet (ม่านเงาให้ทีมหลบหลีกเพิ่ม) |
| สลับเงา · โจรเงา | `shade-swap` | `pose-shade-swap.png` | a light backward or sidestep hop, body low, ready to strike again (ถอยหลบด้วยเงาและหลบหลีกชั่วคราว) |
| ★ จู่โจมจันทรา · โจรเงา | `shade-moonfall` | `pose-shade-moonfall.png` | a low crouch exploding into a rising uppercut or rising summon; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ฟ้ามืด วาร์ปฟันศัตรูทุกตัวในวงใหญ่) |
| คมมีดพิษอาคม · มือมีดอาคม | `venom-edge` | `pose-venom-edge.png` | a quick venom-coated stab and pull-back (พิษแรงต่อเนื่องบนเป้า) |
| พิษระเบิดจุดตาย · มือมีดอาคม | `venom-pop` | `pose-venom-pop.png` | a snap of the fingers detonating poison on the target (ระเบิดพิษที่เหลือบนเป้าเป็นดาเมจ) |
| เฉือนเอ็น · มือมีดอาคม | `venom-hamstring` | `pose-venom-hamstring.png` | a low sweeping slash at the legs (ทำดาเมจและลดความเร็วเป้า) |
| ★ มีดดับตะวัน · มือมีดอาคม | `venom-sunset` | `pose-venom-sunset.png` | a crouched, coiled finishing blow: rise and drive the blade down through the target; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ฟันจันทร์เสี้ยว แรงสองเท่ากับเป้า HP ต่ำ) |

## หมอผี (shaman)

| สกิล | id | ไฟล์ | ACTION |
|---|---|---|---|
| ลูกไฟผีพราย · อาชีพ | `sham-ghostfire` | `pose-sham-ghostfire.png` | thrusting a palm forward to send a glowing orb or flame (ยิงลูกไฟวิญญาณ แรงขึ้นกับเป้าที่ติดคำสาป) |
| ผูกคำสาป · อาชีพ | `sham-curse` | `pose-sham-curse.png` | pointing two fingers and drawing a curse sigil in the air (สาปเป้า ทำดาเมจเบาและเตรียมระเบิดอาคม) |
| ด้ายตรึงวิญญาณ · อาชีพ | `sham-thread` | `pose-sham-thread.png` | pulling taut a glowing thread between both hands toward the target (ผูกด้ายตรึงเป้า) |
| หมอกผีพราย · อาชีพ | `sham-mist` | `pose-sham-mist.png` | drawing a circle on the ground with the weapon tip, then planting it (หมอกวิญญาณในวงกว้าง ทำดาเมจต่อเนื่องและชะลอ) |
| ยันต์ระเบิด · อาชีพ | `sham-talisman` | `pose-sham-talisman.png` | tossing a yantra talisman to the ground in front (วางยันต์ ระเบิดเมื่อศัตรูเข้าวง) |
| ★ พญานาคตกฟ้า · อาชีพ | `sham-naga` | `pose-sham-naga.png` | leaping or raising both hands to the sky, then smashing down as the attack falls from above; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · วงเตือนแล้วพญานาคฟาดลงมาในวงใหญ่) |
| จ้าวพรายพิทักษ์ · จ้าววิญญาณ | `sm-lord` | `pose-sm-lord.png` | arms spread, summoning a towering spirit lord behind (เรียกพรายใหญ่ช่วยยิงและให้โล่เจ้าของ) |
| พันธนาการวิญญาณ · จ้าววิญญาณ | `sm-chains` | `pose-sm-chains.png` | both hands clenching shut as chains erupt from the ground (มัดศัตรูเป็นกลุ่ม) |
| ผีพรายดูดชีพ · จ้าววิญญาณ | `sm-drain` | `pose-sm-drain.png` | drawing life in with both hands pulled toward the chest (คลื่นวิญญาณรอบเป้า ทำดาเมจและชะลอ) |
| ★ คลื่นพรายร้อยตน · จ้าววิญญาณ | `sm-hundred` | `pose-sm-hundred.png` | sweeping both arms forward to release a wave of ghosts; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · คลื่นผีร้อยตน แรงขึ้นกับเป้าติดคำสาป) |
| ยันต์คู่คุ้มภัย · อาจารย์อาคม | `ym-seals` | `pose-ym-seals.png` | both arms crossed then thrown open to raise a wall or seal in front (มอบโล่ให้เพื่อนในวง พร้อมสะท้อนแรง) |
| อาคมย้อนเคราะห์ · อาจารย์อาคม | `ym-reverse` | `pose-ym-reverse.png` | raising a palm or talisman shield that turns the blow back (ให้เพื่อนสะท้อนดาเมจและได้โล่ชั่วคราว) |
| ยันต์ใบ้ · อาจารย์อาคม | `ym-silence` | `pose-ym-silence.png` | pulling taut a glowing thread between both hands toward the target (แปะยันต์ตรึงเป้า) |
| ★ มหาวงนวหรคุณ · อาจารย์อาคม | `ym-great` | `pose-ym-great.png` | drawing a giant nine-sigil yantra circle in the air then pressing it to the ground; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · วงยันต์ใหญ่ลดดาเมจทีมและชะลอศัตรู) |

## พระ / แม่ชี (acolyte)

| สกิล | id | ไฟล์ | ACTION |
|---|---|---|---|
| ธรรมประทีป · อาชีพ | `aco-light` | `pose-aco-light.png` | thrusting a palm forward to send a glowing orb or flame (ลูกแสงธรรม แรงขึ้นกับศัตรูที่ติดคำสาป) |
| ปันขวัญเมตตา · อาชีพ | `aco-heal` | `pose-aco-heal.png` | pressing a glowing palm toward an ally with calm focus (ฮีลเพื่อนที่เลือก) |
| พรพุทธคุณ · อาชีพ | `aco-blessing` | `pose-aco-blessing.png` | raising an arm to rally allies, a confident encouraging shout (บัฟทีมรอบตัวให้ทำดาเมจแรงขึ้น) |
| ชำระอาถรรพ์ · อาชีพ | `aco-cleanse` | `pose-aco-cleanse.png` | a sweeping purifying gesture with holy water or palm (ล้างพิษ คำสาป และตรึงจากเพื่อน) |
| คืนขวัญ · อาชีพ | `aco-revive` | `pose-aco-revive.png` | kneeling in prayer, palms together, then raising them upward (ร่ายชุบเพื่อนที่หมดแรง) |
| ★ เขตพุทธคุณ · อาชีพ | `aco-field` | `pose-aco-field.png` | planting the weapon or palms into the ground to raise a protective circle; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · โดมทองลดดาเมจทีมในวงใหญ่) |
| มหาบัวฟื้นฟู · ผู้บำเพ็ญเมตตา | `heal-lotus` | `pose-heal-lotus.png` | raising both palms as a lotus blooms around the party (ฮีลเพื่อนทุกคนในวงและล้างพิษ) |
| พรเร่งฝีเท้า · ผู้บำเพ็ญเมตตา | `heal-swift` | `pose-heal-swift.png` | raising an arm to rally allies, a confident encouraging shout (บัฟทีมรอบตัวให้ทำดาเมจแรงขึ้น) |
| โล่ศีลห้า · ผู้บำเพ็ญเมตตา | `heal-shield` | `pose-heal-shield.png` | raising a palm or talisman shield that turns the blow back (มอบโล่ให้เพื่อน 1 คน) |
| ★ ต้นบุญคืนชีพ · ผู้บำเพ็ญเมตตา | `heal-tree` | `pose-heal-tree.png` | kneeling and planting a sacred seed that grows into a radiant tree; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ต้นโพธิ์ทองฟื้น HP ทีมต่อเนื่อง) |
| เพลิงธรรม · ผู้พิทักษ์ธรรม | `ward-flame` | `pose-ward-flame.png` | pressing a palm down so sacred fire spreads in a circle (เพลิงธรรมบนพื้น ดาเมจต่อเนื่อง) |
| ธรรมตัดอาถรรพ์ · ผู้พิทักษ์ธรรม | `ward-cut` | `pose-ward-cut.png` | a firm forward palm strike that cuts away curses (ล้างสถานะเพื่อนในวงพร้อมทำดาเมจศัตรูใกล้ ๆ) |
| เขตธรรมพิทักษ์ · ผู้พิทักษ์ธรรม | `ward-dome` | `pose-ward-dome.png` | planting the weapon or palms into the ground to raise a protective circle (โดมคุ้มครองลดดาเมจเพื่อนในวง) |
| ★ ฝนธรรมปราบมาร · ผู้พิทักษ์ธรรม | `ward-rain` | `pose-ward-rain.png` | leaping or raising both hands to the sky, then smashing down as the attack falls from above; this is the ULTIMATE: the most dramatic, wide and powerful pose of the class, with a held peak (ไม้ตาย · ลำแสงทองตกจากฟ้าในวงใหญ่) |
