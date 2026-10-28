import {resolve,extname} from 'node:path';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
export const out=new URL('../outputs/auto202/',import.meta.url);await mkdir(out,{recursive:true});
export const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init();
// Keep this local review calm and add both categories for testing the switches.
const map=catalog.maps.find(m=>m.id==='rice-fields');map.citizens=[];
export const host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
const root=fileURLToPath(new URL('../',import.meta.url));
const old=host.server.listeners('request');host.server.removeAllListeners('request');
const previews=new Set();
host.server.on('request',async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/multiplayer-config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(`export const MULTIPLAYER_URL=${JSON.stringify(base.replace('http','ws')+'/realtime')};export function multiplayerURL(){return MULTIPLAYER_URL}export function wakeServer(){}`);return;}
 if(path==='/auto202-bootstrap.json'){
  const seed=await store.createLocal({name:'AutoReview'+(previews.size+1),gender:'male'}),record=store.rows.get(seed.uid);previews.add(seed.uid);
  record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};record.character.classId='boxer';record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='rice-fields';record.state.position={...map.spawn};record.state.traveler.baseXp=levelStart(70);record.story={v:3,quest:12,step:0,count:0,done:false};record.skills={_tree84:Array(17).fill(0),_roles119:Array(17).fill(0),boxer:Array.from({length:17},(_,i)=>i<6?1:0)};record.bag={coins:50000,items:{'hp-small':99,'hp-large':50,'mp-small':99,'mp-large':50,'green-herb':50}};
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({token:seed.token,record}));return;
 }
 if(path==='/auto202-demo-damage'&&req.method==='POST'){for(const p of host.realm.peers.values())if(previews.has(p.uid)){const w=p.world;w.player.maxHp=5000;w.player.maxMp=2000;w.player.hp=100;w.player.mp=50;w.status={poison:60};}res.writeHead(200).end('{}');return;}
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
 if(req.method==='GET'&&mime[extname(path)]){try{const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root)||path.split('/').some(p=>p.startsWith('.')))throw Error('path');const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(path)],'Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404).end();}return;}
 for(const listener of old)listener(req,res);
});
await new Promise(r=>host.server.listen(Number(process.env.AUTO202_PORT??8957),'127.0.0.1',r));export const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
console.log('Auto review: '+base+'/auto202-review.html');
