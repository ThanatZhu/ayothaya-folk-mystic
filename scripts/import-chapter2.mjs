// Import the reviewed Blender environments; this release opens exploration only.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {walkable,findPath} from '../combat-core.js';
import {moveBody} from '../combat-core.js';
import {createRouteWalker} from '../route-walk.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outputs=path.resolve(root,'../../outputs');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'maps/world.json'),'utf8'));
const definitions=[
 ['bamboo-grove','ป่าไผ่ผีปอบ','Bamboo Ghost Grove','#9eae83','dusk'],
 ['ruined-temple','วัดร้างริมกรุงเก่า','Old Capital Temple Ruins','#d2ba87','day'],
 ['lablae','เมืองลับแล','Lablae Hidden Town','#b6d3a0','day'],
 ['himmapan-edge','ชายป่าหิมพานต์','Himmapan Forest Edge','#a7d5bc','day'],
 ['naga-cave','ถ้ำพญานาค','Naga Cave','#8bc9cd','cave'],
 ['kailash-peak','ยอดเขาไกรลาส','Kailash Peak','#e5d7b0','summit']
];
const ids=new Set(definitions.map(d=>d[0]));
catalog.maps=catalog.maps.filter(m=>!ids.has(m.id));
const rect=([x,y,w,d])=>({x:x-w/2,z:-y-d/2,w,d});
const point=([x,y])=>({x,z:-y});
const manifest=[];
for(const [id,name,nameEn,color,mood] of definitions){
 const source=path.join(outputs,id==='kailash-peak'?'kailash-v3':'chapter2-v2',id);
 const layout=JSON.parse(fs.readFileSync(path.join(source,id+'-layout.json'),'utf8'));
 const validation=JSON.parse(fs.readFileSync(path.join(source,'validation.json'),'utf8'));
 if(!validation.pass)throw Error('Unvalidated source: '+id);
 const grid=JSON.parse(fs.readFileSync(path.join(source,id+'-nav.json'),'utf8'));
 const bounds={x:-70,z:-70,w:140,d:140},nav={zones:[{...bounds}],obstacles:[],props:[],grid};
 const spawn=point(layout.spawn);
 const reach=p=>walkable(p.x,p.z,.6,nav)&&findPath(spawn,p,nav).length>0;
 const nearest=(p,accept=reach)=>{
  if(accept(p))return p;
  for(let r=.5;r<=8;r+=.5)for(let k=0;k<32;k++){
   const q={x:Math.round((p.x+r*Math.cos(k*Math.PI/16))*2)/2,z:Math.round((p.z+r*Math.sin(k*Math.PI/16))*2)/2};
   if(accept(q))return q;
  }
  throw Error('Unreachable location '+id+' '+JSON.stringify(p));
 };
 if(!walkable(spawn.x,spawn.z,.6,nav))throw Error('Blocked spawn '+id);
 const outsideRoad=p=>layout.roads.every(r=>r.slice(1,-1).every((end,i)=>{
  const a=point(r[i]),b=point(end),dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));
  return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)>=r.at(-1)/2+1.2;
 }));
 const npcSpot=p=>{
  if(!outsideRoad(p)||!walkable(p.x,p.z,2.2,nav)||!reach(p))return false;
  const previous=nav.props;nav.props=[...previous,[p.x,p.z,.43]];
  const canWalk=(target,radius)=>{
   const body={...spawn};let arrived=false;const walker=createRouteWalker(()=>nav);
   walker.go(target,{radius,onArrive:()=>arrived=true});
   for(let i=0;i<18000&&walker.active;i++){const d=walker.step(body,1/30);if(d)moveBody(body,d.x/6,d.z/6,nav);}
   return arrived;
  };
  const ok=[[0,1.5],[1.5,0],[-1.5,0],[0,-1.5]].every(([x,z])=>reach({x:p.x+x,z:p.z+z})&&canWalk({x:p.x+x,z:p.z+z},.65))&&canWalk(p,1.8);
  nav.props=previous;return ok;
 };
 const npcs=Object.entries(layout.npcs).map(([name,xy],i)=>{
  const p=nearest(point(xy),npcSpot);
  nav.props.push([p.x,p.z,.43]);
  return {name,...p,texture:i%4,text:'เส้นทางนี้เปิดให้สำรวจแล้ว มอนสเตอร์และภารกิจบทใหม่ยังไม่เปิด เดินตามทางไปยังประตูเพื่อชมดินแดนถัดไปได้'};
 });
 nav.props=npcs.map(n=>[n.x,n.z,.43]);
 const portals=Object.entries(layout.portals).filter(([to])=>to!=='sealed').map(([to,xy])=>({to,...nearest(point(xy))}));
 const districts=Object.entries(layout.districts).map(([name,xy])=>({name,...nearest(point(xy))}));
 const roads=layout.roads.flatMap(r=>r.slice(1,-1).map((b,i)=>({a:[r[i][0],-r[i][1]],b:[b[0],-b[1]],width:r.at(-1)})));
 const bridges=layout.bridges.map(([a,b,width])=>({x:Math.min(a[0],b[0])-(a[0]===b[0]?width/2:0),z:-Math.max(a[1],b[1])-(a[1]===b[1]?width/2:0),w:Math.abs(b[0]-a[0])||width,d:Math.abs(b[1]-a[1])||width}));
 catalog.maps.push({id,name,nameEn,subtitle:'พื้นที่สำรวจ · มอนสเตอร์และเควสบทใหม่ยังไม่เปิด',exploration:true,safe:id==='lablae',kind:id==='lablae'?'town':'field',region:'chapter2',mood,color,
  spawn,bounds,nav,npcs,mobs:[],portals,districts,landmarks:districts.map(d=>[d.name,d.x,d.z]),roads,bridges,
  plazas:layout.plazas,waterAreas:(layout.water??[]).map(rect),plants:[],decor:[],leafSources:[],citizens:[],
  scene:'maps/v4/'+id+'.glb',layoutRevision:id==='kailash-peak'?'kailash-v3':'chapter2-v2'});
 for(const [from,to] of [[id+'.glb','maps/v4/'+id+'.glb'],['loading.webp','assets/loading105/'+id+'.webp'],[id+'-layout.json','maps/chapter2-layouts/'+id+'.json']]){
  const dest=path.join(root,to);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(source,from),dest);
 }
 const blob=fs.readFileSync(path.join(source,id+'.glb'));
 manifest.push({id,name,scene:'maps/v4/'+id+'.glb',bytes:blob.length,sha256:createHash('sha256').update(blob).digest('hex'),source:catalog.maps.at(-1).layoutRevision,triangles:validation.triangles});
}
const marsh=catalog.maps.find(m=>m.id==='lotus-marsh');
marsh.portals=marsh.portals.filter(p=>p.to!=='bamboo-grove');
// Northern lotus island, clear of its existing monster and all bridge mouths.
const gate={to:'bamboo-grove',x:-6,z:49};
if(!walkable(gate.x,gate.z,.6,marsh.nav)||!findPath(marsh.spawn,gate,marsh.nav).length)throw Error('Marsh gateway is blocked');
marsh.portals.push(gate);
catalog.version=65;
fs.writeFileSync(path.join(root,'maps/world.json'),JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync(path.join(root,'maps/chapter2-manifest.json'),JSON.stringify({release:'0.105.0',mode:'exploration',maps:manifest},null,2)+'\n');
console.log('Imported six reviewed scenes with matching nav grids, NPCs and reciprocal portals.');
