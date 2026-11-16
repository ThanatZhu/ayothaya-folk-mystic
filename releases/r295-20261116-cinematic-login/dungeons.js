// Party dungeons (owner 8–9 Nov 2026): entered from the menu, up to 5 players, rules shared by the realm and the window.
// Design: docs/superpowers/specs/2026-11-08-party-dungeons-design.md. A new dungeon is one more entry here plus its map and art.
export const MAX_PARTY=5,CHESTS_PER_DAY=3,SHARDS_PER_PIECE=500,READY_SECONDS=20;
// Every clear (owner 9 Nov): cowries = level x 40 x difficulty, and 1..(shards+1) refine stones of a random kind.
export const CLEAR_COINS_PER_LEVEL=40,CLEAR_STONES=['iron-ore','laterite'];
// Monster HP by party size at the start of the run (1..5 players); damage is not scaled by size.
export const PARTY_HP=[.45,.6,.75,.9,1];
// Chance that the chest holds a set piece, by party size (1..5).
export const PIECE_CHANCE=[.5,.6,.7,.85,1];
// grades: [GRADES index, chance] (0 blue, 1 green, 2 purple, 3 orange, 4 red).
export const DIFFICULTY={
 normal:{name:'ปกติ',mul:1,shards:1,grades:[[0,.6],[1,.3],[2,.1]]},
 hard:{name:'ยาก',mul:1.6,shards:2,grades:[[1,.5],[2,.35],[3,.15]]},
 hell:{name:'นรก',mul:2.5,shards:3,grades:[[2,.5],[3,.4],[4,.1]]},
};
const W='dg35-krasue-wisp',K='dg35-khamot',H='dg35-krahang';
// Every dungeon map is built on the krasue walkable layout (scripts/build-dungeon-maps.py), so they share room geometry.
const S1={start:{x:0,z:52},area:{x:-13,z:28,w:26,d:20},gate:{x:0,z:27.6},hold:{x:0,z:31},center:{x:0,z:38}};
const S2={start:{x:0,z:25},area:{x:-7,z:-10,w:14,d:32},gate:{x:0,z:-10.6},hold:{x:0,z:-7},center:{x:0,z:6}};
const S3={start:{x:-6,z:-20},area:{x:-27,z:-32,w:18,d:16},gate:{x:-18,z:-32.6},hold:{x:-18,z:-29},center:{x:-18,z:-24}};
const S4={start:{x:-18,z:-36},area:{x:-31,z:-65,w:26,d:26},center:{x:-18,z:-52}};
const SPOTS=[{x:-4,z:16},{x:4,z:10},{x:-4,z:2},{x:4,z:-5}];
const mob=(lv,id)=>'dg'+lv+'-'+id;
export const DUNGEONS=[{
 id:'krasue',name:'เรือนกระสือริมคลอง',level:35,map:'dg-krasue',set:'krasue',shard:'shard-krasue',atkBase:.05,
 cover:'assets/dungeon-krasue/cover.webp',
 story:{
  enter:['หมู่บ้านริมคลองนอกกรุงศรี ไก่และวัวหายไปทุกคืน','ชาวบ้านเห็นแสงลอยออกจากเรือนไม้หลังใหญ่ของแม่หญิงผู้ดี','คืนนี้พวกเราจะบุกเข้าไปในเรือนหลังนั้น'],
  boss:['ห้องนอนบนเรือนเงียบผิดปกติ','แม่หญิงนั่งพัดอยู่กลางห้อง ดวงตาแดงก่ำ','"มาถึงที่นี่ ก็อย่าหวังว่าจะได้กลับ"'],
 },
 rooms:[
  // one path (owner 9 Nov): a section wakes when the team walks into its area; its spirit gate opens once it is cleared
  {kind:'waves',name:'ลานบ้าน',start:{x:0,z:52},area:{x:-13,z:28,w:26,d:20},gate:{x:0,z:27.6},hold:{x:0,z:31},center:{x:0,z:38},
   waves:[[[W,4]],[[W,3],[K,2]],[[K,3],[W,3]]]},
  {kind:'lanterns',name:'ใต้ถุนเรือน',start:{x:0,z:25},area:{x:-7,z:-10,w:14,d:32},gate:{x:0,z:-10.6},hold:{x:0,z:-7},center:{x:0,z:6},
   lanterns:[{x:-4,z:16},{x:4,z:10},{x:-4,z:2},{x:4,z:-5}],lanternWaves:[[[H,2]],[[H,3]],[[H,3],[W,2]],[[H,4],[K,2]]]},
  {kind:'miniboss',name:'ครัวไฟ',start:{x:-6,z:-20},area:{x:-27,z:-32,w:18,d:16},gate:{x:-18,z:-32.6},hold:{x:-18,z:-29},center:{x:-18,z:-24},
   boss:'dg35-krahang-chief',summonAt:.5,summon:[H,2]},
  {kind:'boss',name:'ห้องนอนบนเรือน',start:{x:-18,z:-36},area:{x:-31,z:-65,w:26,d:26},center:{x:-18,z:-52},delay:3,
   boss:'dg35-mae-krasue',phase2:'dg35-mae-krasue-head',at:.5,phase2Text:'หัวของแม่กระสือหลุดลอยขึ้นกลางห้อง!',phase2Label:'ร่างกระสือ',adds:{type:W,every:12,max:3},hellAdds:{type:K,every:10,max:2}},
 ],
},{
 // Lv.45 (owner 10 Nov): room 2 = cut four cursed stumps, each calls a wave of root ghouls
 id:'takhian',name:'ป่าตะเคียนร้อยปี',level:45,map:'dg-takhian',set:'takhian',shard:'shard-takhian',atkBase:.055,
 cover:'assets/dungeon-takhian/cover.webp',
 story:{
  enter:['คนตัดไม้หายไปทีละคนในป่าลึกนอกกรุง','ทุกคนที่หายไปเคยตัดกิ่งตะเคียนยักษ์ต้นเดียวกัน','คืนนี้พวกเราจะเข้าไปหาต้นตะเคียนต้นนั้น'],
  boss:['ใต้ต้นตะเคียนยักษ์มีผ้าแพรผูกเต็มลำต้น','หญิงผมยาวยืนนิ่งอยู่ในเงาไม้','"ใครทำร้ายต้นไม้ของข้า ต้องชดใช้"'],
 },
 rooms:[
  {...S1,kind:'waves',name:'ทางเข้าป่า',waves:[[[mob(45,'leaf-phrai'),4]],[[mob(45,'leaf-phrai'),3],[mob(45,'phi-pong'),2]],[[mob(45,'phi-pong'),3],[mob(45,'leaf-phrai'),3]]]},
  {...S2,kind:'lanterns',name:'ลานรากไม้',object:{name:'ตอไม้ต้องสาป',verb:'ฟัน'},lanterns:SPOTS,
   lanternWaves:[[[mob(45,'root-ghoul'),2]],[[mob(45,'root-ghoul'),3]],[[mob(45,'root-ghoul'),3],[mob(45,'leaf-phrai'),2]],[[mob(45,'root-ghoul'),4],[mob(45,'phi-pong'),2]]]},
  {...S3,kind:'miniboss',name:'กระท่อมพราน',boss:mob(45,'woodcutter'),summonAt:.5,summon:[mob(45,'root-ghoul'),2]},
  {...S4,kind:'boss',name:'ใต้ต้นตะเคียนยักษ์',delay:3,boss:mob(45,'nang-takhian'),phase2:mob(45,'takhian-tree'),at:.5,
   phase2Text:'นางตะเคียนจมหายเข้าไปในต้นไม้ · ต้นตะเคียนลุกขึ้นสู้!',phase2Label:'ร่างต้นตะเคียน',
   adds:{type:mob(45,'root-ghoul'),every:12,max:3},hellAdds:{type:mob(45,'phi-pong'),every:10,max:2}},
 ],
},{
 // Lv.55: room 2 = the tide comes in; clear it before the yard floods
 id:'samut',name:'อู่เรือผีเสื้อสมุทร',level:55,map:'dg-samut',set:'samut',shard:'shard-samut',atkBase:.065,
 cover:'assets/dungeon-samut/cover.webp',
 story:{
  enter:['เรือสำเภาหายกลางทะเลใกล้เกาะร้าง','ลูกเรือที่รอดมาเล่าว่าเห็นหญิงงามยืนบนโขดหินเรียกให้เรือเข้าฝั่ง','พวกเราจะล่องไปที่เกาะนั้น'],
  boss:['ในถ้ำกลางเกาะ น้ำทะเลเรืองแสงสีเขียว','หญิงงามสวมมงกุฎปะการังหันมายิ้ม','"คนบนเรือทุกลำเป็นของข้า รวมถึงพวกเจ้าด้วย"'],
 },
 rooms:[
  {...S1,kind:'waves',name:'ชายหาดซากเรือ',waves:[[[mob(55,'ghost-mermaid'),4]],[[mob(55,'ghost-mermaid'),3],[mob(55,'sea-phrai'),2]],[[mob(55,'sea-phrai'),3],[mob(55,'ghost-mermaid'),3]]]},
  {...S2,kind:'waves',name:'อู่เรือน้ำขึ้น',tide:{seconds:75,pct:.05},
   waves:[[[mob(55,'shell-crab'),4]],[[mob(55,'shell-crab'),3],[mob(55,'ghost-mermaid'),2]],[[mob(55,'shell-crab'),4],[mob(55,'sea-phrai'),2]]]},
  {...S3,kind:'miniboss',name:'ดาดฟ้าเรือสำเภา',boss:mob(55,'ghost-captain'),summonAt:.5,summon:[mob(55,'sea-phrai'),2]},
  {...S4,kind:'boss',name:'ถ้ำกลางเกาะ',delay:3,boss:mob(55,'suea-samut'),phase2:mob(55,'suea-samut-giant'),at:.5,
   phase2Text:'ผีเสื้อสมุทรเผยร่างจริง · ยักษ์ทะเลลุกขึ้นเต็มถ้ำ!',phase2Label:'ร่างยักษ์',
   adds:{type:mob(55,'shell-crab'),every:12,max:3},hellAdds:{type:mob(55,'sea-phrai'),every:10,max:2}},
 ],
},{
 // Lv.65: room 2 = four magic pots keep sending imps until every pot is broken; the boss calls kuman thong at half HP
 id:'saiyadam',name:'ตำหนักไสยดำ',level:65,map:'dg-saiyadam',set:'saiyadam',shard:'shard-saiyadam',atkBase:.07,
 cover:'assets/dungeon-saiyadam/cover.webp',
 story:{
  enter:['หมอผีที่ถูกขับออกจากกรุงไปตั้งตำหนักกลางหมู่บ้านร้าง','ทุกคืนมีเสียงเด็กหัวเราะ และของในหมู่บ้านลุกขึ้นเดินเอง','พวกเราต้องหยุดพิธีของมันให้ได้'],
  boss:['ห้องทำพิธีอบอวลด้วยควันสีม่วง','ชายร่างผอมที่เต็มไปด้วยรอยสักหันมาช้าๆ','"มาพอดี ข้ากำลังขาดเครื่องเซ่น"'],
 },
 rooms:[
  {...S1,kind:'waves',name:'ลานหมู่บ้านร้าง',waves:[[[mob(65,'straw-doll'),4]],[[mob(65,'straw-doll'),3],[mob(65,'phi-tai-hong'),2]],[[mob(65,'phi-tai-hong'),3],[mob(65,'straw-doll'),3]]]},
  {...S2,kind:'lanterns',name:'ห้องหม้อยันต์',mode:'break',object:{name:'หม้อยันต์',verb:'ทุบ'},lanterns:SPOTS,
   spawn:{type:mob(65,'pot-imp'),every:6,max:6}},
  {...S3,kind:'miniboss',name:'คอกหลังตำหนัก',boss:mob(65,'khwai-thanu'),summonAt:.5,summon:[mob(65,'straw-doll'),2]},
  {...S4,kind:'boss',name:'ห้องทำพิธี',delay:3,boss:mob(65,'mor-phi'),at:.5,summon:[mob(65,'kuman-thong'),2],
   phase2Text:'หมอผีเรียกกุมารทองออกมา!',
   adds:{type:mob(65,'pot-imp'),every:12,max:3},hellAdds:{type:mob(65,'phi-tai-hong'),every:10,max:2}},
 ],
},{
 // Lv.80: room 2 = hellfire bursts under the team's feet while the wardens attack
 id:'pret',name:'เมืองเปรตใต้บาดาล',level:80,map:'dg-pret',set:'pret',shard:'shard-pret',atkBase:.08,
 cover:'assets/dungeon-pret/cover.webp',
 story:{
  enter:['ใต้เมืองร้างแห่งหนึ่งมีบันไดลงไปใต้ดิน','ทุกคืนเดือนดับ เสียงหิวโหยดังขึ้นมาจากข้างล่าง','ประตูแดนเปรตเปิดแล้ว พวกเราต้องปิดมันให้ได้'],
  boss:['ท้องพระโรงใต้ดินลุกโชนด้วยไฟสีเขียว','ร่างสูงผอมสวมมงกุฎทองหม่นลุกจากบัลลังก์','"ความหิวของข้า ไม่เคยอิ่ม"'],
 },
 rooms:[
  {...S1,kind:'waves',name:'ถนนเมืองร้าง',waves:[[[mob(80,'hungry-pret'),4]],[[mob(80,'hungry-pret'),3],[mob(80,'fire-pret'),2]],[[mob(80,'fire-pret'),3],[mob(80,'hungry-pret'),3]]]},
  {...S2,kind:'waves',name:'สะพานไฟ',fire:{every:7,warn:1.6,radius:2.6,pct:.22},
   waves:[[[mob(80,'chain-guard'),4]],[[mob(80,'chain-guard'),3],[mob(80,'fire-pret'),2]],[[mob(80,'chain-guard'),4],[mob(80,'hungry-pret'),3]]]},
  {...S3,kind:'miniboss',name:'ประตูบาดาล',boss:mob(80,'yommatut'),summonAt:.5,summon:[mob(80,'hungry-pret'),2]},
  {...S4,kind:'boss',name:'ท้องพระโรงใต้ดิน',delay:3,boss:mob(80,'phaya-pret'),phase2:mob(80,'phaya-pret-giant'),at:.5,
   phase2Text:'พญาเปรตขยายร่างสูงจนเกือบเต็มห้อง!',phase2Label:'ร่างยักษ์',
   adds:{type:mob(80,'chain-guard'),every:12,max:3},hellAdds:{type:mob(80,'fire-pret'),every:10,max:2}},
 ],
}];
export const dungeonById=id=>DUNGEONS.find(d=>d.id===id)??null;
export const dungeonByMap=mapId=>DUNGEONS.find(d=>d.map===mapId)??null;
export const canEnter=(dungeon,level)=>!!dungeon&&level>=dungeon.level;
export const partyIndex=size=>Math.max(0,Math.min(MAX_PARTY,size|0||1)-1);
export function monsterScale(difficulty,size){const d=DIFFICULTY[difficulty]??DIFFICULTY.normal;return {hp:+(d.mul*PARTY_HP[partyIndex(size)]).toFixed(4),damage:d.mul};}
export function rollGradeFor(difficulty,rand=Math.random){
 const table=(DIFFICULTY[difficulty]??DIFFICULTY.normal).grades,r=rand();let acc=0;
 for(const [g,p] of table){acc+=p;if(r<acc)return g;}
 return table.at(-1)[0];
}
