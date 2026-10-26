import {cp,mkdir,readdir,lstat,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
await import('./scripts/sync-site-header171.mjs');
// Freeze public reference data from the same gameplay modules shipped by this build.
await import('./scripts/build-guide169.mjs');
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
for(const directory of ['assets','maps','vendor']){
 await cp(path.join(root,directory),path.join(output,directory),{
  recursive:true,filter:source=>!(/\.(blend|blend1|py)$/.test(source))
 });
}
for(const name of ['index.html','game.html','lobby.js','viewer-world.js','firebase-config.js','maps/world.json','vendor/build/three.module.js']){
 if(!(await stat(path.join(output,name))).isFile())throw new Error('Missing runtime file: '+name);
}
await import('./scripts/build-asset-index180.mjs');
console.log('Vercel static game ready in dist/');
