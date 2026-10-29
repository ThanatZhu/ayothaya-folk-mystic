import {verifyReleases} from './scripts/verify-releases223.mjs';
import {cp,mkdir,readdir,lstat,rm,stat,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
await import('./scripts/sync-site-header171.mjs');
// Freeze public reference data from the same gameplay modules shipped by this build.
await import('./scripts/build-guide169.mjs');
await verifyReleases(root);
const output=path.resolve(root,'dist');
// Only remove this repository's generated directory, never a linked directory.
if(path.dirname(output)!==root||path.basename(output)!=='dist')throw new Error('Invalid build output');
try{if((await lstat(output)).isSymbolicLink())throw new Error('Build output must not be a symlink');}
catch(error){if(error.code!=='ENOENT')throw error;}
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const entry of await readdir(root,{withFileTypes:true})){
 if(entry.isFile()&&(/\.(html|css|js|webmanifest)$/.test(entry.name)||entry.name==='README.md')){
  await cp(path.join(root,entry.name),path.join(output,entry.name));
 }
}
// The pose art pack keeps its PNG masters, raw images and review pages in the repo; the game ships only game/ and the map.
const poses=path.join(root,'assets','skills-next','poses-2026-10')+path.sep;
for(const directory of ['assets','maps','vendor']){
 await cp(path.join(root,directory),path.join(output,directory),{
  recursive:true,filter:source=>!(/\.(blend|blend1|py)$/.test(source))&&!(source.startsWith(poses)&&!/^(game|pose-map\.js)/.test(source.slice(poses.length)))
 });
}
for(const name of ['index.html','game.html','lobby.js','viewer-world.js','firebase-config.js','maps/world.json','vendor/build/three.module.js']){
 if(!(await stat(path.join(output,name))).isFile())throw new Error('Missing runtime file: '+name);
}
await import('./scripts/build-asset-index180.mjs');
const release=JSON.parse(await readFile(path.join(root,'release.json'),'utf8'));
await cp(path.join(root,'release.json'),path.join(output,'release.json'));
if(!/^r[a-zA-Z0-9_-]{1,80}$/.test(release.id))throw Error('Invalid release ID');
let frozen=false;try{await stat(path.join(root,'releases',release.id,'release.json'));await stat(path.join(root,'releases',release.id,'runtime-manifest.json'));frozen=true;}catch(error){if(error.code!=='ENOENT')throw error;}
if(!frozen&&process.env.VERCEL==='1')throw Error('Freeze the release before publishing to Vercel.');
if(frozen){await cp(path.join(root,'releases'),path.join(output,'releases'),{recursive:true});let html=await readFile(path.join(output,'game.html'),'utf8');if(!html.includes('<head>'))throw Error('Missing HTML head');html=html.replace('<head>','<head><base href="/releases/'+release.id+'/"><meta name="ayothaya-release" content="'+release.id+'">');await writeFile(path.join(output,'game.html'),html);}else console.log('Development build: runtime is not frozen yet');
console.log('Vercel static game ready in dist/');
