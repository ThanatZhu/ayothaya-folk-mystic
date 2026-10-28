// node rebirth-nav.mjs <repo> <map-id>: the baked grid (maps-v7/<id>/nav-new.json) -> <repo>/maps/rebirth196/<id>.nav.json
// The bake sees the river bed as floor, so the layout's water cells are blocked unless a bridge deck covers them;
// cells the spawn cannot reach are blocked too (no pockets behind trees or across water).
import fs from 'node:fs';
const [repo,id]=process.argv.slice(2),here=new URL('.',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1');
const L=JSON.parse(fs.readFileSync(`${repo}/scripts/rebirth196/layouts/${id}.json`,'utf8'));
const nav=JSON.parse(fs.readFileSync(`${here}${id}/nav-new.json`,'utf8'));
const rows=nav.rows.map(r=>r.split(''));
const seg=(p,a,c)=>{const vx=c[0]-a[0],vy=c[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));return Math.hypot(p[0]-a[0]-vx*t,p[1]-a[1]-vy*t);};
let water=0;
for(let j=0;j<nav.h;j++)for(let i=0;i<nav.w;i++){
 const x=nav.x0+i*nav.cell,y=-(nav.z0+j*nav.cell);   // Blender x, y
 const wet=(L.water??[]).some(([a,c,wd,d])=>Math.abs(x-a)<wd/2&&Math.abs(y-c)<d/2);
 const deck=(L.bridges??[]).some(([p,q,wd])=>seg([x,y],p,q)<wd/2-.9);
 if(wet&&!deck&&rows[j][i]!=='.'){rows[j][i]='.';water++;}
}
const at=([x,y])=>[Math.round(x-nav.x0),Math.round(-y-nav.z0)];
const [si,sj]=at(L.spawn),seen=new Set([si+','+sj]),todo=[[si,sj]];
if(rows[sj][si]==='.')throw Error('spawn blocked');
while(todo.length){const [i,j]=todo.pop();for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj,k=a+','+b;if(a>=0&&b>=0&&a<nav.w&&b<nav.h&&rows[b][a]!=='.'&&!seen.has(k)){seen.add(k);todo.push([a,b]);}}}
let orphan=0;
for(let j=0;j<nav.h;j++)for(let i=0;i<nav.w;i++)if(rows[j][i]!=='.'&&!seen.has(i+','+j)){rows[j][i]='.';orphan++;}
for(const [name,p] of [...Object.entries(L.portals),...Object.entries(L.npcs),['boss',L.bossArena.slice(0,2)],...L.monsterAreas.map(m=>[m.name,m.center])]){const [i,j]=at(p);let ok=false;for(let r=0;r<=4&&!ok;r++)for(let di=-r;di<=r;di++)for(let dj=-r;dj<=r;dj++)if(seen.has((i+di)+','+(j+dj)))ok=true;if(!ok)throw Error(name+' not reachable');}
fs.writeFileSync(`${repo}/maps/rebirth196/${id}.nav.json`,JSON.stringify({...nav,rows:rows.map(r=>r.join(''))}));
// keep the manifest honest: this map is built by rebirth.py, with this grid and this GLB
const mp=`${repo}/maps/rebirth196/manifest.json`,man=JSON.parse(fs.readFileSync(mp,'utf8')),info=man.maps.find(m=>m.id===id),glb=fs.readFileSync(`${repo}/maps/rebirth196/${id}.glb`),gj=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
let tris=0;for(const me of gj.meshes)for(const pr of me.primitives)tris+=(pr.indices!=null?gj.accessors[pr.indices].count:gj.accessors[pr.attributes.POSITION].count)/3;
Object.assign(info,{source:'scripts/rebirth196/rebirth.py',triangles:Math.round(tris),bytes:glb.length,walkableCells:seen.size,orphanCellsBlocked:orphan,v7:true});fs.writeFileSync(mp,JSON.stringify(man,null,2));
console.log('NAVPOST',id,'walkable',seen.size,'water blocked',water,'orphans blocked',orphan);
