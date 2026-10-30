// 0.115.2 transfer slips for the ledger, keyed by the ledger row id. 0.116: the server keeps the shared copy
// (setSlipCloud) and IndexedDB is this browser's cache, so a slip attached on one machine opens on every other.
// Photos are shrunk to ≤1600 px JPEG and re-squeezed until they fit the server's limit; PDFs must already fit.
const DB='ayothaya-dashboard-slips',STORE='slips',MAX_SIDE=1600,CLOUD_BYTES=640*1024;
let open=null,cloud=null;
export const setSlipCloud=adapter=>{cloud=adapter;};
const db=()=>open??=new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
const run=async(mode,fn)=>{const d=await db();return new Promise((ok,no)=>{const t=d.transaction(STORE,mode),r=fn(t.objectStore(STORE));t.oncomplete=()=>ok(r?.result);t.onerror=()=>no(t.error);});};
const toBase64=async blob=>{const bytes=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s);};
const fromBase64=(data,type)=>new Blob([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],{type});

export async function shrink(file){
 if(file.type==='application/pdf'){if(file.size>CLOUD_BYTES)throw Error('slip-too-big');return file;}
 if(!file.type.startsWith('image/'))throw Error('slip-type');
 const img=await createImageBitmap(file);
 for(const [side,q] of [[MAX_SIDE,.82],[MAX_SIDE,.68],[1280,.65],[1024,.6]]){
  const k=Math.min(1,side/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*k);canvas.height=Math.round(img.height*k);
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error('slip-encode')),'image/jpeg',q));
  if(blob.size<=CLOUD_BYTES){img.close?.();return blob;}
 }
 img.close?.();throw Error('slip-too-big');
}
// Returns the description the ledger row keeps: {type, size, name, at, cloud}.
export async function saveSlip(id,file){
 const blob=await shrink(file);await run('readwrite',s=>s.put(blob,id));
 return {type:blob.type,size:blob.size,name:file.name.slice(0,80),at:new Date().toISOString(),cloud:await upload(id,blob)};
}
async function upload(id,blob){if(!cloud)return false;try{await cloud.put(id,blob.type,await toBase64(blob));return true;}catch{return false;}}
// A slip saved before the cloud was reachable (or before 0.116) goes up now; true when it is on the server.
export async function uploadSlip(id){const blob=await run('readonly',s=>s.get(id));return blob?upload(id,blob):false;}
export async function getSlip(id){
 const local=await run('readonly',s=>s.get(id));if(local||!cloud)return local??null;
 try{const r=await cloud.get(id);if(!r)return null;const blob=fromBase64(r.data,r.type);await run('readwrite',s=>s.put(blob,id));return blob;}catch{return null;}
}
export async function deleteSlip(id){await run('readwrite',s=>s.delete(id));if(cloud)await cloud.del(id).catch(()=>{});}

const toDataURL=blob=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(blob);});
// Export/import carry the slips as data URLs so one JSON file is a complete backup.
export async function exportSlips(ids){const out={};for(const id of ids){const b=await getSlip(id);if(b)out[id]=await toDataURL(b);}return out;}
export async function importSlips(map){
 let n=0;for(const [id,url] of Object.entries(map??{})){if(typeof url!=='string'||!/^data:(image\/|application\/pdf)/.test(url))continue;
  const blob=await (await fetch(url)).blob();if(blob.size>CLOUD_BYTES)continue;await run('readwrite',s=>s.put(blob,id));await upload(id,blob);n++;}
 return n;
}
