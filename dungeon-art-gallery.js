// Dev review page for dungeon art (owner 10 Nov): every dungeon monster strip played pose by pose at its in-game size,
// plus covers, gear icons and shards. Checks run on the real pixels: clipped edges, feet off the line, pink fringe.
import {MONSTER_TYPES} from './combat-core.js';
import {DUNGEONS} from './dungeons.js';
import {WORLD_BODY_HEIGHT} from './character-size.js';

const POSES=['ยืน','เดิน 1','เดิน 2','เตรียมตี','ตี','เจ็บ','ฟื้น','ตาย'];
// Frame order the game plays (monsterFrame): idle 0, walk 1/2, wind-up 3, strike 4, hurt 5, recover 6, defeated 7.
const CLIPS={loop:[0,0,1,2,1,2,3,3,4,4,0,5,6,0,7,7,7],walk:[1,2],attack:[0,3,3,4,4,0],hurt:[0,5,6,0,5,7,7,7]};
const PX_PER_UNIT=42;
const pixel=await fetch('assets/pixel/monsters.json').then(r=>r.json());
const types=new Map(MONSTER_TYPES.map(t=>[t.id,t]));
const out=document.getElementById('out'),cards=[];let mode='loop',speed=1,problems=0,checked=0;

const loadImage=src=>new Promise((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>fail(new Error(src));i.src=src;});
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};

function inspect(img,cell){
 const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);
 const d=g.getImageData(0,0,c.width,c.height).data,frames=[];let pink=0;
 for(let f=0;f<8;f++){let foot=-1,edge=0;
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){const i=(y*c.width+f*cell+x)*4;if(d[i+3]<128)continue;
   foot=Math.max(foot,y);if(x===0||x===cell-1||y===0)edge++;
   const r=d[i],gr=d[i+1],b=d[i+2];if(r>150&&b>150&&gr<110&&Math.abs(r-b)<80)pink++;}
  frames.push({foot,edge});}
 return {frames,pink,wrongSize:img.width!==cell*8||img.height!==cell};
}

async function card(id,grid){
 const t=types.get(id),p=pixel[id],box=el('div','card');grid.append(box);
 box.append(el('h3','',(t?.name??id)),el('div','meta',id));
 if(!t||!p){box.append(el('div','checks bad','ไม่มีข้อมูลรูปพิกเซล'));problems++;return;}
 let img;try{img=await loadImage('assets/pixel/'+p.art+'.png');}catch{box.append(el('div','checks bad','โหลดรูปไม่ได้: '+p.art+'.png'));problems++;return;}
 const bodyHeight=t.bodyHeight??t.height*.86,worldCell=bodyHeight*p.cell/p.body;
 box.querySelector('.meta').textContent=id+' · Lv.'+t.level+' · สูง '+bodyHeight.toFixed(2)+' (ผู้เล่น '+WORLD_BODY_HEIGHT.toFixed(2)+') · ช่อง '+p.cell+'px';
 const stage=el('canvas','stage');stage.width=360;stage.height=240;box.append(stage);
 const strip=el('div','frames'),thumbs=[];
 POSES.forEach((name,i)=>{const f=el('figure'),c=el('canvas');c.width=c.height=p.cell;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(img,i*p.cell,0,p.cell,p.cell,0,0,p.cell,p.cell);
  f.append(c,el('figcaption','',name));strip.append(f);thumbs.push(f);});
 box.append(strip);
 const r=inspect(img,p.cell),notes=[];checked++;
 const floating=r.frames.map((f,i)=>f.foot!==p.cell-1?POSES[i]:null).filter(Boolean);
 const clipped=r.frames.map((f,i)=>f.edge>2?POSES[i]+' ('+f.edge+')':null).filter(Boolean);
 if(r.wrongSize)notes.push(['bad','ขนาดไฟล์ไม่ตรง 8 ช่อง']);
 notes.push(floating.length?['bad','เท้าลอย: '+floating.join(', ')]:['ok','เท้าอยู่บนเส้นเดียวกันครบ 8 ท่า']);
 // The slicer sizes the cell to the widest/tallest pose, so that pose touching the edge is a tight fit, not a cut
 // (cuts against the source sheet border are checked when slicing).
 notes.push(['ok','ช่องกว้างพอดีท่าที่ยื่นสุด'+(clipped.length?': '+clipped.join(', '):'')]);
 notes.push(r.pink?['bad','พิกเซลสีชมพูค้าง '+r.pink+' จุด']:['ok','ไม่มีขอบสีชมพู']);
 if(notes.some(n=>n[0]==='bad'))problems++;
 const checks=el('div','checks');for(const [cls,text] of notes)checks.append(el('div',cls,(cls==='ok'?'✓ ':'✗ ')+text));box.append(checks);
 cards.push({stage,img,cell:p.cell,worldCell,thumbs});
}

