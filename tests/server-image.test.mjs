import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// 0.118.1 the realm server image copies a hand-picked file list (Dockerfile COPY + .dockerignore re-includes).
// A browser module the server imports but the image lacks crashes the deploy at start (c215e99 did this to
// assets/skills-next/rework-icon-map.js). Walk every relative import from server/host.js and check each file ships.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rel=f=>path.relative(root,f).split(path.sep).join('/');
function serverFiles(){
 const seen=new Set();
 const walk=file=>{
  if(seen.has(file))return;seen.add(file);if(!existsSync(file))return;
  const src=readFileSync(file,'utf8');
  for(const m of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"](\.{1,2}\/[^'"]+)['"]/g))walk(path.resolve(path.dirname(file),m[1].split('?')[0]));
  for(const m of src.matchAll(/new URL\(\s*['"](\.{1,2}\/[^'"]+\.json)['"]/g))walk(path.resolve(path.dirname(file),m[1]));
 };
 walk(path.join(root,'server','host.js'));return [...seen].map(rel);
}
function shipped(file){
 const docker=readFileSync(path.join(root,'Dockerfile'),'utf8'),ignore=readFileSync(path.join(root,'.dockerignore'),'utf8').split(/\r?\n/);
 const copied=docker.split(/\r?\n/).filter(l=>/^COPY\s/.test(l)).flatMap(l=>l.replace(/^COPY\s+/,'').trim().split(/\s+/).slice(0,-1));
 const byCopy=copied.some(src=>src==='*.js'?!file.includes('/')&&file.endsWith('.js'):file===src||file.startsWith(src.replace(/\/?$/,'/')));
 // assets/ is ignored as a whole; only the !re-included paths reach the build context
 const ignoredDir=file.startsWith('assets/'),reIncluded=ignore.includes('!'+file);
 return byCopy&&(!ignoredDir||reIncluded);
}
test('every file the realm server imports is copied into the server image', () => {
 const files=serverFiles(),missing=files.filter(f=>!existsSync(path.join(root,f)));
 assert.deepEqual(missing,[],'imports that do not exist in the repo');
 assert.deepEqual(files.filter(f=>!shipped(f)),[],'add these to the Dockerfile COPY lines (and .dockerignore re-includes for assets/)');
});
