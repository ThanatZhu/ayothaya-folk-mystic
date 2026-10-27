export const CONQUEST_SHARD='conquest-shard',RAINBOW_SHARDS=100,RAINBOW_COINS=1_000_000;
export const conquestCount=(random=Math.random)=>1+Math.floor(Math.max(0,Math.min(1-Number.EPSILON,random()))*3);
export const conquestBoss=monster=>!!(monster?.mvp||monster?.worldBoss);
export const CONQUEST_ITEM={name:'เศษตราพิชิตอโยธยา',kind:'loot',image:'assets/rainbow-crafting/conquest-shard.webp',rainbow:true,sell:0,text:'ใช้ร่วมกับวัตถุดิบเดิม · สะสม 100 เศษ และ 1,000,000 เบี้ย เพื่อคราฟไอเท็มสายรุ้ง 1 ชิ้น · กิลด์วอร์อันดับ 1–3 สำหรับสมาชิกที่ร่วมรบ หรือ MVP/บอสโลก · สุ่มครั้งละ 1–3 เศษ'};
export function rainbowRecipe(out,originalNeeds={}){return {out,count:1,group:'gear',needs:{...originalNeeds,[CONQUEST_SHARD]:RAINBOW_SHARDS},coins:RAINBOW_COINS};}
