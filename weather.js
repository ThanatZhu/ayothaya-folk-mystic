// 0.97 weather: every 15 minutes each outdoor map rolls its weather from the clock alone, so every player (and the
// server) agrees without sending anything. Dungeons (instance maps) and caves (map.indoor) stay dry.
export const WEATHER_SLOT=15*60e3;
export const WEATHERS={
 clear:{name:'แจ่มใส',icon:'☀️',text:'ท้องฟ้าโปร่ง',rain:0,dim:1,fog:1,weight:50},
 drizzle:{name:'ฝนปรอย',icon:'🌦️',text:'ฝนตกพรำ ๆ ทั่วแผนที่',rain:.35,dim:.82,fog:.75,weight:22},
 mist:{name:'หมอกยามเช้า',icon:'🌫️',text:'หมอกลงจัด มองไกลไม่ค่อยเห็น',rain:0,dim:.9,fog:.4,weight:16},
 storm:{name:'พายุฝน',icon:'⛈️',text:'ฝนหนัก ฟ้าแลบเป็นระยะ',rain:1,dim:.58,fog:.5,lightning:true,weight:12},
};
const IDS=Object.keys(WEATHERS),TOTAL=IDS.reduce((n,k)=>n+WEATHERS[k].weight,0);
// Small integer hash (FNV-1a) of the slot and map id → a stable roll in [0, TOTAL).
function roll(slot,mapId){let h=2166136261;for(const c of slot+':'+mapId){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)%TOTAL;}
export function weatherAt(now,map){
 const slot=Math.floor(now/WEATHER_SLOT),endsAt=(slot+1)*WEATHER_SLOT;
 if(!map||map.instance||map.indoor)return {id:'clear',...WEATHERS.clear,endsAt};
 let r=roll(slot,map.id);for(const id of IDS){r-=WEATHERS[id].weight;if(r<0)return {id,...WEATHERS[id],endsAt};}
 return {id:'clear',...WEATHERS.clear,endsAt};
}
