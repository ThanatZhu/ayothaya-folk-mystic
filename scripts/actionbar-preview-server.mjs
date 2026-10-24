// Isolated loopback preview: separate local characters and no production services.
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {ROLES} from '../assets/skills-next/catalog.js';
import {levelStart,XP_CURVE} from '../experience.js';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const port=8921,base='http://127.0.0.1:'+port,out=new URL('../outputs/actionbar-preview-store/',import.meta.url);
await mkdir(out,{recursive:true});
const store=await new LocalStore(fileURLToPath(out)).init(),catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const host=await createHost({mode:'local',store,catalog,origins:[base],serveStatic:true});
const handlers=host.server.listeners('request');host.server.removeAllListeners('request');
host.server.on('request',async(req,res)=>{
 const url=new URL(req.url,base);
 if(url.pathname==='/multiplayer-config.js'){
  res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end("export function multiplayerURL(){return '"+base.replace('http','ws')+"/realtime'}export function wakeServer(){}");return;
 }
 if(url.pathname==='/actionbar-review.html'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>พรีวิวตารางสกิล</title><style>body{background:#10271f;color:#ffe6ae;font:18px Tahoma;padding:28px;max-width:960px;margin:auto}a{display:inline-block;color:#ffe6ae;border:1px solid #ae9055;border-radius:6px;padding:14px;margin:8px;text-decoration:none}p{line-height:1.8}</style><h1>พรีวิวตารางสกิล / วงล้อ</h1><p>ตัวละครทดสอบบนเครื่องนี้ แยกจากเกมจริง<br>คอม: 8 ช่องต่อแถว · + เพิ่มด้านบน · − หุบด้านบน · แถวล่างสุดลบไม่ได้<br>กด B เปิดกระเป๋า / K เปิดสกิล แล้วลากลงตาราง · ลากช่องเพื่อสลับ · คลิกขวาล้างช่อง<br>ปุ่ม 1–8 ใช้แถวล่าง · S = Shift / A = Alt · มือถือใช้วงล้อ</p>'+ROLES.map(r=>'<a href="/preview/start?class='+r.id+'">'+r.name+'</a>').join(''));return;
 }
 if(url.pathname==='/preview/start'){
  const role=ROLES.find(r=>r.id===url.searchParams.get('class'))??ROLES[0],seed=await store.createLocal({name:'Preview',gender:'male'}),record=store.rows.get(seed.uid);
  record.character.classId=role.id;record.character.jobId=role.branches[0].id;record.xpCurve=XP_CURVE;record.state.traveler.baseXp=levelStart(99);record.state.traveler.jobXp=1000000;
  record.skills={_tree84:Array(15).fill(0),_roles116:Array(15).fill(0),[role.id]:Array.from({length:15},(_,i)=>i>=13?1:10)};
  record.bag={coins:2000,items:{'hp-small':20,'mp-small':20,'hp-large':20,'mp-large':20,'fly-wing':5,'return-incense':5}};
  record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end('<!doctype html><meta charset="utf-8"><title>กำลังเปิดพรีวิว</title><p>กำลังเปิดตัวละครทดสอบ…</p><script>const record='+JSON.stringify(record).replaceAll('<','\\u003c')+',token='+JSON.stringify(seed.token)+';sessionStorage.setItem("ayothaya-entry-v1",JSON.stringify({owner:"guest",serverId:"server-1",slotId:"slot-1"}));sessionStorage.setItem("ayothaya-local-network:slot-1",JSON.stringify({token,serverId:"server-1",slotId:"slot-1"}));localStorage.setItem("ayothaya-character-v2:slot-1",JSON.stringify(record));localStorage.setItem("ayothaya.lang","th");localStorage.setItem("ayothaya-coach-off","1");location.replace("/game.html?server=server-1&map=ayutthaya&preview=actionbar");</script>');return;
 }
 for(const handler of handlers)handler(req,res);
});
host.server.listen(port,'127.0.0.1',()=>console.log('Actionbar preview '+base+'/actionbar-review.html'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>host.close().finally(()=>process.exit(0)));
