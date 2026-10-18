// 0.62: bind gameplay to the Blender v2 scenes (outputs/blender-maps-v2/build_world.py layouts).
// Game z = -Blender y. Walk grids come from scripts/bake-nav-v2.py; every authored point is snapped to
// the nearest walkable, path-connected spot so NPCs, portals and monsters never sit in water or walls.
import {readFile,writeFile} from 'node:fs/promises';
import {walkable,findPath} from '../combat-core.js';
import {MENTORS,MASTER_COURT} from '../city-life-data.js';
const path=new URL('../maps/world.json',import.meta.url),catalog=JSON.parse(await readFile(path,'utf8'));
const B=(x,y,w,d)=>({x:x-w/2,z:-y-d/2,w,d});                                  // Blender centre rect -> game rect
const road=(pts,width)=>pts.slice(1).map((p,i)=>({a:[pts[i][0],-pts[i][1]],b:[p[0],-p[1]],width}));
const bridge=([ax,ay],[bx,by],w)=>({x:Math.min(ax,bx)-(ax===bx?w/2:0),z:-Math.max(ay,by)-(ay===by?w/2:0),w:Math.abs(bx-ax)||w,d:Math.abs(by-ay)||w});
const L={
 ayutthaya:{spawn:[0,36],portals:{'rice-fields':[0,66]},
  water:[B(-25,0,9,136),B(0,-49,137,10)],
  bridges:[...[-26,6,36].map(y=>bridge([-31,y],[-19,y],9)),bridge([0,-56],[0,-42],11)],
  roads:[...road([[0,-69],[0,-8],[0,25]],11),...[-26,6,36].flatMap(y=>road([[-62,y],[57,y]],9)),...road([[-47,-40],[-47,52]],6),...road([[38,-39],[38,53]],7)],
  plazas:[[0,-6,15,13],[0,-45,17,13],[40,-46,12,11]],
  districts:{'ท่าเรือเจ้าพระยา':[0,38],'ลานกลางเมือง':[8,-6],'ตลาดแม่บัว':[20,-6],'ย่านเรือนช่าง':[-47,-6],'สวนประทีป':[38,24],'วัดริมคลอง':[0,61],'ลานครูแห่งอโยธยา':[40,-46],'หน้าพระตำหนัก':[0,-31]},
  npcs:{'ลุงเรือง':[4,39],'ขุนอินทร์':[7,-1],'แม่บัว':[20,-1],'ครูแสนดาบ':[31,-31],'เจ้าจุก':[35,22],'พระปัญญา':[5,61]},
  loops:[[[2,26],[20,26],[20,-6],[2,-6]],[[36,24],[38,-6],[10,-8],[6,24]],[[0,-20],[2,-34],[36,-34],[38,-20]],[[-47,24],[-47,-6],[-4,-6],[-3,24]],
   [[-47,-8],[-47,-36],[-4,-36],[-3,-8]],[[0,36],[30,36],[38,10],[8,10]],[[22,-26],[56,-26],[56,-30],[22,-30]],[[-47,36],[-47,10],[-10,10],[-10,36]]]},
 'rice-fields':{spawn:[0,60],portals:{ayutthaya:[0,66],'old-orchard':[0,-66]},
  water:[B(-13,0,3,132),B(14,0,3,132)],
  bridges:[-35,-4,30].flatMap(y=>[bridge([-16,y],[-10,y],7),bridge([11,y+2],[17,y+2],7)]),
  roads:[...road([[0,-69],[0,-35],[7,-5],[-5,29],[0,68]],9),...[-35,-4,30].flatMap(y=>road([[-65,y],[-15,y],[10,y+2],[64,y+2]],7))],
  plazas:[[0,56,8,6],[-50,4,7,6],[-5,-30,8,6]],
  districts:{'ลานขวัญข้าว':[2,50],'ยุ้งข้าวเก่า':[-50,6],'คันนาปลายคลอง':[-5,-30]},npcs:{'ป้าละไม':[-4,57]}},
 'old-orchard':{spawn:[0,60],portals:{'rice-fields':[0,66],'moonlit-mill':[0,-66]},
  water:[B(0,11,136,8)],bridges:[-37,0,43].map(x=>bridge([x,5],[x,17],8)),
  roads:[...road([[0,-69],[-13,-39],[-5,-18],[8,-5],[-3,23],[7,49],[0,68]],9),...road([[-13,-39],[-45,-27],[-44,-4],[-31,26],[-3,23]],7),...road([[8,-5],[39,-16],[47,1],[37,32],[7,49]],8)],
  plazas:[[-24,-29,11,7.5],[36,-39,7.5,7.5]],
  districts:{'ศาลริมคลอง':[-24,-31],'สวนมะม่วง':[-44,14],'ดงโคมหลง':[36,-34]},npcs:{'ยายสาย':[-4,58]}},
 'moonlit-mill':{spawn:[-1,60],portals:{'old-orchard':[-1,66],'mill-cellar':[-6,-20],'lotus-marsh':[49,63]},
  water:[B(27,0,24,144)],bridges:[bridge([5,-24],[49,-24],8),bridge([49,-24],[49,-60],8)],
  roads:[...road([[-1,-69],[-1,-27],[-8,1],[-5,18]],10),...road([[-8,1],[-31,23],[-34,52]],8),...road([[-8,1],[-42,-18],[-50,-39]],7)],
  plazas:[[-8,-5,18,14.5]],
  districts:{'ท่าโรงสี':[2,24],'ลานหุ่นฟาง':[-16,-4],'โรงสีร้าง':[-6,-26]},npcs:{'จ้อย':[-5,57]}},
 'mill-cellar':{spawn:[0,58],portals:{'moonlit-mill':[0,63]},
  water:[],bridges:[[[0,-65],[0,-38]],[[-20,-28],[-10,-28]],[[10,-28],[20,-28]],[[-31,-17],[-31,12]],[[31,-17],[31,12]],[[-20,23],[-15,23]],[[15,23],[20,23]],[[0,-17],[0,13]]].map(([a,b])=>bridge(a,b,8)),
  roads:[],plazas:[[0,-30,9,9]],
  districts:{'ท่าโรงสี':[0,48],'ลานหุ่นฟาง':[-31,-23],'โรงสีร้าง':[0,-24]},npcs:{},
  mobs:[[0,24],[-30,30],[-30,24],[30,30],[30,24],[-30,-20],[-30,-26],[30,-20],[30,-26],[0,-4],[0,-30]]},
 'lotus-marsh':{spawn:[0,46],portals:{'moonlit-mill':[0,62]},
  water:[B(0,0,140,140)],
  bridges:[[[-7,-46],[-24,-33]],[[8,-46],[19,-31]],[[-33,-14],[-31,11]],[[29,-9],[30,10]],[[-19,32],[-11,43]],[[19,40],[12,46]],[[-19,-25],[13,-23]],[[-15,25],[13,27]]].map(([a,b])=>bridge(a,b,7)),
  roads:[],plazas:[[0,54,13,10],[-33,26,15,13],[28,22,17,14],[-30,-24,17,14],[31,-28,20,18],[0,-51,22,16]],
  districts:{'ศาลริมคลอง':[31,-24],'สวนมะม่วง':[-30,-20],'ดงโคมหลง':[0,-46]},npcs:{'ยายบัวผัน':[5,48]},
  mobs:[[-33,22],[-37,30],[26,18],[32,26],[-27,-20],[-34,-28],[28,-24],[36,-32],[-28,30],[23,26],[6,-46]]},
};
const fail=id=>{throw new Error("Blocked: "+id);};
const nearest=(nav,[x,z],ok)=>{for(let r=0;r<=8;r+=.5)for(let a=0;a<Math.max(1,r*8);a++){const p={x:Math.round((x+r*Math.cos(a/(r*8)*Math.PI*2))*2)/2,z:Math.round((z+r*Math.sin(a/(r*8)*Math.PI*2))*2)/2};if(ok(p))return p;}throw new Error('No walkable spot near '+x+','+z);};
for(const m of catalog.maps){
 const l=L[m.id],grid=JSON.parse(await readFile(new URL('./nav-v2/'+m.id+'.json',import.meta.url),'utf8'));
 m.scene='maps/v2/'+m.id+'.glb';delete m.model;delete m.triangles;delete m.clearedCourtTrees;
 m.bounds={x:-70,z:-70,w:140,d:140};m.nav={zones:[{...m.bounds}],obstacles:[],props:[],grid};
 const reach=p=>walkable(p.x,p.z,.6,m.nav)&&(!m.spawn||findPath(m.spawn,p,m.nav).length>0);
 m.spawn=nearest(m.nav,l.spawn,p=>walkable(p.x,p.z,.6,m.nav));
 m.portals=m.portals.map(p=>({...p,...nearest(m.nav,l.portals[p.to],reach)}));
 m.waterAreas=l.water;m.bridges=l.bridges;m.roads=l.roads;m.plazas=l.plazas;m.plants=[];m.decor=[];m.leafSources=[];
 m.districts=m.districts.map(d=>({...d,...nearest(m.nav,l.districts[d.name],reach)}));
 if(m.landmarks?.length)m.landmarks=m.districts.map(d=>[d.name,d.x,d.z]);
 if(m.masterCourt)m.masterCourt={...MASTER_COURT};
 // NPCs stand on a small collision disc; at least two sides stay open so the talk walk can reach them.
 const approach=p=>[[0,1.4],[1.4,0],[-1.4,0],[0,-1.4]].filter(([x,z])=>reach({x:p.x+x,z:p.z+z})).length>=2;
 m.npcs=m.npcs.map(n=>{
  const spot=n.mentorId?MENTORS.find(a=>a.id===n.mentorId&&(walkable(a.x,a.z,.6,m.nav)||fail(a.id))):nearest(m.nav,l.npcs[n.name],p=>walkable(p.x,p.z,1,m.nav)&&approach(p));
  return {...n,x:spot.x,z:spot.z};
 });
 if(l.mobs)m.mobs=m.mobs.map((mob,i)=>[...Object.values(nearest(m.nav,l.mobs[i],reach)),mob[2]]);
 else m.mobs=m.mobs.map(([x,z,type])=>[...Object.values(nearest(m.nav,[x,z],reach)),type]);
 if(!m.safe&&!m.instance)m.packs=true; // 0.63 camps of 4-5 (combat-core packSpawns)
 m.nav.props=m.npcs.map(n=>[n.x,n.z,n.mentorId?.43:.45]);
 if(l.loops){
  m.citizens=m.citizens.map((c,i)=>{
   const points=l.loops[i%l.loops.length].map(p=>nearest(m.nav,p,q=>walkable(q.x,q.z,.6,m.nav))),route=[];
   for(let k=0;k<points.length;k++){const from=points[k],to=points[(k+1)%points.length],steps=findPath(from,to,m.nav);if(!steps.length)throw new Error('Citizen route disconnected '+i);route.push({...from,rest:true},...steps.slice(0,-1));}
   const compact=[];for(const p of route){while(compact.length>1&&!compact.at(-1).rest){const a=compact.at(-2),b=compact.at(-1),cross=(b.x-a.x)*(p.z-b.z)-(b.z-a.z)*(p.x-b.x),dot=(b.x-a.x)*(p.x-b.x)+(b.z-a.z)*(p.z-b.z);if(Math.abs(cross)>.00001||dot<0)break;compact.pop();}compact.push(p);}
   return {...c,route:compact};
  });
 }
}
catalog.version=62;await writeFile(path,JSON.stringify(catalog,null,2)+'\n');
console.log(catalog.maps.map(m=>m.id+': spawn '+m.spawn.x+','+m.spawn.z+' · '+m.npcs.length+' NPC · '+m.mobs.length+' mobs · '+m.portals.map(p=>p.to+'@'+p.x+','+p.z).join(' ')).join('\n'));
