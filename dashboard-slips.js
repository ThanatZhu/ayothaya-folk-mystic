// 0.115.2 transfer slips for the ledger. Pictures are too big for localStorage (where the ledger lives), so they go
// to IndexedDB in this browser, keyed by the ledger row id. Photos are shrunk to ≤1600 px JPEG first; PDFs stay as is.
// ponytail: per-browser like the ledger itself; moving both to Firestore/Storage is the upgrade if several people edit.
const DB='ayothaya-dashboard-slips',STORE='slips',MAX_SIDE=1600,MAX_BYTES=8*1024*1024;
let open=null;
const db=()=>open??=new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
const run=async(mode,fn)=>{const d=await db();return new Promise((ok,no)=>{const t=d.transaction(STORE,mode),r=fn(t.objectStore(STORE));t.oncomplete=()=>ok(r?.result);t.onerror=()=>no(t.error);});};

export async function shrink(file){
 if(file.type==='application/pdf'){if(file.size>MAX_BYTES)throw Error('slip-too-big');return file;}
 if(!file.type.startsWith('image/'))throw Error('slip-type');
 const img=await createImageBitmap(file),k=Math.min(1,MAX_SIDE/Math.max(img.width,img.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*k);canvas.height=Math.round(img.height*k);
 canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);img.close?.();
 return new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error('slip-encode')),'image/jpeg',.82));
}
// Returns the metadata the ledger row keeps: {type, size, name, at}.
export async function saveSlip(id,file){
 const blob=await shrink(file);await run('readwrite',s=>s.put(blob,id));
 return {type:blob.type,size:blob.size,name:file.name.slice(0,80),at:new Date().toISOString()};
}
export const getSlip=id=>run('readonly',s=>s.get(id));
export const deleteSlip=id=>run('readwrite',s=>s.delete(id));

const toDataURL=blob=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(blob);});
// Export/import carry the slips as data URLs so one JSON file is a complete backup.
export async function exportSlips(ids){const out={};for(const id of ids){const b=await getSlip(id);if(b)out[id]=await toDataURL(b);}return out;}
export async function importSlips(map){
 let n=0;for(const [id,url] of Object.entries(map??{})){if(typeof url!=='string'||!/^data:(image\/|application\/pdf)/.test(url))continue;
  const blob=await (await fetch(url)).blob();if(blob.size>MAX_BYTES)continue;await run('readwrite',s=>s.put(blob,id));n++;}
 return n;
}
