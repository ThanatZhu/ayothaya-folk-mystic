// Party dungeons (owner 8–9 Nov 2026): entered from the menu, up to 5 players, rules shared by the realm and the window.
// Design: docs/superpowers/specs/2026-11-08-party-dungeons-design.md. A new dungeon is one more entry here plus its map and art.
export const MAX_PARTY=5,CHESTS_PER_DAY=3,SHARDS_PER_PIECE=500,READY_SECONDS=20;
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
export const DUNGEONS=[{
 id:'krasue',name:'เรือนกระสือริมคลอง',level:35,map:'dg-krasue',set:'krasue',shard:'shard-krasue',atkBase:.05,
 cover:'assets/dungeon-krasue/cover.webp',
 story:{
  enter:['หมู่บ้านริมคลองนอกกรุงศรี ไก่และวัวหายไปทุกคืน','ชาวบ้านเห็นแสงลอยออกจากเรือนไม้หลังใหญ่ของแม่หญิงผู้ดี','คืนนี้พวกเราจะบุกเข้าไปในเรือนหลังนั้น'],
  boss:['ห้องนอนบนเรือนเงียบผิดปกติ','แม่หญิงนั่งพัดอยู่กลางห้อง ดวงตาแดงก่ำ','"มาถึงที่นี่ ก็อย่าหวังว่าจะได้กลับ"'],
 },
 rooms:[
  {kind:'waves',name:'ลานบ้าน',start:{x:.5,z:56},door:{x:0,z:22,to:1},center:{x:0,z:32},
   waves:[[[W,4]],[[W,3],[K,2]],[[K,3],[W,3]]]},
  {kind:'lanterns',name:'ใต้ถุนเรือน',start:{x:0,z:14},door:{x:0,z:-25,to:2},center:{x:0,z:0},
   lanterns:[{x:-31,z:2},{x:0,z:2},{x:30,z:2},{x:0,z:-10}],hold:3,spawn:{type:H,every:8,max:4}},
  {kind:'miniboss',name:'ครัวไฟ',start:{x:-5,z:-40},door:{x:5,z:-30,to:3},center:{x:-10,z:-35},
   boss:'dg35-krahang-chief',summonAt:.5,summon:[H,2]},
  {kind:'boss',name:'ห้องนอนบนเรือน',start:{x:16,z:-34},center:{x:32,z:-32},delay:3,
   boss:'dg35-mae-krasue',phase2:'dg35-mae-krasue-head',at:.5,adds:{type:W,every:12,max:3},hellAdds:{type:K,every:10,max:2}},
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
