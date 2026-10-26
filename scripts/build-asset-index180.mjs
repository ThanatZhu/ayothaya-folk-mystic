// 0.116 asset gallery index: every file the build ships under assets/ and maps/ (path + bytes), written to
// dist/asset-index180.json for ayothaya-assets-9x7k.html. Run by build-vercel.mjs after the copy.
import {readdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','dist');
const files=[];
async function walk(dir){
 for(const entry of await readdir(path.join(dist,dir),{withFileTypes:true})){
  const rel=dir+'/'+entry.name;
  if(entry.isDirectory())await walk(rel);
  else if(entry.isFile())files.push([rel,(await stat(path.join(dist,rel))).size]);
 }
}
for(const top of ['assets','maps'])await walk(top);
files.sort((a,b)=>a[0].localeCompare(b[0]));
await writeFile(path.join(dist,'asset-index180.json'),JSON.stringify({built:new Date().toISOString(),files}));
console.log('Asset index:',files.length,'files');
