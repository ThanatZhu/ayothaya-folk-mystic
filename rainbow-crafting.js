export const CONQUEST_SHARD='conquest-shard',RAINBOW_SHARDS=100,AMULET_CRAFT_SHARDS=50_000,CONQUEST_STACK=999_999,RAINBOW_COINS=1_000_000;
export const conquestCount=(random=Math.random)=>1+Math.floor(Math.max(0,Math.min(1-Number.EPSILON,random()))*3);
export const conquestBoss=monster=>!!(monster?.mvp||monster?.worldBoss);
export const CONQUEST_ITEM={name:'เศษตราพิชิตอโยธยา',kind:'loot',image:'assets/rainbow-crafting/conquest-shard.webp',rainbow:true,sell:0,text:'ใช้ร่วมกับวัตถุดิบเดิม · พระเครื่องรุ้งใช้ 50,000 เศษต่อองค์ อุปกรณ์รุ้งอื่นใช้ 100 เศษต่อชิ้น · ค่าคราฟ 1,000,000 เบี้ย · กิลด์วอร์อันดับ 1–3 สำหรับสมาชิกที่ร่วมรบ หรือ MVP/บอสโลก · สุ่มครั้งละ 1–3 เศษ'};
export function rainbowRecipe(out,originalNeeds={},shards=RAINBOW_SHARDS){return {out,count:1,group:'gear',needs:{...originalNeeds,[CONQUEST_SHARD]:shards},coins:RAINBOW_COINS};}
