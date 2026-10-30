// Versioned runtime code plus sparse immutable asset overrides. Never delete retained releases.
import {readdir,mkdir,cp,stat,writeFile,readFile} from 'node:fs/promises';import path from'node:path';import {fileURLToPath}from'node:url';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),release=JSON.parse(await readFile(path.join(root,'release.json'),'utf8')),releases=path.join(root,'releases');
if(!/^r[a-zA-Z0-9_-]{1,80}$/.test(release.id))throw Error('invalid-release-id');const folder=path.join(releases,release.id);
try{await stat(path.join(folder,'release.json'));throw Error('Release already frozen: choose a new ID.');}catch(e){if(e.code!=='ENOENT')throw e;}
if(execFileSync('git',['status','--porcelain','--','assets','maps','vendor'],{cwd:root,encoding:'utf8'}).trim())throw Error('Commit assets/maps/vendor before freezing so old bytes can be recovered from Git.');
const isText=f=>/\.(?:[cm]?js|css|json|svg|html|webmanifest|md|txt|map|gltf|obj|mtl)$/.test(f);
const hash=b=>createHash('sha256').update(b).digest('hex'),assets={};const poses='assets/skills-next/poses-2026-10/';
const shipped=f=>!(/\.(blend|blend1|py)$/.test(f))&&!(f.startsWith(poses)&&!/^(game|pose-map\.js)/.test(f.slice(poses.length)));
async function walk(dir){for(const f of await readdir(path.join(root,dir),{withFileTypes:true})){const rel=dir+'/'+f.name;if(f.isDirectory())await walk(rel);else if(f.isFile()&&shipped(rel))assets[rel]=hash(await readFile(path.join(root,rel)));}}
for(const dir of ['assets','maps','vendor'])await walk(dir);
let old=[];try{old=await readdir(releases,{withFileTypes:true});}catch(e){if(e.code!=='ENOENT')throw e;}
for(const entry of old.filter(e=>e.isDirectory())){const previous=path.join(releases,entry.name);let snapshot;try{snapshot=JSON.parse(await readFile(path.join(previous,'runtime-manifest.json'),'utf8'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
 for(const[file,digest]of Object.entries(snapshot.assets)){if(assets[file]===digest)continue;if(!/^(assets|maps|vendor)\//.test(file)||file.split('/').includes('..'))throw Error('invalid-retained-path');
  const output=path.join(previous,file);let bytes;try{bytes=await readFile(output);}catch(e){if(e.code!=='ENOENT')throw e;bytes=execFileSync('git',['show',snapshot.commit+':'+file],{cwd:root,maxBuffer:160*1024*1024});}
  if(hash(bytes)!==digest)throw Error('Retained asset hash mismatch: '+file);await mkdir(path.dirname(output),{recursive:true});await writeFile(output,bytes);
 }
}
await mkdir(folder,{recursive:true});
// Pin textual metadata too: its byte endings must not follow the root checkout platform.
for(const file of Object.keys(assets).filter(isText)){await mkdir(path.dirname(path.join(folder,file)),{recursive:true});await cp(path.join(root,file),path.join(folder,file));}
const code={};
for(const f of await readdir(root,{withFileTypes:true}))if(f.isFile()&&/\.(?:js|css|webmanifest)$/.test(f.name)){const bytes=await readFile(path.join(root,f.name));await writeFile(path.join(folder,f.name),bytes);code[f.name]=hash(bytes);}
await mkdir(path.join(folder,'maps'),{recursive:true});await cp(path.join(root,'maps/world.json'),path.join(folder,'maps/world.json'));
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
await writeFile(path.join(folder,'runtime-manifest.json'),JSON.stringify({version:2,textPinned:true,commit,assets,code}));await writeFile(path.join(folder,'release.json'),JSON.stringify(release));console.log('Frozen runtime '+release.id+' with '+Object.keys(assets).length+' retained asset hashes');
