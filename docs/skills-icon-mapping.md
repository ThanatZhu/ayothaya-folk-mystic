# จับคู่ไอคอนสกิลชุดใหม่กับสกิลในเกม (0.118)

- รูปทั้งหมดอยู่ที่ `assets/skills-next/rework-icons-2026-10-26/icons/` ใช้ไฟล์แยก 256 × 256 ไม่ใช้ `raw/`
- การจับคู่อยู่ใน `assets/skills-next/rework-icon-map.js` จับตามหน้าที่ของสกิล ไม่ได้ดูจากเลขช่อง
- ทุกหน้าที่แสดงสกิลใช้ภาพเดียวกัน เพราะวาดผ่าน `paintIcon` (สกิลอาชีพ) และ `applySkillArt` (ผู้ฝึกตน) ได้แก่ หน้าต่างสกิล ปุ่มลัดบนคอม วงล้อสกิลบนมือถือ หน้าตั้งค่า Auto และหน้าทดลองสกิล
- ไม่ได้แก้ดาเมจ คูลดาวน์ เงื่อนไขปลดล็อก หรือระบบต่อสู้

## สรุป

| | จำนวน |
|---|---|
| สกิลในเกมที่ได้ภาพใหม่ | 102 จาก 112 สกิล และผู้ฝึกตน 3 จาก 3 |
| สกิลในเกมที่ยังใช้ภาพเดิม | 10 สกิล (ไม่มีภาพใหม่ที่ความหมายตรงกัน) |
| ภาพใหม่ที่ยังไม่มีสกิลในเกม | 60 ภาพ (รอสกิลตามแผนใน docs/skills-rework-proposal.md) |

## สกิลที่ยังใช้ภาพเดิม และเหตุผล

| สกิล | เหตุผล |
|---|---|
| นักดาบ · ตั้งรับสวนคม (counter) | ภาพสวนดาบ (r3-c1) เป็นของดาบสวนวายุ ส่วนภาพสวนอัตโนมัติ (r4-c3) เป็นสกิลติดตัว ใช้กับปุ่มกดไม่ได้ |
| นักดาบ · ยืนหยัดสุดท้าย (last-stand) | ภาพชื่อเดียวกัน (r2-c5) เป็นภาพสกิลติดตัว แต่ในเกมตัวนี้เป็นสกิลกดใช้ |
| นักทวน · ทวนดาวตก (sky-spear) | ภาพทวนตกจากฟ้า (r3-c4) เป็นของดาวทวนถล่ม และไม้ตายใหม่ (r1-c6) เป็นการพุ่งเป็นแนว ความหมายไม่ตรง |
| นักทวน · แนวสกัดหลวง (long-wall) | ชื่อตรงกับ r2-c5 แต่ภาพเป็นการผลักศัตรู ส่วนในเกมสกิลนี้คือขยายเขตทวน |
| นายพราน · เรียกไก่ชน (rooster) | ภาพไก่ชนตัวเล็ก (r4-c3) เป็นภาพสกิลติดตัว และไก่ยักษ์ (r3-c4) เป็นของไก่ชนหิมพานต์ |
| นักมวย · ปัดป้องสวนหมัด (parry) | ไม่มีภาพปัดป้องแล้วสวนในชุดใหม่ |
| หมอผี · พรายคุ้มกาย (spirit) | ภาพพรายพิทักษ์ (r2-c1) ใช้กับจ้าวพรายพิทักษ์แล้ว |
| หมอผี · ถอนคำสาปแตก (curse-burst) | ภาพคำสาปกระโดด (r4-c3) เป็นภาพสกิลติดตัว |
| พระ / แม่ชี · บัวฟื้นฟู (regen) | ภาพบัวใหญ่ (r2-c1) ใช้กับมหาบัวฟื้นฟูแล้ว |
| พระ / แม่ชี · คืนขวัญมหาเมตตา (great-revive) | ภาพต้นบุญ (r2-c4) ใช้กับต้นบุญคืนชีพแล้ว |

## ภาพใหม่ที่ยังไม่มีสกิลในเกม (60 ภาพ)

ส่วนใหญ่เป็นไม้ตาย สกิลติดตัวใหม่ และสกิลที่เพิ่มในแผนปรับสกิล จะได้ใช้ตอนเขียนระบบสกิลใหม่

