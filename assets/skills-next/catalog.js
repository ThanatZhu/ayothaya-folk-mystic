// Draft skill identities. Kept separate from live saved skill indices and server rules.
const s=(id,name,tip,kind,extra={})=>({id,name,tip,kind,mp:18,cd:8,windup:.36,duration:1.2,power:65,range:7,radius:2.8,seconds:5,pose:0,...extra});
const p=(id,name,tip,modifier,value)=>({id,name,tip,modifier,value,passive:true});
export const ROLES=[
 {id:'swordsman',name:'นักดาบ',color:'#ffbf63',role:'แนวหน้า · ดึงศัตรู · ปกป้องเพื่อน',weakness:'ต้องอยู่ใกล้ศัตรู โล่มีเวลาจำกัดและไม่กันการโจมตีจากทุกทิศ',base:[
  s('challenge','คำรามท้าศึก','ดึงมอนรอบตัวให้หันมาตีเรา ใช้ช่วยเพื่อนที่ถูกล้อม','taunt',{pose:8,cd:10,seconds:5,radius:4}),
  s('guard','โล่รับคม','ลดดาเมจจากด้านหน้า 65% ต้องหันรับให้ถูกทิศ','guard',{pose:5,seconds:5,cd:12}),
  s('intercept','ก้าวคุ้มกัน','พุ่งไปหาเพื่อน แล้วรับดาเมจแทน 40% ชั่วคราว','intercept',{pose:7,cd:14}),
  s('cleave','ดาบกวาดวง','ฟันกลุ่มมอนที่รุมแนวหน้า เก็บศัตรูที่เข้ามาใกล้','cleave',{pose:1,power:85,range:4,cd:6,radius:3.5}),
  s('break','ผ่าเกราะ','ทำดาเมจและลดเกราะ 30% เปิดช่องให้ทั้งปาร์ตี้','break',{pose:6,power:75,range:4}),
  s('counter','ตั้งรับสวนคม','ตั้งรับ 3 วินาที เมื่อถูกโจมตีจะสวนกลับหนึ่งครั้ง','counter',{pose:0,power:120,seconds:3,cd:12})
 ],branches:[
  {id:'guardian',name:'ขุนดาบพิทักษ์',role:'แทงค์ปาร์ตี้ · รับแรงแทนเพื่อน',active:[
   s('bastion','เขตพิทักษ์','กางโดมให้เพื่อนในวงรับดาเมจน้อยลง 45% เป็นเวลา 7 วินาที','sanctuary',{pose:5,cd:26,mp:35,seconds:7,power:45}),
   s('shield-link','สายใยโล่','เชื่อมเพื่อนหนึ่งคน รับดาเมจแทน 55% นาน 8 วินาที','link',{pose:5,cd:20,seconds:8,power:55}),
   s('last-stand','ยืนหยัดสุดท้าย','ฟื้น HP ตน 25% พร้อมโล่ใหญ่ ใช้กู้สถานการณ์ใกล้ล้ม','lastStand',{pose:9,cd:38,power:25})
  ],passives:[p('iron-call','บารมีแนวหน้า','ยั่วมอนนานขึ้น 2 วินาที','tauntDuration',2),p('shield-edge','คมโล่พิทักษ์','ขณะตั้งรับ เมื่อรับดาเมจจะสะท้อน 15%','reflect',.15)]},
  {id:'duelist',name:'ขุนดาบทะลวง',role:'ดาเมจเดี่ยว · อ่านจังหวะสวน',active:[
   s('gale-riposte','ดาบสวนวายุ','ตั้งรับแล้วสวนหนัก หากศัตรูกำลังร่ายจะขัดท่าได้','riposte',{pose:0,cd:14,power:155}),
   s('blade-brand','ตราดาบทะลวง','ประทับแผลดาบ ลดเกราะและทำให้ศัตรูรับดาเมจเพิ่ม 20%','brand',{pose:6,cd:18,power:110,seconds:7}),
   s('cross-finish','กากบาทพิฆาต','ฟันไขว้ ดาเมจเพิ่มเมื่อ HP ศัตรูต่ำกว่า 35%','execute',{pose:9,cd:24,power:190})
  ],passives:[p('open-wound','คมดาบซ้ำแผล','ดาเมจต่อศัตรูเกราะแตกเพิ่ม 20%','brokenBonus',.2),p('riposte-flow','แรงส่งสวนดาบ','สวนสำเร็จลดคูลดาวน์ดาบกวาด 2 วินาที','counterRecovery',2)]}
 ]},
 {id:'lancer',name:'นักทวน',color:'#eac994',role:'คุมระยะ · สกัดการพุ่ง · แทงแนวเส้น',weakness:'ศัตรูที่แยกกันอยู่ทำให้ท่าแนวเส้นเสียประสิทธิภาพ',base:[
  s('pierce','แทงทะลุแนว','แทงโดนทุกตัวในเส้น ไม่ใช่วงกลมรอบเป้า','line',{pose:0,power:95,cd:6}),
  s('brace','ปลายทวนสกัด','ปักทวนขัดการร่ายและตรึงมอน บอสสะสมเสียหลักแทน','interrupt',{pose:2,power:50,seconds:2}),
  s('sweep','กวาดทวนผลัก','ผลักมอนออกจากเพื่อน เปิดทางถอนตัว','push',{pose:1,power:60}),
  s('spear-zone','เขตปลายทวน','วางเขต 6 วินาที ศัตรูในวงเดินช้าและโดนทวนเป็นระยะ','zone',{pose:5,power:26,seconds:6,cd:14}),
  s('step','ย่างเท้ารักษาระยะ','ถอย 2 หน่วยและได้หลบหลีกชั่วคราว','evade',{pose:7,cd:7,seconds:2}),
  s('sky-spear','ทวนดาวตก','ทิ้งทวนลงพื้นที่ มีสัญญาณวงก่อนตกให้หลบได้','meteor',{pose:9,power:155,windup:.8,cd:16})
 ],branches:[
  {id:'vanguard',name:'ขุนทวนหลวง',role:'จัดตำแหน่งศัตรู · คุมพื้นที่ให้ทีม',active:[
   s('spear-wall','กำแพงทวน','เขตทวนที่ทำดาเมจ ชะลอ และขัดมอนที่ก้าวเข้ามา','wall',{pose:5,seconds:7,cd:22,power:32}),
   s('hook','ทวนเกี่ยวกลับ','เกี่ยวศัตรูเข้ามารวม บอสไม่ถูกลากแต่เสียหลัก','pull',{pose:2,power:90,cd:15}),
   s('phalanx','กระบวนทวนพิทักษ์','แทงทะลวงพร้อมให้โล่เพื่อนรอบตัว','phalanx',{pose:9,power:150,cd:26})
  ],passives:[p('long-wall','แนวสกัดหลวง','เขตทวนกว้างขึ้น 25%','zoneRadius',.25),p('planted','หลักทวนมั่น','ขณะมีเขตทวน รับดาเมจน้อยลง 20%','zoneGuard',.2)]},
  {id:'war-lancer',name:'ทวนศึก',role:'ทะลวงแถวหลัง · ระเบิดดาเมจแนวเส้น',active:[
   s('naga-drill','ทวนพญานาค','ทวนหมุนทะลวงแนวเส้น ลดเกราะทุกเป้าที่โดน','drill',{pose:6,power:160,cd:17}),
   s('chain-pierce','แทงทะลุขบวน','แทงแรงขึ้นตามจำนวนศัตรูที่อยู่แนวเดียวกัน','chainLine',{pose:7,power:115,cd:13}),
   s('spear-storm','ดาวทวนถล่ม','ทวนดาวตกหลายระลอกในวงกว้าง ต้องร่ายก่อน','storm',{pose:9,power:60,seconds:4,windup:1,cd:30})
  ],passives:[p('far-point','ปลายทวนยาว','เป้าห่างเกิน 4 หน่วยรับดาเมจเพิ่ม 20%','farBonus',.2),p('pierce-rhythm','จังหวะทะลวง','แทงแนวเส้นโดนหลายตัว ลดคูลดาวน์ทวน 2 วินาที','lineRecovery',2)]}
 ]},
 {id:'hunter',name:'นายพราน',color:'#a5db84',role:'โจมตีไกล · กับดัก · ไก่ชนคู่ใจ',weakness:'ต้องคุมระยะและสั่งคู่หู ไก่มีเวลาหมดและไม่รับบอสแทนแทงค์',base:[
  s('rooster','เรียกไก่ชน','เรียกไก่ 18 วินาที ให้ไล่จิกเป้าที่เลือก เปลี่ยนเป้าได้','summon',{pose:8,cd:22,seconds:18}),
  s('peck','จิกขัดจังหวะ','สั่งไก่จิกขัดการร่าย ต้องมีไก่อยู่ในสนามก่อน','peck',{pose:2,power:60,cd:6}),
  s('mark','หมายตาพราน','ตีตราให้ทั้งทีมทำดาเมจใส่เป้านี้เพิ่ม 20%','mark',{pose:6,power:35,seconds:8}),
  s('vine-trap','บ่วงเถาวัลย์','วางบ่วงตามพื้นที่ ตรึงมอนและทำดาเมจเบา ๆ','trap',{pose:2,power:24,seconds:5,cd:12}),
  s('retreat-shot','ศรถอยพง','ยิงแล้วถอยออก 2 หน่วย ไม่กระโดดเข้าหาศัตรู','retreatShot',{pose:3,power:75,cd:7}),
  s('arrow-rain','ฝนศร','ยิงศรลงวงพื้นที่ 4 ระลอก เหมาะกับมอนรวมกลุ่ม','rain',{pose:1,power:38,seconds:4,cd:16})
 ],branches:[
  {id:'ranger',name:'พรานไพร',role:'ซุ่มยิง · ใช้ภูมิประเทศและกับดัก',active:[
   s('scatter','ศรแตกแขนง','ยิงพัดกว้างด้านหน้า ไม่โดนศัตรูด้านหลัง','cone',{pose:1,power:125,cd:12}),
   s('ambush','ซุ่มยิงพงไพร','พรางตัวแล้วเปิดยิงหนัก เป้าที่มีหมายตารับแรงขึ้น','ambush',{pose:6,power:175,cd:18}),
   s('thicket','ดงหนามพราน','วางดงหนามทำดาเมจต่อเนื่องและชะลอมอน','thorns',{pose:9,power:40,seconds:7,cd:24})
  ],passives:[p('weakpoint','ตาพราน','ดาเมจใส่เป้ามีหมายตาเพิ่มอีก 15%','markBonus',.15),p('quick-nock','ขึ้นสายไว','สกิลยิงศรคูลดาวน์สั้นลง 15%','arrowCooldown',.15)]},
  {id:'spirit-hunter',name:'พรานอาคม',role:'คู่หูวิญญาณ · สั่งจิกและช่วยทีม',active:[
   s('mythic-rooster','ไก่ชนหิมพานต์','เรียกไก่อาคม 24 วินาที จิกแรงและวิ่งเข้าหาเป้า','greatSummon',{pose:8,cd:30,seconds:24}),
   s('flock','ฝูงจิกวิญญาณ','ส่งฝูงเงาไก่จิกเป็นวง ขัดท่าศัตรูที่ไม่ใช่บอส','flock',{pose:9,power:120,cd:20}),
   s('crow','ขันปลุกขวัญ','ไก่ขันเพิ่มดาเมจทีม 20% และล้างความกลัว ต้องมีไก่ก่อน','crow',{pose:8,seconds:8,cd:22})
  ],passives:[p('rooster-heart','ใจไก่นักสู้','ไก่จิกแรงขึ้น 25%','summonPower',.25),p('bond','คู่ขวัญพราน','ไก่จิกเป้าที่มีหมายตาจะฮีลเจ้าของ 8 HP','bondHeal',8)]}
 ]},
 {id:'boxer',name:'นักมวย',color:'#ff945b',role:'ประชิด · คอมโบ · ขัดท่าหนัก',weakness:'ต้องเข้าใกล้และเลือกจังหวะ หากมัวต่อคอมโบอาจโดนท่าหนัก',base:[
  s('jab','หมัดนำ','หมัดเร็วสะสมจังหวะมวยได้สูงสุด 3 ขั้น','jab',{pose:0,power:55,cd:2,mp:7}),
  s('elbow','ศอกตัดลม','ขัดท่าร่าย ใช้หยุดการโจมตีที่อันตราย','interrupt',{pose:1,power:65,cd:8}),
  s('knee','เข่าปิดบัญชี','ใช้จังหวะมวยที่สะสม เพิ่มดาเมจตามจำนวนขั้น','comboFinish',{pose:6,power:85,cd:7}),
  s('triangle','ย่างสามขุม','ถอยหลบพร้อมเพิ่มโอกาสหลบ 2 วินาที','evade',{pose:7,cd:6,seconds:2}),
  s('parry','ปัดป้องสวนหมัด','รับการโจมตีแล้วสวนหนึ่งครั้ง ต้องอ่านจังหวะศัตรู','counter',{pose:5,power:130,cd:11,seconds:3}),
  s('hanuman','หนุมานถวายแหวน','หมัดเสยเป็นวงเล็ก ขัดมอนและทำให้บอสเสียหลัก','uppercut',{pose:9,power:145,cd:15})
 ],branches:[
  {id:'master-boxer',name:'ครูมวย',role:'คอมโบต่อเนื่อง · ดาเมจตามจังหวะ',active:[
   s('mae-mai','แม่ไม้ต่อเนื่อง','ชุดหมัดสามจังหวะ เติมจังหวะมวยเต็ม 3 ขั้น','combo',{pose:9,power:145,cd:14}),
   s('twin-fists','หนุมานประสานหมัด','ใช้จังหวะมวยทั้งหมดระเบิดหมัดคู่เป็นวง','comboBurst',{pose:6,power:165,cd:20}),
   s('flying-knee','เข่าเหินเวหา','เข้าประชิดเป้าและขัดการร่าย ก่อนคืนหลัก','leap',{pose:7,power:155,cd:17})
  ],passives:[p('rhythm','จังหวะครู','คอมโบปิดท้ายแรงเพิ่ม 25%','comboBonus',.25),p('breath','ลมหายใจมวย','ใช้ท่าคอมโบคืน MP 6 หน่วย','comboMana',6)]},
  {id:'iron-boxer',name:'มวยคงกระพัน',role:'ยืนแลก · สะสมแรงเพื่อสวน',active:[
   s('iron-body','กายคงกระพัน','ตั้งกายรับดาเมจลด 65% ชั่วคราว แต่ยังต้องหลบท่าบอส','guard',{pose:5,seconds:7,cd:24}),
   s('anchor','ปักหลักรับศึก','ยั่วมอนใกล้ตัวพร้อมได้โล่ ใช้เป็นแนวหน้าสำรอง','anchor',{pose:5,power:100,cd:22}),
   s('mountain-fist','หมัดสะท้อนภูผา','ตั้งรับแล้วสวน 180 ดาเมจ ใช้ได้หนึ่งครั้งต่อการตั้งรับ','counter',{pose:9,power:180,seconds:4,cd:25})
  ],passives:[p('iron-blood','เลือดนักสู้','HP สูงสุดเพิ่ม 20%','maxHp',.2),p('unbroken','ใจไม่ยอมล้ม','เมื่อ HP ต่ำกว่า 35% รับดาเมจน้อยลง 20%','lowGuard',.2)]}
 ]},
 {id:'rogue',name:'จอมโจร / มีดคู่',color:'#c69bea',role:'ลอบโจมตี · พิษ · ปลดตัวจากวงล้อม',weakness:'ตัวบาง ท่าปิดบัญชีแรงเมื่อเตรียมพิษหรือเข้าพรางตัวแล้ว',base:[
  s('stealth','พรางเงา','พรางตัว 5 วินาที การโจมตีครั้งถัดไปแรงขึ้นแล้วเปิดเผยตัว','stealth',{pose:5,seconds:5,cd:12}),
  s('backstab','มีดเงาทะลวง','เข้าถึงเป้า โจมตีจากพรางตัวแรงขึ้น 60%','backstab',{pose:7,power:90,cd:7}),
  s('hamstring','เฉือนเอ็น','ทำดาเมจและลดความเร็วศัตรู 50%','slow',{pose:2,power:65}),
  s('poison','มีดอาบพิษ','ทำให้เป้าติดพิษ 6 วินาที เตรียมระเบิดพิษภายหลัง','poison',{pose:6,power:30,seconds:6}),
  s('smoke','ควันพรางทาง','กางควันให้เพื่อนในวงหลบหลีกเพิ่มชั่วคราว','smoke',{pose:5,cd:14,seconds:5}),
  s('execution','มีดปิดชีพ','แรงเป็นสองเท่าเมื่อเป้า HP ต่ำกว่า 35%','execute',{pose:9,power:125,cd:15})
 ],branches:[
  {id:'shadow',name:'โจรเงา',role:'เคลื่อนย้าย · ล่อเป้า · ช่วยหลบ',active:[
   s('clones','เงาแยกร่าง','เงาล่อศัตรูให้เปลี่ยนเป้า พร้อมพรางตัวเจ้าของ','clones',{pose:8,cd:22,seconds:6}),
   s('shadow-curtain','ม่านเงาคุ้มกัน','ควันใหญ่ให้ทั้งทีมหลบหลีกและล้างความกลัว','smoke',{pose:5,cd:24,seconds:8,radius:4}),
   s('moon-dive','จู่โจมจันทรา','เข้าประชิดแล้วแทงจากเงา หากพรางอยู่แรงขึ้น','backstab',{pose:9,power:170,cd:20})
  ],passives:[p('long-shadow','เงาทอดยาว','พรางตัวนานขึ้น 2 วินาที','stealthDuration',2),p('shadow-step','ก้าวเงา','โจมตีจากพรางคืน MP 10 หน่วย','stealthMana',10)]},
  {id:'assassin',name:'มือมีดอาคม',role:'พิษสะสม · ระเบิดเป้าเดี่ยว',active:[
   s('venom-blade','คมมีดพิษอาคม','พิษแรงต่อเนื่อง 8 วินาที ไม่ซ้อนพิษชนิดเดิมทับหลายชั้น','venom',{pose:6,power:48,seconds:8,cd:17}),
   s('venom-burst','พิษระเบิดจุดตาย','ใช้พิษที่เหลือบนเป้าระเบิดเป็นดาเมจ ต้องติดพิษก่อน','detonatePoison',{pose:9,power:100,cd:14}),
   s('sunset-blade','มีดดับตะวัน','แทงประหาร เป้าต่ำกว่า 35% รับดาเมจสองเท่า','execute',{pose:7,power:210,cd:28})
  ],passives:[p('deep-venom','พิษฝังลึก','พิษอยู่นานขึ้น 2 วินาที','poisonDuration',2),p('last-drop','พิษหยดสุดท้าย','ดาเมจต่อเป้าติดพิษ HP ต่ำกว่า 35% เพิ่ม 25%','venomFinish',.25)]}
 ]},
 {id:'shaman',name:'หมอผี',color:'#63decb',role:'คำสาป · วิญญาณ · เขตอาคม',weakness:'ต้องเตรียมคำสาปและเขต ไม่มีฮีลหลักหรือชุบแทนพระ',base:[
  s('curse','ผูกคำสาป','คำสาปทำดาเมจเบาและเตรียมแรงสำหรับระเบิดอาคม','curse',{pose:0,power:35,seconds:8}),
  s('thread','ด้ายตรึงวิญญาณ','ผูกด้ายตรึงมอน ขัดบอสด้วยค่าเสียหลัก','bind',{pose:2,power:40,seconds:3}),
  s('spirit','พรายคุ้มกาย','เรียกพราย 14 วินาที ยิงช่วยและให้โล่เจ้าของ','spirit',{pose:8,seconds:14,cd:20}),
  s('talisman','ยันต์ระเบิด','วางยันต์บนพื้นที่ ระเบิดเมื่อศัตรูเข้าวง','mine',{pose:2,power:110,cd:10}),
  s('curse-burst','ถอนคำสาปแตก','ระเบิดคำสาปจากเป้าหนึ่งไปยังศัตรูรอบ ๆ ต้องสาปก่อน','detonateCurse',{pose:6,power:125,cd:10}),
  s('great-spirit','พรายอาละวาด','คลื่นวิญญาณเป็นวง ทำดาเมจและชะลอ','soulWave',{pose:9,power:130,cd:17})
 ],branches:[
  {id:'spirit-master',name:'จ้าววิญญาณ',role:'คุมพราย · คำสาปกระจาย',active:[
   s('spirit-lord','จ้าวพรายพิทักษ์','เรียกพรายใหญ่ 24 วินาที ช่วยยิงและให้โล่เจ้าของ','greatSpirit',{pose:8,seconds:24,cd:30}),
   s('soul-chain','พันธนาการวิญญาณ','มัดศัตรูเป็นกลุ่ม ขัดมอนและเพิ่มเสียหลักบอส','massBind',{pose:2,power:90,cd:20}),
   s('hundred-souls','คลื่นพรายร้อยตน','คลื่นพรายรอบเป้า แรงเพิ่มหากเป้ามีคำสาป','curseWave',{pose:9,power:170,cd:27})
  ],passives:[p('spirit-force','พรายเรืองฤทธิ์','พรายทำดาเมจเพิ่ม 25%','summonPower',.25),p('soul-return','ขวัญหวนคืน','ระเบิดคำสาปคืน MP 12 หน่วย','curseMana',12)]},
  {id:'yantra-master',name:'อาจารย์อาคม',role:'วางเขต · สะท้อนและคุ้มครอง',active:[
   s('twin-seals','ยันต์คู่คุ้มภัย','มอบโล่ให้เพื่อนในวง พร้อมสะท้อนแรงบางส่วน','ward',{pose:5,power:110,cd:20,seconds:7}),
   s('great-yantra','มหาวงนวหรคุณ','วงยันต์ลดดาเมจ 35% และชะลอศัตรูที่อยู่ในวง','yantra',{pose:9,power:35,seconds:8,cd:28}),
   s('reverse-fate','อาคมย้อนเคราะห์','ให้เพื่อนที่เลือกสะท้อนดาเมจ 35% และได้โล่ชั่วคราว','reflect',{pose:5,power:35,cd:22,seconds:6})
  ],passives:[p('ward-craft','ยันต์ลงรัก','โล่อาคมหนาขึ้น 25%','shieldBonus',.25),p('return-force','ย้อนแรงอาคม','ดาเมจสะท้อนเพิ่มอีก 10%','reflect',.1)]}
 ]},
 {id:'acolyte',name:'พระ / แม่ชี',color:'#ffe3a0',role:'ฮีลเพื่อน · ชำระสถานะ · คืนชีวิต',weakness:'ดาเมจปานกลาง ต้องใช้เวลาร่ายชุบและหาจุดปลอดภัย ไม่ชุบได้ถี่ ๆ',base:[
  s('holy','ธรรมประทีป','ดาเมจเวทปานกลาง แรงขึ้นกับศัตรูที่ติดคำสาป','holy',{pose:0,power:70,cd:4,mp:12}),
  s('heal','ปันขวัญเมตตา','ฮีลเพื่อนที่เลือก 135 HP หรือฮีลตนเมื่อเลือกตัวเอง','heal',{pose:4,power:135,cd:5}),
  s('regen','บัวฟื้นฟู','วางวงฮีลต่อเนื่อง เพื่อนต้องยืนในพื้นที่','regen',{pose:4,power:30,seconds:6,cd:14}),
  s('cleanse','ชำระอาถรรพ์','ล้างพิษ คำสาป ความกลัว และตรึงจากเพื่อนที่เลือก','cleanse',{pose:5,power:30,cd:9}),
  s('revive','คืนขวัญ','ร่าย 2 วินาที ชุบเพื่อนที่ล้มด้วย HP 35% ใช้กับคนเป็นไม่ได้','revive',{pose:8,power:35,windup:2,cd:40,mp:40,duration:2.8}),
  s('sanctuary','เขตบุญคุ้มภัย','วงคุ้มครองลดดาเมจทีม 30% ต้องอยู่ในวง','sanctuary',{pose:9,power:30,seconds:6,cd:20})
 ],branches:[
  {id:'healer',name:'ผู้บำเพ็ญเมตตา',role:'กู้ปาร์ตี้ · ฮีลวง · ชุบมีต้นทุน',active:[
   s('great-lotus','มหาบัวฟื้นฟู','ฮีลเพื่อนทุกคนในวง 180 HP และล้างพิษ','groupHeal',{pose:4,power:180,cd:22,mp:36}),
   s('great-revive','คืนขวัญมหาเมตตา','ร่าย 2.4 วินาที ชุบเพื่อนหนึ่งคน HP 65% พร้อมโล่','greatRevive',{pose:8,power:65,windup:2.4,cd:65,mp:55,duration:3.2}),
   s('life-tree','ต้นบุญคืนชีพ','ต้นบุญฟื้น HP ต่อเนื่อง 8 วินาที ชื่อนี้ไม่ใช่ชุบอัตโนมัติ','lifeTree',{pose:9,power:45,seconds:8,cd:35,mp:40})
  ],passives:[p('kindness','เมตตาเต็มเปี่ยม','ฮีลแรงขึ้น 20%','healBonus',.2),p('return-life','ขวัญแน่นแฟ้น','ชุบแล้วได้ HP เพิ่ม 10 จุดเปอร์เซ็นต์','reviveBonus',10)]},
  {id:'warder',name:'ผู้พิทักษ์ธรรม',role:'ป้องกันทีม · ล้างอาถรรพ์ · ช่วยดาเมจ',active:[
   s('dharma-dome','เขตธรรมพิทักษ์','วงคุ้มครองลดดาเมจ 50% แต่ไม่ทำให้เป็นอมตะ','sanctuary',{pose:9,power:50,seconds:7,cd:28}),
   s('curse-cut','ธรรมตัดอาถรรพ์','ล้างสถานะเพื่อนในวง พร้อมทำดาเมจแก่ศัตรูใกล้ ๆ','purify',{pose:5,power:95,cd:18}),
   s('holy-flame','เพลิงธรรมปราบมาร','เพลิงธรรมบนพื้น ดาเมจต่อเนื่อง แรงขึ้นกับศัตรูมีคำสาป','holyField',{pose:9,power:45,seconds:6,cd:24})
  ],passives:[p('sacred-ground','ฐานธรรมมั่นคง','วงคุ้มครองอยู่นานขึ้น 2 วินาที','sanctuaryDuration',2),p('light-edge','แสงตัดอาถรรพ์','ดาเมจธรรมต่อศัตรูติดคำสาปเพิ่ม 25%','holyBonus',.25)]}
 ]}
];
ROLES.forEach((r,row)=>{
 r.base.forEach((a,col)=>Object.assign(a,{classId:r.id,tier:'base',icon:{sheet:'role-skills-v1.png',cols:6,rows:7,row,col}}));
 r.branches.forEach((b,branch)=>{
  b.active.forEach((a,i)=>Object.assign(a,{classId:r.id,branchId:b.id,tier:'master',mp:Math.max(25,a.mp),duration:Math.max(a.duration,1.65),icon:{sheet:'master-skills-v1.png',cols:6,rows:7,row,col:branch*3+i}}));
  b.passives.forEach((a,i)=>Object.assign(a,{classId:r.id,branchId:b.id,tier:'master',icon:{sheet:'master-passives-v1.png',cols:4,rows:7,row,col:branch*2+i}}));
 });
});
export const ALL_SKILLS=ROLES.flatMap(r=>[...r.base,...r.branches.flatMap(b=>[...b.active,...b.passives])]);
export const roleById=id=>ROLES.find(r=>r.id===id);
export const skillById=id=>ALL_SKILLS.find(s=>s.id===id);
export function loadout(classId,branchId=''){
 const role=roleById(classId);if(!role)throw new Error('Unknown class');
 const branch=branchId?role.branches.find(b=>b.id===branchId):null;if(branchId&&!branch)throw new Error('Branch does not belong to class');
 return {role,branch,active:[...role.base,...(branch?.active??[])],passives:branch?.passives??[]};
}
export function paintIcon(el,skill){const {sheet,cols,rows,row,col}=skill.icon;el.classList.add('skill-art');el.style.backgroundImage=`url("./assets/skills-next/${sheet}")`;el.style.backgroundSize=`${cols*100}% ${rows*100}%`;el.style.backgroundPosition=`${col/(cols-1)*100}% ${row/(rows-1)*100}%`;}
