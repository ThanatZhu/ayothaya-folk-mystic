import {paintSkillRegion} from './icon-renderer.js';
import {reworkIconURL,REWORK_REGION} from './rework-icon-map.js';
// 0.119 skill rework (docs/skills-rework-proposal.md): per class 6 actives (the 6th is the ultimate) + 3 class
// passives; per Master branch 4 actives (the 4th is the branch ultimate) + 3 passives. Actives level 1-5, passives
// 1-3, every level (the first too) costs one point, and each skill opens at a Job level (`job`).
// `kind` picks the existing role-combat behaviour; `fx` names the pre-0.119 skill whose painted VFX it reuses until
// the new effects (docs/skills-vfx-prompts.md) land. `power` is in the role-combat scale (doc % x 0.6).
const s=(id,name,tip,kind,fx,extra={})=>({id,name,tip,kind,fx,mp:18,cd:8,windup:.36,duration:1.2,power:65,range:7,radius:2.8,seconds:5,pose:0,...extra});
const u=(id,name,tip,kind,fx,extra={})=>s(id,name,tip,kind,fx,{ultimate:true,windup:1,duration:1.8,...extra});
// value = bonus per passive level (1-3)
const p=(id,name,tip,modifier,value,fx)=>({id,name,tip,modifier,value,fx,passive:true});
export const JOB_UNLOCK={base:[1,3,8,14,20,28],passives:[12,24,34],master:[1,6,12,20],masterPassives:[8,16,24]};
export const ROLES=[
 {id:'swordsman',name:'นักดาบ',color:'#ffbf63',role:'แนวหน้า · ดึงศัตรู · ปกป้องเพื่อน',weakness:'ต้องอยู่ใกล้ศัตรู โล่มีเวลาจำกัดและไม่กันการโจมตีจากทุกทิศ',base:[
  s('sword-open','ฟันเปิดทาง','ฟันเปิดทาง ทำดาเมจและลดเกราะเป้าชั่วคราว','break','break',{power:90,mp:8,cd:4,range:2,seconds:4,pose:6}),
  s('sword-roar','คำรามท้าศึก','ดึงศัตรูรอบตัวให้หันมาตีเรา','taunt','challenge',{mp:16,cd:14,radius:4,seconds:3,pose:8}),
  s('sword-shield','โล่รับคม','กันดาเมจจากด้านหน้า ต้องหันรับให้ถูกทิศ','guard','guard',{mp:14,cd:12,seconds:3,pose:5}),
  s('sword-cleave','ดาบกวาดวง','หมุนดาบกวาดศัตรูรอบตัว','cleave','cleave',{power:72,mp:18,cd:8,range:4,radius:3.5,pose:1}),
  s('sword-cover','ก้าวคุ้มกัน','พุ่งไปหาเพื่อน แล้วรับดาเมจแทนชั่วคราว','intercept','intercept',{mp:16,cd:16,seconds:4,pose:7}),
  u('sword-royal','ดาบอาญาสิทธิ์','ไม้ตาย · ชาร์จแล้วฟาดคลื่นดาบทองเป็นแนวยาว','line','cross-finish',{power:270,mp:45,cd:75,range:8,pose:9})
 ],passives:[
  p('sword-iron','กายเหล็ก','HP สูงสุดเพิ่มขึ้น','maxHp',.05,'iron-blood'),
  p('sword-presence','บารมีแนวหน้า','รับดาเมจน้อยลง','damageTaken',.03,'iron-call'),
  p('sword-auto-counter','สวนคมอัตโนมัติ','ทำดาเมจแรงขึ้น','damageDealt',.03,'riposte-flow')
 ],branches:[
  {id:'guardian',name:'ขุนดาบพิทักษ์',role:'แทงค์ปาร์ตี้ · รับแรงแทนเพื่อน',active:[
   s('guard-bastion','เขตพิทักษ์','วางเขต เพื่อนในเขตโดนตีเบาลง','sanctuary','bastion',{power:30,mp:30,cd:24,radius:4,seconds:6,pose:5}),
   s('guard-link','สายใยโล่','ผูกเพื่อน 1 คน รับดาเมจแทนบางส่วน','link','shield-link',{power:50,mp:25,cd:20,seconds:8,pose:5}),
   s('guard-hook','ดึงศัตรู','เกี่ยวศัตรูมาหน้าเรา บอสเสียหลักแทน','pull','hook',{power:60,mp:20,cd:16,range:6,radius:2,pose:6}),
   u('guard-wall','กำแพงกรุงศรี','ไม้ตาย · ทั้งปาร์ตี้ในวงได้โล่ใหญ่และสะท้อนแรง','ward','bastion',{power:120,mp:60,cd:90,seconds:6,pose:5})
  ],passives:[
   p('guard-last-stand','ยืนหยัดสุดท้าย','HP ต่ำแล้วรับดาเมจน้อยลง','lowGuard',.07,'iron-call'),
   p('guard-shield-edge','คมโล่','สะท้อนดาเมจบางส่วน','reflect',.05,'shield-edge'),
   p('guard-holy-armor','เกราะศักดิ์สิทธิ์','รับดาเมจน้อยลง','damageTaken',.04,'shield-edge')
  ]},
  {id:'duelist',name:'ขุนดาบทะลวง',role:'ดาเมจเดี่ยว · อ่านจังหวะสวน',active:[
   s('duel-riposte','ดาบสวนวายุ','ตั้งรับแล้วสวนหนัก ขัดท่าศัตรูที่กำลังร่าย','riposte','gale-riposte',{power:150,mp:22,cd:12,pose:0}),
   s('duel-brand','ตราดาบทะลวง','ติดตราให้เป้ารับดาเมจเพิ่ม','brand','blade-brand',{power:66,mp:20,cd:16,seconds:6,pose:6}),
   s('duel-storm','พุ่งฟันพายุ','พุ่งฟันทุกตัวในแนว','line','cleave',{power:108,mp:24,cd:14,range:5,pose:6}),
   u('duel-cross','กากบาทพิฆาต','ไม้ตาย · ฟันกากบาท แรงสองเท่ากับเป้า HP ต่ำ','execute','cross-finish',{power:300,mp:50,cd:80,range:2,pose:9})
  ],passives:[
   p('duel-wound','คมดาบซ้ำแผล','ดาเมจต่อเป้าที่เกราะแตกเพิ่มขึ้น','brokenBonus',.07,'open-wound'),
   p('duel-flow','แรงส่งสวนดาบ','สวนสำเร็จลดคูลดาวน์ดาบกวาด','counterRecovery',1,'riposte-flow'),
   p('duel-spirit','จิตนักรบ','ทำดาเมจแรงขึ้น','damageDealt',.03,'open-wound')
  ]}
 ]},
 {id:'lancer',name:'นักทวน',color:'#eac994',role:'คุมระยะ · สกัดการพุ่ง · แทงแนวเส้น',weakness:'ศัตรูที่แยกกันอยู่ทำให้ท่าแนวเส้นเสียประสิทธิภาพ',base:[
  s('lance-pierce','แทงทะลุแนว','แทงโดนทุกตัวในแนวเส้น','line','pierce',{power:84,mp:10,cd:5,range:4,pose:6}),
  s('lance-sweep','กวาดทวนผลัก','กวาดทวนผลักศัตรูออก','push','sweep',{power:66,mp:14,cd:9,radius:3,pose:7}),
  s('lance-check','ปลายทวนสกัด','ขัดการร่ายและตรึงเป้า','interrupt','brace',{power:60,mp:14,cd:12,range:3,seconds:1.5,pose:6}),
  s('lance-zone','เขตปลายทวน','วางเขต ศัตรูในวงเดินช้าและโดนทวนเป็นระยะ','zone','spear-zone',{power:30,mp:20,cd:16,radius:3,seconds:5,pose:5}),
  s('lance-step','ย่างเท้ารักษาระยะ','ถอยหลังและหลบหลีกชั่วคราว','evade','step',{mp:12,cd:10,seconds:2,pose:7}),
  u('lance-naga','ทวนพญานาคทะลวงฟ้า','ไม้ตาย · ขว้างทวนพญานาคทะลุแนวยาวและลดเกราะ','drill','naga-drill',{power:252,mp:45,cd:75,range:10,pose:6})
 ],passives:[
  p('lance-reach','ปลายทวนยาว','ดาเมจต่อเป้าที่อยู่ไกลเพิ่มขึ้น','farBonus',.05,'far-point'),
  p('lance-planted','หลักทวนมั่น','ขณะอยู่ในเขตทวนรับดาเมจน้อยลง','zoneGuard',.07,'planted'),
  p('lance-rhythm','จังหวะทะลวง','ทำดาเมจแรงขึ้น','damageDealt',.03,'pierce-rhythm')
 ],branches:[
  {id:'vanguard',name:'ขุนทวนหลวง',role:'จัดตำแหน่งศัตรู · คุมพื้นที่ให้ทีม',active:[
   s('van-wall','กำแพงทวน','ปักแนวทวนกั้นทาง ทำดาเมจและหยุดศัตรู','wall','spear-wall',{power:40,mp:28,cd:22,radius:3,seconds:5,pose:5}),
   s('van-hook','ทวนเกี่ยวกลับ','เกี่ยวศัตรูไกลมาหน้าเรา','pull','hook',{power:72,mp:22,cd:15,range:6,radius:2,pose:6}),
   s('van-phalanx','กระบวนทวน','แทงทะลวงพร้อมให้โล่เพื่อนรอบตัว','phalanx','phalanx',{power:60,mp:26,cd:26,range:4,pose:5}),
   u('van-array','ค่ายกลทวนพันเล่ม','ไม้ตาย · ทวนพุ่งขึ้นจากพื้นหลายระลอกในวงใหญ่','storm','spear-storm',{power:96,mp:55,cd:85,radius:6,seconds:3,pose:5})
  ],passives:[
   p('van-line','แนวสกัดหลวง','เขตทวนกว้างขึ้น','zoneRadius',.1,'long-wall'),
   p('van-soldier','ทหารกองหน้า','HP สูงสุดเพิ่มขึ้น','maxHp',.05,'long-wall'),
   p('van-anchor','ปักหลัก','รับดาเมจน้อยลง','damageTaken',.03,'planted')
  ]},
  {id:'war-lancer',name:'ทวนศึก',role:'ทะลวงแถวหลัง · ระเบิดดาเมจแนวเส้น',active:[
   s('war-drill','ทวนพญานาค','หมุนทวนเจาะแนวเส้นและลดเกราะ','drill','naga-drill',{power:66,mp:24,cd:14,range:4,pose:6}),
   s('war-chain','แทงทะลุขบวน','แทงแนวยาว แรงขึ้นตามจำนวนศัตรูในแนว','chainLine','chain-pierce',{power:120,mp:24,cd:13,range:7,pose:6}),
   s('war-leap','กระโดดทวน','กระโดดทิ่มทวนลงพื้นที่','meteor','sky-spear',{power:96,mp:22,cd:16,radius:2.5,pose:6}),
   u('war-stars','ดาวทวนถล่ม','ไม้ตาย · ทวนไฟตกจากฟ้าหลายระลอกในวงกว้าง','storm','spear-storm',{power:70,mp:55,cd:85,radius:5,seconds:3,pose:5})
  ],passives:[
   p('war-edge','ปลายทวนคม','ทำดาเมจแรงขึ้น','damageDealt',.04,'far-point'),
   p('war-tempo','จังหวะศึก','ทำดาเมจแรงขึ้น','damageDealt',.03,'pierce-rhythm'),
   p('war-backline','นักล่าแนวหลัง','ดาเมจต่อเป้าที่อยู่ไกลเพิ่มขึ้น','farBonus',.05,'far-point')
  ]}
 ]},
 {id:'hunter',name:'นายพราน',color:'#a5db84',role:'โจมตีไกล · กับดัก · ไก่ชนคู่ใจ',weakness:'ต้องคุมระยะ ตัวบางเมื่อถูกประชิด',base:[
  s('hunt-shot','ศรเจาะจุด','ยิงศรเจาะเกราะเป้าเดียว','break','ambush',{power:90,mp:8,cd:4,range:7,seconds:3,pose:7}),
  s('hunt-mark','หมายตาพราน','ตีตราให้ทั้งทีมทำดาเมจใส่เป้านี้เพิ่ม','mark','mark',{power:35,mp:12,cd:12,range:8,seconds:8,pose:6}),
  s('hunt-snare','บ่วงเถาวัลย์','วางบ่วงตรึงศัตรูที่เหยียบ','trap','vine-trap',{power:24,mp:14,cd:10,radius:2,seconds:8,pose:5}),
  s('hunt-rain','ฝนศร','ยิงศรลงวงพื้นที่หลายระลอก','rain','arrow-rain',{power:36,mp:22,cd:14,radius:3.5,seconds:3,pose:6}),
  s('hunt-retreat','ศรถอยพง','ยิงแล้วกระโดดถอยออก','retreatShot','retreat-shot',{power:72,mp:14,cd:10,pose:7}),
  u('hunt-rama','ศรพระราม','ไม้ตาย · ง้างศรเทพยิงทะลุแนวยาวสุดลูกหูลูกตา','line','ambush',{power:330,mp:45,cd:80,range:14,windup:1.2,pose:7})
 ],passives:[
  p('hunt-eye','ตาพราน','ดาเมจใส่เป้าที่มีหมายตาเพิ่มขึ้น','markBonus',.05,'weakpoint'),
  p('hunt-nock','ขึ้นสายไว','สกิลยิงศรคูลดาวน์สั้นลง','arrowCooldown',.05,'quick-nock'),
  p('hunt-rooster','ไก่ชนคู่ใจ','ไก่ชนแรงขึ้น','summonPower',.15,'rooster-heart')
 ],branches:[
  {id:'ranger',name:'พรานไพร',role:'ซุ่มยิง · ใช้ภูมิประเทศและกับดัก',active:[
   s('rang-fan','ศรแตกแขนง','ยิงพัดกว้างด้านหน้า','cone','scatter',{power:54,mp:22,cd:10,range:6,pose:7}),
   s('rang-ambush','ซุ่มยิงพงไพร','พรางตัวแล้วเปิดยิงหนัก','ambush','ambush',{power:180,mp:26,cd:18,pose:7}),
   s('rang-thorns','ดงหนามพราน','วางดงหนามทำดาเมจต่อเนื่องและชะลอ','thorns','thicket',{power:40,mp:26,cd:22,radius:4,seconds:5,pose:5}),
   u('rang-storm','ห่าศรหิมพานต์','ไม้ตาย · ศรตกเป็นห่าฝนในวงใหญ่','rain','arrow-rain',{power:72,mp:55,cd:85,radius:7,seconds:4,pose:6})
  ],passives:[
   p('rang-range','ระยะพรานไพร','ดาเมจต่อเป้าที่อยู่ไกลเพิ่มขึ้น','farBonus',.05,'weakpoint'),
   p('rang-weakpoint','จุดอ่อน','ทำดาเมจแรงขึ้น','damageDealt',.05,'weakpoint'),
   p('rang-move','เดินยิง','ทำดาเมจแรงขึ้น','damageDealt',.03,'quick-nock')
  ]},
  {id:'spirit-hunter',name:'พรานอาคม',role:'คู่หูวิญญาณ · สั่งจิกและช่วยทีม',active:[
   s('spirit-flock','ฝูงจิกวิญญาณ','ส่งฝูงไก่วิญญาณจิกเป็นวง ขัดท่าศัตรู','uppercut','flock',{power:72,mp:24,cd:14,radius:3,pose:6}),
   s('spirit-crow','ขันปลุกขวัญ','ไก่ขันเพิ่มดาเมจทีมชั่วคราว','crow','crow',{mp:26,cd:24,seconds:8,pose:5}),
   s('spirit-peck','ไก่ชนจิกตา','ไก่กระโจนจิกเป้า ขัดท่าและทำให้มึนงง','interrupt','peck',{power:60,mp:20,cd:16,range:6,seconds:2,pose:6}),
   u('spirit-giant','ไก่ชนหิมพานต์','ไม้ตาย · เรียกไก่ชนยักษ์ทองคำมาช่วยสู้','greatSummon','mythic-rooster',{mp:60,cd:90,seconds:12,pose:5})
  ],passives:[
   p('spirit-heart','ใจไก่นักสู้','ไก่ชนแรงขึ้น','summonPower',.15,'rooster-heart'),
   p('spirit-bond','คู่ขวัญพราน','ไก่จิกเป้าที่มีหมายตาจะฮีลเจ้าของ','bondHeal',3,'bond'),
   p('spirit-feather','ขนไก่วิญญาณ','ไก่จิกแล้วฮีลเจ้าของเพิ่ม','bondHeal',2,'bond')
  ]}
 ]},
 {id:'boxer',name:'นักมวย',color:'#ff945b',role:'ประชิดล้วน · คอมโบ · ล็อกและปิดเกม',weakness:'ต้องเข้าใกล้และเลือกจังหวะ ไม่มีท่าระยะไกล',base:[
  s('box-jab','หมัดนำ','หมัดเร็วสะสมจังหวะมวย','jab','jab',{power:54,mp:4,cd:1.5,range:1.4,pose:6}),
  s('box-knee-dash','เข่าลอยพุ่ง','พุ่งเข่าเข้าหาเป้าและขัดจังหวะ','leap','flying-knee',{power:90,mp:14,cd:10,range:5,pose:7}),
  s('box-clinch','จับคอเข่าลอย','จับล็อกคอแล้วตีเข่า เป้าขยับไม่ได้ชั่วครู่','interrupt','knee',{power:126,mp:18,cd:14,range:1.4,seconds:1.5,pose:6}),
  s('box-elbow','ศอกกลับหลัง','หมุนศอกรอบตัว ขัดการร่ายทุกตัวในวง','cleave','elbow',{power:78,mp:16,cd:9,range:2.5,radius:2.5,pose:7}),
  s('box-triangle','ย่างสามขุม','ย่างหลบดาเมจทั้งหมดชั่วครู่','evade','triangle',{mp:12,cd:11,seconds:1,pose:0}),
  u('box-hanuman','หนุมานถวายแหวน','ไม้ตาย · อัปเปอร์คัตหนุมาน ยิ่งสะสมจังหวะยิ่งแรง','comboFinish','hanuman',{power:240,mp:40,cd:70,range:1.6,pose:6})
 ],passives:[
  p('box-breath','ลมหายใจมวย','ท่าคอมโบคืน MP','comboMana',2,'breath'),
  p('box-rhythm','จังหวะครู','ท่าปิดคอมโบแรงขึ้น','comboBonus',.08,'rhythm'),
  p('box-heavy','หมัดหนัก','ทำดาเมจแรงขึ้น','damageDealt',.05,'rhythm')
 ],branches:[
  {id:'master-boxer',name:'ครูมวย',role:'คอมโบต่อเนื่อง · ดาเมจตามจังหวะ',active:[
   s('mb-maemai','แม่ไม้ต่อเนื่อง','ชุดท่าต่อเนื่อง เติมจังหวะมวยเต็ม','combo','mae-mai',{power:60,mp:22,cd:12,range:1.6,pose:6}),
   s('mb-flying-knee','เข่าเหินเวหา','กระโดดเข่าจากระยะไกลลงใส่เป้า','leap','flying-knee',{power:132,mp:24,cd:15,range:6,pose:7}),
   s('mb-headband','มวยคาดเชือก','ปลุกใจ ทีมทำดาเมจแรงขึ้นชั่วคราว','crow','mae-mai',{mp:24,cd:22,seconds:8,pose:5}),
   u('mb-barrage','หนุมานประสานหมัด','ไม้ตาย · ร่างหนุมานรัวหมัดใส่เป้าเดียว','comboBurst','twin-fists',{power:300,mp:55,cd:80,range:2,pose:6})
  ],passives:[
   p('mb-teacher','ครูสอนมวย','ท่าปิดคอมโบแรงขึ้น','comboBonus',.05,'rhythm'),
   p('mb-iron-shoulder','ไหล่เหล็ก','รับดาเมจน้อยลง','damageTaken',.03,'breath'),
   p('mb-fast-hands','มือเร็ว','ทำดาเมจแรงขึ้น','damageDealt',.04,'rhythm')
  ]},
  {id:'iron-boxer',name:'มวยคงกระพัน',role:'ยืนแลก · สะสมแรงเพื่อสวน',active:[
   s('ib-stone','กายคงกระพัน','ตั้งกายรับดาเมจลดลงมากชั่วคราว','guard','iron-body',{mp:26,cd:22,seconds:5,pose:0}),
   s('ib-anchor','ปักหลักรับศึก','ยั่วศัตรูรอบตัวพร้อมได้โล่','anchor','anchor',{power:60,mp:24,cd:20,radius:4,seconds:5,pose:0}),
   s('ib-headbutt','โขกศีรษะ','โขกหัวเป้า ขัดท่าและทำให้มึนงง','interrupt','elbow',{power:108,mp:20,cd:14,range:1.4,seconds:1.5,pose:6}),
   u('ib-mountain','หมัดสะท้อนภูผา','ไม้ตาย · ตั้งรับแล้วปล่อยหมัดภูผาสวนกลับ','counter','mountain-fist',{power:300,mp:50,cd:80,seconds:3,pose:0})
  ],passives:[
   p('ib-blood','เลือดนักสู้','ทำดาเมจแรงขึ้น','damageDealt',.05,'iron-blood'),
   p('ib-unbroken','ใจไม่ยอมล้ม','HP ต่ำแล้วรับดาเมจน้อยลง','lowGuard',.07,'unbroken'),
   p('ib-tough','หนังเหนียว','รับดาเมจน้อยลง','damageTaken',.04,'iron-blood')
  ]}
 ]},
 {id:'rogue',name:'จอมโจร / มีดคู่',color:'#c69bea',role:'ลอบโจมตี · พิษ · ปิดชีพ',weakness:'ตัวบาง ท่าปิดชีพแรงเมื่อเป้าใกล้ตายหรือออกจากพรางตัว',base:[
  s('rogue-slash','มีดคู่เฉือน','ฟันมีดคู่เร็ว แรงขึ้นมากถ้าออกจากพรางตัว','backstab','backstab',{power:90,mp:6,cd:3,range:1.4,pose:6}),
  s('rogue-stealth','พรางเงา','พรางตัว การโจมตีถัดไปแรงขึ้น','stealth','stealth',{mp:16,cd:14,seconds:4,pose:5}),
  s('rogue-shadowstab','มีดเงาทะลวง','วาร์ปไปหลังเป้าแล้วแทง','backstab','moon-dive',{power:96,mp:16,cd:10,range:5,pose:7}),
  s('rogue-poison','มีดอาบพิษ','ทำให้เป้าติดพิษ','poison','poison',{power:48,mp:14,cd:8,range:1.6,seconds:6,pose:6}),
  s('rogue-smoke','ควันพรางทาง','กางควันให้เพื่อนในวงหลบหลีกเพิ่ม','smoke','smoke',{mp:18,cd:16,seconds:4,pose:5}),
  u('rogue-execute','มีดปิดชีพ','ไม้ตาย · ฟันรวดเดียว แรงสองเท่ากับเป้า HP ต่ำ','execute','execution',{power:210,mp:35,cd:60,range:1.6,pose:7})
 ],passives:[
  p('rogue-long-shadow','เงาทอดยาว','พรางตัวนานขึ้น','stealthDuration',1,'long-shadow'),
  p('rogue-light-hand','มือเบา','ทำดาเมจแรงขึ้น','damageDealt',.04,'shadow-step'),
  p('rogue-weak-spot','จุดตาย','ทำดาเมจแรงขึ้น','damageDealt',.05,'last-drop')
 ],branches:[
  {id:'shadow',name:'โจรเงา',role:'เคลื่อนย้าย · ล่อเป้า · ช่วยหลบ',active:[
   s('shade-clones','เงาแยกร่าง','สร้างร่างเงาล่อศัตรูพร้อมพรางตัว','clones','clones',{mp:26,cd:22,seconds:6,pose:5}),
   s('shade-curtain','ม่านเงาคุ้มกัน','ม่านเงาให้ทีมหลบหลีกเพิ่ม','smoke','shadow-curtain',{mp:26,cd:24,seconds:5,pose:5}),
   s('shade-swap','สลับเงา','ถอยหลบด้วยเงาและหลบหลีกชั่วคราว','evade','stealth',{mp:18,cd:12,seconds:2,pose:7}),
   u('shade-moonfall','จู่โจมจันทรา','ไม้ตาย · ฟ้ามืด วาร์ปฟันศัตรูทุกตัวในวงใหญ่','uppercut','moon-dive',{power:120,mp:55,cd:85,radius:7,pose:7})
  ],passives:[
   p('shade-step','ก้าวเงา','โจมตีจากพรางตัวคืน MP','stealthMana',3,'shadow-step'),
   p('shade-mirage','ร่างลวงตา','รับดาเมจน้อยลง','damageTaken',.03,'long-shadow'),
   p('shade-echo','เงาสะท้อน','ทำดาเมจแรงขึ้น','damageDealt',.03,'shadow-step')
  ]},
  {id:'assassin',name:'มือมีดอาคม',role:'พิษสะสม · ระเบิดเป้าเดี่ยว',active:[
   s('venom-edge','คมมีดพิษอาคม','พิษแรงต่อเนื่องบนเป้า','venom','venom-blade',{power:48,mp:24,cd:18,range:1.6,seconds:8,pose:6}),
   s('venom-pop','พิษระเบิดจุดตาย','ระเบิดพิษที่เหลือบนเป้าเป็นดาเมจ','detonatePoison','venom-burst',{power:60,mp:22,cd:12,range:1.6,pose:6}),
   s('venom-hamstring','เฉือนเอ็น','ทำดาเมจและลดความเร็วเป้า','slow','hamstring',{power:78,mp:18,cd:12,range:1.6,seconds:5,pose:6}),
   u('venom-sunset','มีดดับตะวัน','ไม้ตาย · ฟันจันทร์เสี้ยว แรงสองเท่ากับเป้า HP ต่ำ','execute','sunset-blade',{power:300,mp:55,cd:80,range:1.6,pose:7})
  ],passives:[
   p('venom-deep','พิษฝังลึก','พิษอยู่นานขึ้น','poisonDuration',2,'deep-venom'),
   p('venom-last-drop','พิษหยดสุดท้าย','ท่าปิดเป้าติดพิษแรงขึ้น','venomFinish',.1,'last-drop'),
   p('venom-blood','เลือดอสรพิษ','รับดาเมจน้อยลง','damageTaken',.03,'deep-venom')
  ]}
 ]},
 {id:'shaman',name:'หมอผี',color:'#63decb',role:'เวทโจมตีหมู่ · คำสาป · ผีพราย',weakness:'ตัวบาง ต้องเตรียมคำสาปและเขต ไม่มีฮีลหลัก',base:[
  s('sham-ghostfire','ลูกไฟผีพราย','ยิงลูกไฟวิญญาณ แรงขึ้นกับเป้าที่ติดคำสาป','holy','curse-burst',{power:90,mp:10,cd:3,range:7,pose:9}),
  s('sham-curse','ผูกคำสาป','สาปเป้า ทำดาเมจเบาและเตรียมระเบิดอาคม','curse','curse',{power:40,mp:14,cd:10,range:7,seconds:8,pose:8}),
  s('sham-thread','ด้ายตรึงวิญญาณ','ผูกด้ายตรึงเป้า','bind','thread',{power:48,mp:16,cd:12,range:7,seconds:2,pose:8}),
  s('sham-mist','หมอกผีพราย','หมอกวิญญาณในวงกว้าง ทำดาเมจต่อเนื่องและชะลอ','zone','great-spirit',{power:33,mp:24,cd:12,radius:3.5,seconds:5,pose:9}),
  s('sham-talisman','ยันต์ระเบิด','วางยันต์ ระเบิดเมื่อศัตรูเข้าวง','mine','talisman',{power:96,mp:18,cd:10,radius:2,seconds:8,pose:8}),
  u('sham-naga','พญานาคตกฟ้า','ไม้ตาย · วงเตือนแล้วพญานาคฟาดลงมาในวงใหญ่','meteor','hundred-souls',{power:360,mp:60,cd:90,radius:6,range:9,windup:1.5,pose:9})
 ],passives:[
  p('sham-force','พรายเรืองฤทธิ์','ทำดาเมจแรงขึ้น','damageDealt',.04,'spirit-force'),
  p('sham-focus','สมาธิหมอผี','ระเบิดคำสาปคืน MP','curseMana',4,'soul-return'),
  p('sham-spread','คำสาปแพร่','ทำดาเมจแรงขึ้น','damageDealt',.03,'spirit-force')
 ],branches:[
  {id:'spirit-master',name:'จ้าววิญญาณ',role:'คุมพราย · คำสาปกระจาย',active:[
   s('sm-lord','จ้าวพรายพิทักษ์','เรียกพรายใหญ่ช่วยยิงและให้โล่เจ้าของ','greatSpirit','spirit-lord',{mp:30,cd:30,seconds:20,pose:8}),
   s('sm-chains','พันธนาการวิญญาณ','มัดศัตรูเป็นกลุ่ม','massBind','soul-chain',{power:40,mp:32,cd:22,radius:4,pose:8}),
   s('sm-drain','ผีพรายดูดชีพ','คลื่นวิญญาณรอบเป้า ทำดาเมจและชะลอ','soulWave','great-spirit',{power:72,mp:22,cd:12,radius:3,pose:9}),
   u('sm-hundred','คลื่นพรายร้อยตน','ไม้ตาย · คลื่นผีร้อยตน แรงขึ้นกับเป้าติดคำสาป','curseWave','hundred-souls',{power:270,mp:65,cd:90,radius:5,pose:9})
  ],passives:[
   p('sm-return','ขวัญหวนคืน','ระเบิดคำสาปคืน MP','curseMana',4,'soul-return'),
   p('sm-servant','ผีรับใช้','พรายแรงขึ้น','summonPower',.1,'spirit-force'),
   p('sm-body','ร่างจิต','รับดาเมจน้อยลง','damageTaken',.05,'soul-return')
  ]},
  {id:'yantra-master',name:'อาจารย์อาคม',role:'วางเขต · สะท้อนและคุ้มครอง',active:[
   s('ym-seals','ยันต์คู่คุ้มภัย','มอบโล่ให้เพื่อนในวง พร้อมสะท้อนแรง','ward','twin-seals',{power:66,mp:26,cd:20,seconds:8,pose:8}),
   s('ym-reverse','อาคมย้อนเคราะห์','ให้เพื่อนสะท้อนดาเมจและได้โล่ชั่วคราว','reflect','reverse-fate',{power:40,mp:26,cd:24,seconds:4,pose:8}),
   s('ym-silence','ยันต์ใบ้','แปะยันต์ตรึงเป้า','bind','thread',{power:60,mp:22,cd:16,range:7,seconds:2,pose:8}),
   u('ym-great','มหาวงนวหรคุณ','ไม้ตาย · วงยันต์ใหญ่ลดดาเมจทีมและชะลอศัตรู','yantra','great-yantra',{power:35,mp:65,cd:90,radius:7,seconds:6,pose:8})
  ],passives:[
   p('ym-lacquer','ยันต์ลงรัก','โล่อาคมหนาขึ้น','shieldBonus',.2,'ward-craft'),
   p('ym-return','ย้อนแรงอาคม','สะท้อนดาเมจเพิ่มขึ้น','reflect',.05,'return-force'),
   p('ym-sage','ปราชญ์อาคม','คูลดาวน์สกิลสั้นลง','cdr',.04,'ward-craft')
  ]}
 ]},
 {id:'acolyte',name:'พระ / แม่ชี',color:'#ffe3a0',role:'ฮีล · บัฟทีม · ชุบ',weakness:'ดาเมจปานกลาง ต้องใช้เวลาร่ายชุบและหาจุดปลอดภัย',base:[
  s('aco-light','ธรรมประทีป','ลูกแสงธรรม แรงขึ้นกับศัตรูที่ติดคำสาป','holy','holy',{power:78,mp:8,cd:3,range:7,pose:7}),
  s('aco-heal','ปันขวัญเมตตา','ฮีลเพื่อนที่เลือก','heal','heal',{power:120,mp:14,cd:4,range:7,pose:11}),
  s('aco-blessing','พรพุทธคุณ','บัฟทีมรอบตัวให้ทำดาเมจแรงขึ้น','crow','great-lotus',{mp:30,cd:45,seconds:60,pose:11}),
  s('aco-cleanse','ชำระอาถรรพ์','ล้างพิษ คำสาป และตรึงจากเพื่อน','cleanse','cleanse',{power:30,mp:16,cd:12,range:7,pose:11}),
  s('aco-revive','คืนขวัญ','ร่ายชุบเพื่อนที่หมดแรง','revive','revive',{power:35,mp:40,cd:40,windup:2,pose:11}),
  u('aco-field','เขตพุทธคุณ','ไม้ตาย · โดมทองลดดาเมจทีมในวงใหญ่','sanctuary','sanctuary',{power:50,mp:60,cd:90,radius:7,seconds:6,pose:11})
 ],passives:[
  p('aco-kindness','เมตตาเต็มเปี่ยม','ฮีลแรงขึ้น','healBonus',.05,'kindness'),
  p('aco-calm','จิตสงบ','คูลดาวน์สกิลสั้นลง','cdr',.03,'kindness'),
  p('aco-merit','บุญหนุน','เขตคุ้มครองอยู่นานขึ้น','sanctuaryDuration',1,'sacred-ground')
 ],branches:[
  {id:'healer',name:'ผู้บำเพ็ญเมตตา',role:'กู้ปาร์ตี้ · ฮีลวง · ชุบ',active:[
   s('heal-lotus','มหาบัวฟื้นฟู','ฮีลเพื่อนทุกคนในวงและล้างพิษ','groupHeal','great-lotus',{power:108,mp:36,cd:16,pose:11}),
   s('heal-swift','พรเร่งฝีเท้า','บัฟทีมรอบตัวให้ทำดาเมจแรงขึ้น','crow','regen',{mp:30,cd:40,seconds:30,pose:11}),
   s('heal-shield','โล่ศีลห้า','มอบโล่ให้เพื่อน 1 คน','reflect','bastion',{power:0,mp:24,cd:12,seconds:8,pose:11}),
   u('heal-tree','ต้นบุญคืนชีพ','ไม้ตาย · ต้นโพธิ์ทองฟื้น HP ทีมต่อเนื่อง','lifeTree','life-tree',{power:60,mp:70,cd:120,radius:6,seconds:10,pose:11})
  ],passives:[
   p('heal-bond','ขวัญแน่นแฟ้น','ชุบแล้วได้ HP เพิ่ม','reviveBonus',5,'return-life'),
   p('heal-hand','มือพร','ฮีลแรงขึ้น','healBonus',.03,'kindness'),
   p('heal-overflow','บุญล้นพ้น','โล่หนาขึ้น','shieldBonus',.1,'return-life')
  ]},
  {id:'warder',name:'ผู้พิทักษ์ธรรม',role:'ป้องกันทีม · ล้างอาถรรพ์ · ปราบมาร',active:[
   s('ward-flame','เพลิงธรรม','เพลิงธรรมบนพื้น ดาเมจต่อเนื่อง','holyField','holy-flame',{power:50,mp:24,cd:10,radius:3,seconds:4,pose:7}),
   s('ward-cut','ธรรมตัดอาถรรพ์','ล้างสถานะเพื่อนในวงพร้อมทำดาเมจศัตรูใกล้ ๆ','purify','curse-cut',{power:90,mp:26,cd:18,radius:3,pose:11}),
   s('ward-dome','เขตธรรมพิทักษ์','โดมคุ้มครองลดดาเมจเพื่อนในวง','sanctuary','dharma-dome',{power:50,mp:32,cd:28,radius:4,seconds:5,pose:11}),
   u('ward-rain','ฝนธรรมปราบมาร','ไม้ตาย · ลำแสงทองตกจากฟ้าในวงใหญ่','meteor','holy-flame',{power:300,mp:65,cd:90,radius:6,range:8,windup:1.2,pose:7})
  ],passives:[
   p('ward-ground','ฐานธรรมมั่นคง','รับดาเมจน้อยลง','damageTaken',.05,'sacred-ground'),
   p('ward-edge','แสงตัดอาถรรพ์','ดาเมจธรรมต่อศัตรูติดคำสาปเพิ่มขึ้น','holyBonus',.1,'light-edge'),
   p('ward-demon','ปราบมาร','ทำดาเมจแรงขึ้น','damageDealt',.05,'light-edge')
  ]}
 ]}
];
// Icon art follows the rework sheet layout (docs/skills-icon-prompts.md): row 1 class actives, rows 2-3 branch
// actives 1-4 + passives 1-2, row 4 class passives 1-3 then each branch's passive 3.
const art=(cls,r,c)=>'rework-icons-2026-10-26/icons/'+cls+'-r'+r+'-c'+c+'.png';
ROLES.forEach(r=>{
 r.base.forEach((a,i)=>Object.assign(a,{classId:r.id,tier:'base',job:JOB_UNLOCK.base[i],art:art(r.id,1,i+1)}));
 r.passives.forEach((a,i)=>Object.assign(a,{classId:r.id,tier:'base',job:JOB_UNLOCK.passives[i],art:art(r.id,4,i+1)}));
 r.branches.forEach((b,bi)=>{
  b.active.forEach((a,i)=>Object.assign(a,{classId:r.id,branchId:b.id,tier:'master',job:JOB_UNLOCK.master[i],duration:Math.max(a.duration,1.65),art:art(r.id,bi+2,i+1)}));
  b.passives.forEach((a,i)=>Object.assign(a,{classId:r.id,branchId:b.id,tier:'master',job:JOB_UNLOCK.masterPassives[i],art:i<2?art(r.id,bi+2,i+5):art(r.id,4,bi+4)}));
 });
});
export const ALL_SKILLS=ROLES.flatMap(r=>[...r.base,...r.passives,...r.branches.flatMap(b=>[...b.active,...b.passives])]);
export const roleById=id=>ROLES.find(r=>r.id===id);
export const skillById=id=>ALL_SKILLS.find(s=>s.id===id);
export function loadout(classId,branchId=''){
 const role=roleById(classId);if(!role)throw new Error('Unknown class');
 const branch=branchId?role.branches.find(b=>b.id===branchId):null;if(branchId&&!branch)throw new Error('Branch does not belong to class');
 return {role,branch,active:[...role.base,...(branch?.active??[])],passives:[...role.passives,...(branch?.passives??[])]};
}
export function paintIcon(el,skill){if(!skill?.art)return Promise.resolve(false);el.dataset.skillIcon=skill.id;return paintSkillRegion(el,reworkIconURL(skill.art),REWORK_REGION);}