- novice-r1-c4.png (ultimate)
- swordsman-r1-c6.png (ultimate)
- swordsman-r2-c3.png (active)
- swordsman-r2-c4.png (ultimate)
- swordsman-r2-c5.png (passive)
- swordsman-r3-c3.png (active)
- swordsman-r4-c1.png (passive)
- swordsman-r4-c3.png (passive)
- swordsman-r4-c4.png (passive)
- swordsman-r4-c5.png (passive)
- lancer-r1-c6.png (ultimate)
- lancer-r2-c4.png (ultimate)
- lancer-r2-c5.png (passive)
- lancer-r2-c6.png (passive)
- lancer-r3-c3.png (active)
- lancer-r3-c5.png (passive)
- lancer-r3-c6.png (passive)
- lancer-r4-c1.png (passive)
- lancer-r4-c4.png (passive)
- hunter-r1-c1.png (active)
- hunter-r1-c6.png (ultimate)
- hunter-r2-c4.png (ultimate)
- hunter-r2-c5.png (passive)
- hunter-r2-c6.png (passive)
- hunter-r4-c3.png (passive)
- hunter-r4-c4.png (passive)
- hunter-r4-c5.png (passive)
- boxer-r1-c2.png (active)
- boxer-r2-c3.png (active)
- boxer-r2-c5.png (passive)
- boxer-r2-c6.png (passive)
- boxer-r3-c3.png (active)
- boxer-r4-c3.png (passive)
- boxer-r4-c4.png (passive)
- boxer-r4-c5.png (passive)
- rogue-r1-c1.png (active)
- rogue-r2-c3.png (active)
- rogue-r2-c6.png (passive)
- rogue-r4-c2.png (passive)
- rogue-r4-c3.png (passive)
- rogue-r4-c4.png (passive)
- rogue-r4-c5.png (passive)
- shaman-r1-c1.png (active)
- shaman-r1-c6.png (ultimate)
- shaman-r2-c3.png (active)
- shaman-r2-c6.png (passive)
- shaman-r3-c3.png (active)
- shaman-r4-c2.png (passive)
- shaman-r4-c3.png (passive)
- shaman-r4-c4.png (passive)
- shaman-r4-c5.png (passive)
- acolyte-r1-c3.png (active)
- acolyte-r2-c2.png (active)
- acolyte-r2-c3.png (active)
- acolyte-r2-c6.png (passive)
- acolyte-r3-c4.png (ultimate)
- acolyte-r4-c2.png (passive)
- acolyte-r4-c3.png (passive)
- acolyte-r4-c4.png (passive)
- acolyte-r4-c5.png (passive)
## ตารางจับคู่ทั้งหมด

