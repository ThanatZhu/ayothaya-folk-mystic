import {WORLD_MAP_BOSSES,CHAPTER2_MONSTERS} from './chapter2-monsters.js';
const materials=['รวงข้าวอาคม','หมากแก้วอาคม','เฟืองโรงสีต้องมนตร์','เกล็ดบัวทมิฬ','แก่นไผ่วิญญาณ','เศษสำริดโบราณ','ยางไม้หิมพานต์','เกล็ดนาคบาดาล','ผลึกเมฆาไกรลาส'];
const seals=['ตราขุนฟาง','ตราวานรหมากทอง','ตราอสุรโรงสี','ตราเต่าบัวทมิฬ','ตราปอบเจ้าดง','ตราระฆังอาถรรพ์','ตราคชสารพฤกษ์','ตรานาคบาดาล','ตรายักษ์เมฆา'];
export const WORLD_DROP_ITEMS={};
export const WORLD_CARD_ATLASES={};
WORLD_MAP_BOSSES.forEach((b,i)=>{
 WORLD_DROP_ITEMS[b.material]={atlas:'world125',icon:i,name:materials[i],kind:'loot',sell:30*(i+1),text:'วัตถุดิบจาก '+b.mapName+' · ใช้สร้างตราประจำแมพ'};
 const def=3+i*2,vitality=2+i;
 WORLD_DROP_ITEMS[b.accessory]={atlas:'world125',icon:9+i,name:seals[i],kind:'gear',slot:'accessory',level:b.level,def,bonus:{vit:vitality,luk:1+Math.floor(i/2)},sell:1500*(i+1),worldBoss:b.id,text:'DEF +'+def+' · VIT +'+vitality+' · LUK +'+(1+Math.floor(i/2))+' · Lv.'+b.level+' · ของบอส '+b.name};
});
for(const m of CHAPTER2_MONSTERS){
 const atlas='card125-'+m.id,element=m.element,worldBoss=m.worldBoss;
 WORLD_CARD_ATLASES[atlas]='assets/monsters-chapter2/animations/'+m.id+'-poses-v1.png';
 const slot=worldBoss||m.elite?'armor':'weapon';
 const effect=worldBoss?{resist:{[element]:.18},hpPct:.08}:m.elite?{flee:.03,bonus:{vit:2}}:{vsElement:{[element]:.12}};
 WORLD_DROP_ITEMS['card-'+m.id]={atlas,icon:0,monsterCard:true,name:'การ์ด'+m.name,kind:'card',slot,effect,sell:worldBoss?5000:m.elite?1500:500,text:worldBoss?'ใส่ในเสื้อเกราะ · HP +8% · ต้านธาตุประจำตัว 18%':m.elite?'ใส่ในเสื้อเกราะ · หลบ +3% · VIT +2':'ใส่ในอาวุธ · โจมตีธาตุประจำตัวแรงขึ้น 12%'};
}
export function chapter2Drops(items){
 const out={};
 for(const m of CHAPTER2_MONSTERS){
  const b=WORLD_MAP_BOSSES.find(b=>b.mapId===m.mapId),boss=m.worldBoss,rank=b.order;
  const loot=[[b.material,boss?1:m.elite?.85:.45,boss?5:1],['hp-large',boss?1:.1,boss?5:1],['mp-large',boss?.85:.08,boss?3:1],['card-'+m.id,boss?.002:m.elite?.001:.0004]];
  if(boss)loot.push([b.accessory,.08],['lek-lai',.65,1+Math.floor(rank/3)],['break-guard',.12]);
  else if(m.elite)loot.push(['lek-lai',.08]);
  for(const [id] of loot)if(!items[id])throw new Error('Unknown map drop: '+id);
  out[m.id]={coins:boss?[1000*rank,1500*rank]:m.elite?[80*rank,120*rank]:[15*rank,25*rank],items:loot};
 }
 return out;
}
export const WORLD_RELIC_RECIPES=WORLD_MAP_BOSSES.map(b=>({out:b.accessory,count:1,group:'gear',needs:{[b.material]:30+b.order*5,'lek-lai':1+Math.floor(b.order/3)},coins:1000*b.order}));
