import {readFile,writeFile} from 'node:fs/promises';
import {MENTORS,MASTER_COURT} from '../city-life-data.js';
import {findPath,walkable} from '../combat-core.js';
const path=new URL('../maps/world.json',import.meta.url),catalog=JSON.parse(await readFile(path,'utf8')),m=catalog.maps.find(m=>m.id==='ayutthaya');
// Rebuild idempotently without removing the other districts or changing the safe zone.
for(const n of m.npcs.filter(n=>n.mentorId))m.nav.props=m.nav.props.filter(p=>p[0]!==n.x||p[1]!==n.z);
m.npcs=m.npcs.filter(n=>!n.mentorId);
m.clearedCourtTrees=[[45,-61]];m.plants=m.plants.filter(p=>!m.clearedCourtTrees.some(([x,z])=>p[1]===x&&p[2]===z));m.nav.props=m.nav.props.filter(p=>!m.clearedCourtTrees.some(([x,z])=>p[0]===x&&p[1]===z));
const guide=m.npcs.find(n=>n.name==='ครูแสนดาบ');if(guide&&guide.x===42){m.nav.props=m.nav.props.filter(p=>p[0]!==guide.x||p[1]!==guide.z);guide.x=24;guide.z=-64;guide.text='ลานครูอยู่ข้างหน้านี้ ครูแต่ละสายรอรับผู้ฝึกตนระดับ 25 และศิษย์ระดับ 60 มาทำบททดสอบ';m.nav.props.push([guide.x,guide.z,.45]);}
m.masterCourt=MASTER_COURT;m.plazas=m.plazas.filter(p=>!(p[0]===38&&p[1]===-70));m.plazas.push([38,-70,12,12]);
const district=m.districts.find(d=>d.x===38&&d.z===-70);district.name=MASTER_COURT.name;
m.landmarks=m.landmarks.map(l=>l[1]===38&&l[2]===-70?[MASTER_COURT.name,38,-70]:l);
for(const a of MENTORS){if(!walkable(a.x,a.z,.3,m.nav))throw new Error('Mentor spot blocked: '+a.id);m.npcs.push({...a,mentorId:a.id,texture:0});m.nav.props.push([a.x,a.z,.43]);}
const loops=[[[2,0],[20,0],[20,-30],[2,-30]],[[36,-26],[38,-37],[10,-32],[6,-5]],[[0,-34],[0,-64],[37,-70],[38,-34]],[[-44,-3],[-44,-30],[-4,-32],[-3,0]],[[-44,-34],[-44,-68],[-4,-70],[-3,-34]],[[0,-70],[0,-91],[38,-96],[38,-74]],[[38,-32],[38,-49],[54,-49],[54,-31]],[[-44,-70],[-44,-95],[-4,-96],[-3,-73]]];
m.citizens=[];
for(let i=0;i<16;i++){const points=loops[i%loops.length].map(([x,z])=>({x,z})),route=[];
 for(let k=0;k<points.length;k++){const from=points[k],to=points[(k+1)%points.length];if(!walkable(from.x,from.z,.32,m.nav)||!walkable(to.x,to.z,.32,m.nav))throw new Error('Citizen waypoint blocked '+i);const path=findPath(from,to,m.nav);if(!path.length)throw new Error('Citizen route disconnected '+i);route.push({...from,rest:true},...path.slice(0,-1));}
 const compact=[];for(const p of route){while(compact.length>1&&!compact.at(-1).rest){const a=compact.at(-2),b=compact.at(-1),cross=(b.x-a.x)*(p.z-b.z)-(b.z-a.z)*(p.x-b.x),dot=(b.x-a.x)*(p.x-b.x)+(b.z-a.z)*(p.z-b.z);if(Math.abs(cross)>.00001||dot<0)break;compact.pop();}compact.push(p);}
 m.citizens.push({id:'citizen-'+i,style:(i+Math.floor(i/8))%8,speed:.85+(i%5)*.09,pause:1.8+(i%4)*.5,offset:i*13.73,route:compact});
}
catalog.version=Math.max(catalog.version??0,195);await writeFile(path,JSON.stringify(catalog,null,2)+'\n');console.log('Added',MENTORS.length,'mentors and',m.citizens.length,'pedestrians');
