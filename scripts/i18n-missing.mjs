// Lists player-facing Thai strings that i18n-en.js does not translate yet.
// Usage: node scripts/i18n-missing.mjs [--all] [--json]
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const THAI=/[\u0E00-\u0E7F]/;
// Dev labs, galleries, admin and the Discord bot are not player-facing.
const SKIP=/^(admin|.*lab|.*gallery|character-size-review|loading-preview|i18n-en)\b|discord/;

export function sourceFiles(){
 const files=readdirSync(root).filter(f=>/\.(js|html)$/.test(f)&&!SKIP.test(f));
 files.push(...readdirSync(path.join(root,'server')).filter(f=>f.endsWith('.js')&&!SKIP.test(f)).map(f=>'server/'+f));
 return files;
}

// Yields the bodies of JS string literals; template ${...} parts become {0},{1}...
function* literals(src){
 for(let i=0;i<src.length;i++){
  const q=src[i];
  if(q==='/'&&src[i+1]==='/'){while(i<src.length&&src[i]!=='\n')i++;continue;}
  if(q==='/'&&src[i+1]==='*'){i=src.indexOf('*/',i+2);if(i<0)return;i++;continue;}
  if(q!=="'"&&q!=='"'&&q!=='`')continue;
  let out='',n=0,j=i+1;
  const inner=[];
  for(;j<src.length&&src[j]!==q;j++){
   if(src[j]==='\\'){out+=src[j+1]==='n'?'\n':src[j+1];j++;continue;}
   if(q!=='`'&&src[j]==='\n')break;
   if(q==='`'&&src[j]==='$'&&src[j+1]==='{'){const from=j+2;let depth=1;j+=2;for(;j<src.length&&depth;j++){if(src[j]==='{')depth++;else if(src[j]==='}')depth--;}j--;inner.push(src.slice(from,j));out+='{'+(n++)+'}';continue;}
   out+=src[j];
  }
  yield out;i=j;
  for(const expr of inner)yield* literals(expr);
 }
}

// Text the browser will show: split on tags and placeholders-only gaps, trimmed.
export function pieces(text){
 const attrs=[...text.matchAll(/(?:title|placeholder|aria-label|alt)=["']([^"']*)["']/g)].map(m=>m[1]);
 return [...text.split(/<[^>]*>|\n/),...attrs].map(s=>s.trim()).filter(s=>THAI.test(s));
}

export function collect(){
 const found=new Map();
 const add=(s,file)=>{for(const p of pieces(s))if(!found.has(p))found.set(p,file);};
 for(const file of sourceFiles()){
  const src=readFileSync(path.join(root,file),'utf8');
  if(file.endsWith('.html')){
   for(const m of src.matchAll(/>([^<]+)</g))add(m[1],file);
   for(const m of src.matchAll(/(?:title|placeholder|aria-label|alt|content|value)="([^"]*)"/g))add(m[1],file);
   for(const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))for(const l of literals(m[1]))add(l,file);
  }else for(const l of literals(src))add(l,file);
 }
 const walk=v=>{if(typeof v==='string')add(v,'maps/world.json');else if(v&&typeof v==='object')for(const x of Object.values(v))walk(x);};
 walk(JSON.parse(readFileSync(path.join(root,'maps/world.json'),'utf8')));
 return found;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const all=collect();
 await import('../i18n-en.js');
 const dict=globalThis.I18N_EN;
 const missing=[...all].filter(([s])=>process.argv.includes('--all')||!(s in dict));
 if(process.argv.includes('--json'))console.log(JSON.stringify(Object.fromEntries(missing),null,1));
 else{for(const [s,f] of missing)console.log(f+'\t'+s);console.error(missing.length+' of '+all.size+' strings missing');}
}
