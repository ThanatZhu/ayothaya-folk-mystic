// 0.116 back-office finance (dashboard ledger, cost list, transfer slips) kept on the server so every admin browser
// sees the same books. Only signed-in admins reach these routes (host.js /admin/ gate); clients never touch Firestore.
// ponytail: one document holds every row (Firestore caps a document at 1 MiB, ~4,000 ledger rows); split by year when full.
export const FINANCE_MAX_BYTES=900_000,SLIP_MAX_BYTES=900_000; // slip = base64 text (~650 KB of picture/PDF)
const ROWS=5000,KEYS=40,TEXT=500;
const ID=/^[\w.:-]{1,80}$/;
// Rows are flat records the page owns; keep plain values only (and the slip's small description).
function cleanRow(row){
 if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.id!=='string'||!ID.test(row.id))throw Error('finance-invalid');
 const out={};let n=0;
 for(const [k,v] of Object.entries(row)){
  if(++n>KEYS||!/^[a-zA-Z][\w]{0,40}$/.test(k))throw Error('finance-invalid');
  if(typeof v==='string')out[k]=v.slice(0,TEXT);
  else if(typeof v==='number'){if(!Number.isFinite(v))throw Error('finance-invalid');out[k]=v;}
  else if(typeof v==='boolean'||v===null)out[k]=v;
  else if(k==='slip'&&typeof v==='object'&&!Array.isArray(v))out.slip={type:String(v.type??'').slice(0,40),size:Number(v.size)||0,name:String(v.name??'').slice(0,80),at:String(v.at??'').slice(0,40),cloud:v.cloud===true};
  else throw Error('finance-invalid');
 }
 return out;
}
function cleanList(list){
 if(!Array.isArray(list)||list.length>ROWS)throw Error('finance-invalid');
 const seen=new Set();return list.map(cleanRow).filter(r=>!seen.has(r.id)&&seen.add(r.id));
}
export function cleanFinance(body){
 const doc={costs:cleanList(body?.costs),ledger:cleanList(body?.ledger)};
 if(JSON.stringify(doc).length>FINANCE_MAX_BYTES)throw Error('finance-too-large');
 return doc;
}
export function cleanSlip(body){
 const id=String(body?.id??''),type=String(body?.type??''),data=String(body?.data??'');
 if(!ID.test(id))throw Error('slip-invalid');
 if(!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(type))throw Error('slip-type');
 if(!data||data.length>SLIP_MAX_BYTES||!/^[A-Za-z0-9+/]+=*$/.test(data))throw Error(data.length>SLIP_MAX_BYTES?'slip-too-big':'slip-invalid');
 return {id,type,data};
}
export const slipId=v=>{const id=String(v??'');if(!ID.test(id))throw Error('slip-invalid');return id;};
