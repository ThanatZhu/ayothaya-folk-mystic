import {routeDuration} from './citizen-routes.js';
// Authored street circuits, including the two actual canal bridges. Coordinates
// are game x/z; each segment is checked against the exported collision grid.
export function lablaeCitizens(){
 const circuits=[
  [[0,-38],[40,-35],[40,0],[40,32],[0,49],[0,24],[0,-8]],
  [[0,-38],[-12,-38],[-12,-28],[-28,-28],[-50,-28],[-50,0],[-50,24],[-28,24],[0,24],[0,-8]],
  [[0,-55],[0,-38],[0,-8],[0,24],[0,49],[0,55],[0,49],[0,24],[0,-8],[0,-38]],
  [[-50,-28],[-28,-28],[-12,-28],[-12,-38],[0,-38],[40,-35],[40,0],[40,-35],[0,-38],[-12,-38],[-12,-28],[-28,-28]]
 ];
 const texts=[
  'เดินชมตลาดลับแลได้เลยจ้ะ ข้ามคลองตรงสะพานแล้วเดินตามทางไปนะ',
  'ข้ากำลังหาบของไปส่งอีกฟากคลอง ขอทางหน่อยนะ',
  'ดอกไม้จากสวนฝั่งตะวันออก หอมชื่นใจดีนะ',
  'เดินเหนื่อยแล้วพักชมเมืองก่อนก็ได้ ย่านตลาดอยู่ฝั่งตะวันตก',
  'เมืองนี้สงบดี เดินตามถนนแล้วจะถึงย่านต่าง ๆ',
  'คลองเส้นนี้มีสะพานสองแห่ง ข้ามตรงสะพานจะปลอดภัยกว่า',
  'ลับแลมีทั้งย่านช่าง สวนดอกไม้ และวัด ลองเดินชมให้ทั่วเถิด',
  'กำลังเอางานสานไปส่งที่ตลาด ถ้าชอบงานฝีมือก็ลองไปชมย่านช่างนะ'
 ];
 return circuits.flatMap((points,k)=>Array.from({length:3},(_,i)=>{
  const slot=2*i+k%2,id=k*6+slot,style=id%8,speed=.9+(id%4)*.08,pause=3;
  const route=points.map(([x,z],j)=>({x,z,rest:j%3===0}));
  return {id:'lablae-citizen-'+(id+1),style,text:texts[style],speed,pause,offset:routeDuration(route,speed,pause)*slot/6,route};
 }));
}
