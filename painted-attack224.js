import * as THREE from './vendor/build/three.module.js';
import {BODY_HEIGHT,LOGICAL_SIZE} from './character-size.js';
import {posesFit} from './skill-pose-art.js?v=pose119';
import {ATTACK_CLASSES224,ATTACK_DIRECTIONS224,ATTACK_STYLE224,attackVariant224,attackFrame224} from './attack-style224.js';
const entries=new Map(),manifests=new Map(),now=()=>globalThis.performance?.now?.()??Date.now();
const compact=()=>globalThis.matchMedia?.('(pointer:coarse),(max-width:900px)').matches??false;
const valid=(id,g)=>ATTACK_CLASSES224.includes(id)&&['male','female'].includes(g);
export const attackFits224=(id,g,a={},gear=null)=>valid(id,g)&&posesFit(id,a,gear);
function trim(){
 const idle=[...entries.values()].filter(c=>c.frames&&now()-c.used>600).sort((a,b)=>a.used-b.used),cap=compact()?6:8;
 while(entries.size>cap&&idle.length){const c=idle.shift();entries.delete(c.key);Object.values(c.frames).flat().forEach(t=>t.dispose());c.base.dispose();}
}
function manifest(id,g){
 const key=id+'-'+g;if(manifests.has(key))return manifests.get(key);
 const url=new URL('./assets/attack224/'+key+'.json',import.meta.url);
 const job=fetch(url).then(async r=>{if(!r.ok)throw Error('attack224-manifest-'+r.status);const m=await r.json();
 if(m.version!==224||m.classId!==id||m.gender!==g||m.cell!==320||m.anchor?.[0]!==160||m.anchor?.[1]!==288||m.frames!==4||m.variants?.length!==3||JSON.stringify(m.directions)!==JSON.stringify(ATTACK_DIRECTIONS224))throw Error('attack224-invalid-manifest');
 for(const v of m.variants){if(!/^[a-z0-9-]+\.webp$/.test(v.image)||!/^[a-z0-9-]+\.webp$/.test(v.sdImage))throw Error('attack224-invalid-image');for(const d of ATTACK_DIRECTIONS224)if(!Number.isFinite(v.views?.[d]?.bodyHeight)||v.views[d].bodyHeight<30||v.views[d].bodyHeight>200)throw Error('attack224-invalid-body');}
 return {meta:m,url};
 }).catch(e=>{manifests.delete(key);throw e;});manifests.set(key,job);return job;
}
function request(id,g,variant){
 const tier=compact()?'sd':'hd',key=[id,g,variant,tier].join('/');let c=entries.get(key);
 if(c?.failed&&now()-c.failed>5000){entries.delete(key);c=null;}
 if(!c){c={key,used:now(),frames:null};entries.set(key,c);
 c.ready=manifest(id,g).then(async({meta,url})=>{
  const v=meta.variants[variant],base=await new THREE.TextureLoader().loadAsync(new URL(tier==='sd'?v.sdImage:v.image,url).href);
  base.colorSpace=THREE.SRGBColorSpace;base.magFilter=base.minFilter=THREE.NearestFilter;base.generateMipmaps=false;
  c.base=base;c.meta=meta;c.variant=v;c.tier=tier;
  c.frames=Object.fromEntries(ATTACK_DIRECTIONS224.map((d,row)=>[d,Array.from({length:4},(_,i)=>{const t=base.clone();t.repeat.set(.25,.125);t.offset.set(i/4,1-(row+1)/8);t.needsUpdate=true;return t;})]));trim();return c;
 }).catch(()=>{c.failed=now();return null;});
 }
 c.used=now();return c;
}
export async function warmPaintedAttacks224(id,g){
 if(!valid(id,g)||typeof document==='undefined')return false;
 await Promise.all([0,1,2].map(v=>request(id,g,v).ready));return true;
}
export function paintedAttack224(id,g,pose={}){
 if(!valid(id,g)||typeof document==='undefined'||!pose.basicAttack224||pose.mode!=='attack')return null;
 const variant=attackVariant224(pose.basicAttack224.castId),d=ATTACK_DIRECTIONS224.includes(pose.viewDirection)?pose.viewDirection:'SE';
 const c=request(id,g,variant);if(!c.frames)return null;
 const impact=(pose.basicAttack224.impactPhase??.42)*(ATTACK_STYLE224[id].projectile?.62:1),frame=attackFrame224(pose.actionPhase,impact,pose.reduced),body=c.variant.views[d].bodyHeight;
 return {texture:c.frames[d][frame],extent:BODY_HEIGHT/LOGICAL_SIZE*c.meta.cell/body,footV:c.meta.anchor[1]/c.meta.cell,variant,direction:d,frame,tier:c.tier,castId:pose.basicAttack224.castId};
}