| อาชีพ | สกิลในเกม (id) | ไอคอนใหม่ |
|---|---|---|
| นักดาบ | คำรามท้าศึก (challenge) | swordsman-r1-c2.png |
| นักดาบ | โล่รับคม (guard) | swordsman-r1-c3.png |
| นักดาบ | ก้าวคุ้มกัน (intercept) | swordsman-r1-c5.png |
| นักดาบ | ดาบกวาดวง (cleave) | swordsman-r1-c4.png |
| นักดาบ | ผ่าเกราะ (break) | swordsman-r1-c1.png |
| นักดาบ | ตั้งรับสวนคม (counter) | **ยังใช้ภาพเดิม** |
| นักดาบ | เขตพิทักษ์ (bastion) | swordsman-r2-c1.png |
| นักดาบ | สายใยโล่ (shield-link) | swordsman-r2-c2.png |
| นักดาบ | ยืนหยัดสุดท้าย (last-stand) | **ยังใช้ภาพเดิม** |
| นักดาบ | บารมีแนวหน้า (iron-call) | swordsman-r4-c2.png |
| นักดาบ | คมโล่พิทักษ์ (shield-edge) | swordsman-r2-c6.png |
| นักดาบ | ดาบสวนวายุ (gale-riposte) | swordsman-r3-c1.png |
| นักดาบ | ตราดาบทะลวง (blade-brand) | swordsman-r3-c2.png |
| นักดาบ | กากบาทพิฆาต (cross-finish) | swordsman-r3-c4.png |
| นักดาบ | คมดาบซ้ำแผล (open-wound) | swordsman-r3-c5.png |
| นักดาบ | แรงส่งสวนดาบ (riposte-flow) | swordsman-r3-c6.png |
| นักทวน | แทงทะลุแนว (pierce) | lancer-r1-c1.png |
| นักทวน | ปลายทวนสกัด (brace) | lancer-r1-c3.png |
| นักทวน | กวาดทวนผลัก (sweep) | lancer-r1-c2.png |
| นักทวน | เขตปลายทวน (spear-zone) | lancer-r1-c4.png |
| นักทวน | ย่างเท้ารักษาระยะ (step) | lancer-r1-c5.png |
| นักทวน | ทวนดาวตก (sky-spear) | **ยังใช้ภาพเดิม** |
| นักทวน | กำแพงทวน (spear-wall) | lancer-r2-c1.png |
| นักทวน | ทวนเกี่ยวกลับ (hook) | lancer-r2-c2.png |
| นักทวน | กระบวนทวนพิทักษ์ (phalanx) | lancer-r2-c3.png |
| นักทวน | แนวสกัดหลวง (long-wall) | **ยังใช้ภาพเดิม** |
| นักทวน | หลักทวนมั่น (planted) | lancer-r4-c2.png |
| นักทวน | ทวนพญานาค (naga-drill) | lancer-r3-c1.png |
| นักทวน | แทงทะลุขบวน (chain-pierce) | lancer-r3-c2.png |
| นักทวน | ดาวทวนถล่ม (spear-storm) | lancer-r3-c4.png |
| นักทวน | ปลายทวนยาว (far-point) | lancer-r4-c5.png |
| นักทวน | จังหวะทะลวง (pierce-rhythm) | lancer-r4-c3.png |
| นายพราน | เรียกไก่ชน (rooster) | **ยังใช้ภาพเดิม** |
| นายพราน | จิกขัดจังหวะ (peck) | hunter-r3-c3.png |
| นายพราน | หมายตาพราน (mark) | hunter-r1-c2.png |
| นายพราน | บ่วงเถาวัลย์ (vine-trap) | hunter-r1-c3.png |
| นายพราน | ศรถอยพง (retreat-shot) | hunter-r1-c5.png |
| นายพราน | ฝนศร (arrow-rain) | hunter-r1-c4.png |
| นายพราน | ศรแตกแขนง (scatter) | hunter-r2-c1.png |
| นายพราน | ซุ่มยิงพงไพร (ambush) | hunter-r2-c2.png |
| นายพราน | ดงหนามพราน (thicket) | hunter-r2-c3.png |
| นายพราน | ตาพราน (weakpoint) | hunter-r4-c1.png |
| นายพราน | ขึ้นสายไว (quick-nock) | hunter-r4-c2.png |
| นายพราน | ไก่ชนหิมพานต์ (mythic-rooster) | hunter-r3-c4.png |
| นายพราน | ฝูงจิกวิญญาณ (flock) | hunter-r3-c1.png |
| นายพราน | ขันปลุกขวัญ (crow) | hunter-r3-c2.png |
| นายพราน | ใจไก่นักสู้ (rooster-heart) | hunter-r3-c5.png |
| นายพราน | คู่ขวัญพราน (bond) | hunter-r3-c6.png |
| นักมวย | หมัดนำ (jab) | boxer-r1-c1.png |
| นักมวย | ศอกตัดลม (elbow) | boxer-r1-c4.png |
| นักมวย | เข่าปิดบัญชี (knee) | boxer-r1-c3.png |
| นักมวย | ย่างสามขุม (triangle) | boxer-r1-c5.png |
| นักมวย | ปัดป้องสวนหมัด (parry) | **ยังใช้ภาพเดิม** |
| นักมวย | หนุมานถวายแหวน (hanuman) | boxer-r1-c6.png |
| นักมวย | แม่ไม้ต่อเนื่อง (mae-mai) | boxer-r2-c1.png |
| นักมวย | หนุมานประสานหมัด (twin-fists) | boxer-r2-c4.png |
| นักมวย | เข่าเหินเวหา (flying-knee) | boxer-r2-c2.png |
| นักมวย | จังหวะครู (rhythm) | boxer-r4-c2.png |
| นักมวย | ลมหายใจมวย (breath) | boxer-r4-c1.png |
| นักมวย | กายคงกระพัน (iron-body) | boxer-r3-c1.png |
| นักมวย | ปักหลักรับศึก (anchor) | boxer-r3-c2.png |
| นักมวย | หมัดสะท้อนภูผา (mountain-fist) | boxer-r3-c4.png |
| นักมวย | เลือดนักสู้ (iron-blood) | boxer-r3-c5.png |
| นักมวย | ใจไม่ยอมล้ม (unbroken) | boxer-r3-c6.png |
| จอมโจร | พรางเงา (stealth) | rogue-r1-c2.png |
| จอมโจร | มีดเงาทะลวง (backstab) | rogue-r1-c3.png |
| จอมโจร | เฉือนเอ็น (hamstring) | rogue-r3-c3.png |
| จอมโจร | มีดอาบพิษ (poison) | rogue-r1-c4.png |
| จอมโจร | ควันพรางทาง (smoke) | rogue-r1-c5.png |
| จอมโจร | มีดปิดชีพ (execution) | rogue-r1-c6.png |
| จอมโจร | เงาแยกร่าง (clones) | rogue-r2-c1.png |
| จอมโจร | ม่านเงาคุ้มกัน (shadow-curtain) | rogue-r2-c2.png |
| จอมโจร | จู่โจมจันทรา (moon-dive) | rogue-r2-c4.png |
| จอมโจร | เงาทอดยาว (long-shadow) | rogue-r4-c1.png |
| จอมโจร | ก้าวเงา (shadow-step) | rogue-r2-c5.png |
| จอมโจร | คมมีดพิษอาคม (venom-blade) | rogue-r3-c1.png |
| จอมโจร | พิษระเบิดจุดตาย (venom-burst) | rogue-r3-c2.png |
| จอมโจร | มีดดับตะวัน (sunset-blade) | rogue-r3-c4.png |
| จอมโจร | พิษฝังลึก (deep-venom) | rogue-r3-c5.png |
| จอมโจร | พิษหยดสุดท้าย (last-drop) | rogue-r3-c6.png |
| หมอผี | ผูกคำสาป (curse) | shaman-r1-c2.png |
| หมอผี | ด้ายตรึงวิญญาณ (thread) | shaman-r1-c3.png |
| หมอผี | พรายคุ้มกาย (spirit) | **ยังใช้ภาพเดิม** |
| หมอผี | ยันต์ระเบิด (talisman) | shaman-r1-c5.png |
| หมอผี | ถอนคำสาปแตก (curse-burst) | **ยังใช้ภาพเดิม** |
| หมอผี | พรายอาละวาด (great-spirit) | shaman-r1-c4.png |
| หมอผี | จ้าวพรายพิทักษ์ (spirit-lord) | shaman-r2-c1.png |
| หมอผี | พันธนาการวิญญาณ (soul-chain) | shaman-r2-c2.png |
| หมอผี | คลื่นพรายร้อยตน (hundred-souls) | shaman-r2-c4.png |
| หมอผี | พรายเรืองฤทธิ์ (spirit-force) | shaman-r4-c1.png |
| หมอผี | ขวัญหวนคืน (soul-return) | shaman-r2-c5.png |
| หมอผี | ยันต์คู่คุ้มภัย (twin-seals) | shaman-r3-c1.png |
| หมอผี | มหาวงนวหรคุณ (great-yantra) | shaman-r3-c4.png |
| หมอผี | อาคมย้อนเคราะห์ (reverse-fate) | shaman-r3-c2.png |
| หมอผี | ยันต์ลงรัก (ward-craft) | shaman-r3-c5.png |
| หมอผี | ย้อนแรงอาคม (return-force) | shaman-r3-c6.png |
| พระ / แม่ชี | ธรรมประทีป (holy) | acolyte-r1-c1.png |
| พระ / แม่ชี | ปันขวัญเมตตา (heal) | acolyte-r1-c2.png |
| พระ / แม่ชี | บัวฟื้นฟู (regen) | **ยังใช้ภาพเดิม** |
| พระ / แม่ชี | ชำระอาถรรพ์ (cleanse) | acolyte-r1-c4.png |
| พระ / แม่ชี | คืนขวัญ (revive) | acolyte-r1-c5.png |
| พระ / แม่ชี | เขตบุญคุ้มภัย (sanctuary) | acolyte-r1-c6.png |
| พระ / แม่ชี | มหาบัวฟื้นฟู (great-lotus) | acolyte-r2-c1.png |
| พระ / แม่ชี | คืนขวัญมหาเมตตา (great-revive) | **ยังใช้ภาพเดิม** |
| พระ / แม่ชี | ต้นบุญคืนชีพ (life-tree) | acolyte-r2-c4.png |
| พระ / แม่ชี | เมตตาเต็มเปี่ยม (kindness) | acolyte-r4-c1.png |
| พระ / แม่ชี | ขวัญแน่นแฟ้น (return-life) | acolyte-r2-c5.png |
| พระ / แม่ชี | เขตธรรมพิทักษ์ (dharma-dome) | acolyte-r3-c3.png |
| พระ / แม่ชี | ธรรมตัดอาถรรพ์ (curse-cut) | acolyte-r3-c2.png |
| พระ / แม่ชี | เพลิงธรรมปราบมาร (holy-flame) | acolyte-r3-c1.png |
| พระ / แม่ชี | ฐานธรรมมั่นคง (sacred-ground) | acolyte-r3-c5.png |
| พระ / แม่ชี | แสงตัดอาถรรพ์ (light-edge) | acolyte-r3-c6.png |
| ผู้ฝึกตน | หมัดฝึกฝน (ช่อง 0) | novice-r1-c1.png |
| ผู้ฝึกตน | พักหายใจ (ช่อง 4) | novice-r1-c2.png |
| ผู้ฝึกตน | ตั้งรับ (ช่อง 5) | novice-r1-c3.png |