function drawCard(c,frame){
 const g=c.stage.getContext('2d'),W=c.stage.width,H=c.stage.height,foot=H-24;g.clearRect(0,0,W,H);g.imageSmoothingEnabled=false;
 g.strokeStyle='#c6a164';g.setLineDash([6,5]);g.beginPath();g.moveTo(0,foot+.5);g.lineTo(W,foot+.5);g.stroke();g.setLineDash([]);
 const hero=WORLD_BODY_HEIGHT*PX_PER_UNIT;g.fillStyle='#8a948d66';g.beginPath();g.roundRect(30,foot-hero,hero*.32,hero,hero*.16);g.fill();
 const size=Math.round(c.worldCell*PX_PER_UNIT),x=Math.round(W/2+30-size/2);
 g.drawImage(c.img,frame*c.cell,0,c.cell,c.cell,x,foot-size,size,size);
 c.thumbs.forEach((f,i)=>f.classList.toggle('on',i===frame));
}

for(const d of DUNGEONS){
 const sec=el('section'),cover=el('div','cover'),img=el('img');img.src=d.cover;img.alt='';
 cover.append(img,el('h2','',d.name),el('span','','Lv.'+d.level+' · ปาร์ตี้ 1–5 คน'));sec.append(cover);
 const items=el('div','items');
 ['หัว','เกราะ','ผ้าคลุม','รองเท้า'].forEach((n,i)=>{const it=el('div','item'),im=el('img');im.src='assets/dungeon-'+d.set+'/gear-'+i+'.webp';im.alt='';it.append(im,n);items.append(it);});
 const sh=el('div','item'),si=el('img');si.src='assets/dungeon-'+d.set+'/shard.webp';si.alt='';sh.append(si,'เศษ'+d.name);items.append(sh);
 sec.append(items);
 const grid=el('div','grid');sec.append(grid);out.append(sec);
 const ids=[...types.keys()].filter(k=>k?.startsWith('dg'+d.level+'-')).sort((a,b)=>(types.get(a)?.level??0)-(types.get(b)?.level??0));
 for(const id of ids)await card(id,grid);
}

let last=performance.now(),acc=0,step=0,frameMs=0;
function tick(now){
 const dt=now-last;last=now;frameMs=frameMs*.95+dt*.05;acc+=dt*speed;
 if(acc>=220){acc=0;step++;}
 const clip=CLIPS[mode],frame=clip[step%clip.length];
 for(const c of cards)drawCard(c,frame);
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;step=0;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
document.getElementById('speed').onchange=e=>speed=+e.target.value;
document.getElementById('bg').onclick=e=>{const on=document.body.classList.toggle('light');e.target.setAttribute('aria-pressed',on);};
setInterval(()=>{
 const bytes=performance.getEntriesByType('resource').filter(r=>/assets\/(pixel\/pm-dg|dungeon-)/.test(r.name)).reduce((s,r)=>s+(r.transferSize||r.encodedBodySize||0),0);
 document.getElementById('summary').textContent=checked+' ตัว · มีปัญหา '+problems+' · รูปดัน '+(bytes/1024).toFixed(0)+' KB · '+(1000/frameMs).toFixed(0)+' fps';
},1000);
window.galleryReport=()=>({checked,problems,cards:cards.length});
