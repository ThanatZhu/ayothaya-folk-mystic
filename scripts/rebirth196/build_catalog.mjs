import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {walkable,findPath,MONSTER_TYPES} from '../../combat-core.js';import {REBIRTH_CHAPTERS,REBIRTH_MONSTER_SPECS} from '../../rebirth-content196.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),world=path.join(root,'maps/world.json'),catalog=JSON.parse(fs.readFileSync(world)),manifest=JSON.parse(fs.readFileSync(path.join(root,'maps/rebirth196/manifest.json')));
const xy=p=>({x:p[0],z:-p[1]}),box=([x,y,w,d])=>({x:x-w/2,z:-y-d/2,w,d});
for(const [index,c]of REBIRTH_CHAPTERS.entries()){
 const info=manifest.maps.find(m=>m.id===c.id),l=JSON.parse(fs.readFileSync(path.join(root,info.sourceLayout??info.layout))),grid=JSON.parse(fs.readFileSync(path.join(root,'maps/rebirth196/'+c.id+'.nav.json'))),nav={zones:[{x:-70,z:-70,w:140,d:140}],obstacles:[],props:[],grid},spawn=xy(l.spawn);
 const nearest=point=>{const p=xy(point);for(let r=0;r<=12;r+=.5)for(let k=0;k<Math.max(1,r*12);k++){const x=p.x+Math.cos(k/Math.max(1,r*12)*Math.PI*2)*r,z=p.z+Math.sin(k/Math.max(1,r*12)*Math.PI*2)*r;if(walkable(x,z,.6,nav)&&findPath(spawn,{x,z},nav).length)return {x:Math.round(x*10)/10,z:Math.round(z*10)/10};}throw Error('Unreachable '+c.id+' '+point);};
 if(!walkable(spawn.x,spawn.z,.6,nav))throw Error('Invalid spawn '+c.id);
 const npcs=Object.entries(l.npcs).map(([name,p])=>({name,...nearest(p),texture:name==='พระปัญญา'?1:name==='ทิพย์สุวรรณ'?0:2,text:'ห้าภพแห่งไฟต้นแสง · '+c.name,rebirthNPC:true}));
 const mobs=[];const types=REBIRTH_MONSTER_SPECS.filter(m=>m.mapId===c.id);
 for(let kind=0;kind<4;kind++){const camp=l.monsterAreas[kind];for(const offset of [[-3,-2],[3,-2],[0,0],[-3,3],[3,3]]){const p=nearest([camp.center[0]+offset[0],camp.center[1]+offset[1]]);mobs.push([p.x,p.z,MONSTER_TYPES.findIndex(m=>m.id===types[kind].id)]);}}
 for(const kind of [4,5]){const p=nearest(kind===4?[l.monsterAreas[1].center[0],l.monsterAreas[1].center[1]-6]:l.bossArena.slice(0,2));mobs.push([p.x,p.z,MONSTER_TYPES.findIndex(m=>m.id===types[kind].id)]);}
 const map={id:c.id,name:c.name,subtitle:'ภาคจุติ · Lv.'+c.level.join('–'),scene:info.scene,draft:true,rebirthChapter:index+1,minRebirth:1,minLevel:c.level[0],mood:c.mood,bounds:{x:-70,z:-70,w:140,d:140},nav,spawn,portals:Object.entries(l.portals).map(([to,p])=>({to,...nearest(p)})),npcs,citizens:[],mobs,plants:[],decor:[],packs:false,mobPopulation:1,safe:false,waterType:l.waterType??'water',waterAreas:l.waterType==='cooled-lava'?[]:l.water.map(box),bridges:l.bridges.map(([a,b,w])=>box([(a[0]+b[0])/2,(a[1]+b[1])/2,Math.abs(a[0]-b[0])+w,Math.abs(a[1]-b[1])+w])),roads:l.roads.flatMap(r=>r.slice(1,-1).map((p,i)=>({a:[r[i][0],-r[i][1]],b:[p[0],-p[1]],width:r.at(-1)}))),plazas:l.plazas,districts:Object.entries(l.districts).map(([name,p])=>({name,...xy(p)})),landmarks:Object.entries(l.districts).map(([name,[x,y]])=>[name,x,-y])};
 fs.writeFileSync(path.join(root,'maps/rebirth196/'+c.id+'.layout.json'),JSON.stringify(l,null,2));
 info.sourceLayout=info.sourceLayout??info.layout;info.layout='maps/rebirth196/'+c.id+'.layout.json';
 const at=catalog.maps.findIndex(m=>m.id===c.id);if(at>=0)catalog.maps[at]=map;else catalog.maps.push(map);
 console.log(c.id+': '+mobs.length+' monsters, '+npcs.length+' NPCs, all points path-connected');
}
const capital=catalog.maps.find(m=>m.id===catalog.capital),nav=capital.nav;if(capital.rebirthNPCObstacle)nav.props=nav.props.filter(p=>JSON.stringify(p)!==JSON.stringify(capital.rebirthNPCObstacle));let landing;
for(let r=0;r<=12&&!landing;r+=.5)for(let k=0;k<Math.max(1,r*12);k++){const x=2+Math.cos(k/Math.max(1,r*12)*Math.PI*2)*r,z=43+Math.sin(k/Math.max(1,r*12)*Math.PI*2)*r;if(walkable(x,z,1,nav)&&findPath(capital.spawn,{x,z},nav).length){landing={x,z};break;}}
if(!landing)throw Error('No reachable capital ferry landing');capital.portals=capital.portals.filter(p=>p.to!=='rebirth-ferry');capital.portals.push({to:'rebirth-ferry',...landing,minRebirth:1});capital.npcs=capital.npcs.filter(n=>!n.rebirthNPC);capital.npcs.push({name:'ยายจันทร์',x:landing.x+2,z:landing.z,texture:2,minRebirth:1,rebirthNPC:true,text:'หากเคยข้ามความตาย จงมาพายเรือข้ามภพไปด้วยกัน'});
fs.writeFileSync(path.join(root,'maps/rebirth196/manifest.json'),JSON.stringify(manifest,null,2));
capital.rebirthNPCObstacle=[landing.x+2,landing.z,.4];nav.props.push(capital.rebirthNPCObstacle);
catalog.version=Math.max(196,catalog.version);fs.writeFileSync(world,JSON.stringify(catalog,null,2)+'\n');
