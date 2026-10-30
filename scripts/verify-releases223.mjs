import {readdir,readFile,stat}from'node:fs/promises';import path from'node:path';import{createHash}from'node:crypto';
const isText=f=>/\.(?:[cm]?js|css|json|svg|html|webmanifest|md|txt|map|gltf|obj|mtl|ps1|sh|bat|cmd|ya?ml|csv|ini|toml)$/.test(f),sameText=(a,b)=>a.toString('latin1').replace(/\r\n/g,'\n')===b.toString('latin1').replace(/\r\n/g,'\n');
export async function verifyReleases(root){const dir=path.join(root,'releases');let entries;try{entries=await readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}const digest=b=>createHash('sha256').update(b).digest('hex'),cache=new Map();
for(const e of entries.filter(e=>e.isDirectory())){let snap;try{snap=JSON.parse(await readFile(path.join(dir,e.name,'runtime-manifest.json'),'utf8'));}catch(err){if(err.code==='ENOENT')continue;throw err;}
 for(const[file,hash]of Object.entries(snap.assets)){if(!/^(assets|maps|vendor)\//.test(file)||file.split('/').includes('..'))throw Error('Invalid release path');const override=path.join(dir,e.name,file);let actual;try{actual=digest(await readFile(override));}catch(err){if(err.code!=='ENOENT')throw err;if((snap.pinnedText?snap.pinnedText.includes(file):snap.textPinned&&isText(file)))throw Error('Missing pinned release text: '+e.name+'/'+file);if(!cache.has(file)){try{cache.set(file,digest(await readFile(path.join(root,file))));}catch(x){if(x.code!=='ENOENT')throw x;cache.set(file,null);}}actual=cache.get(file);}
  if(actual!==hash)throw Error('Retained asset changed: '+e.name+'/'+file+'. Freeze a new release to preserve its previous bytes.');
 }
 for(const[file,hash]of Object.entries(snap.code)){if(file.includes('/')||!/^.+\.(js|css|webmanifest)$/.test(file))throw Error('Invalid runtime path');if(digest(await readFile(path.join(dir,e.name,file)))!==hash)throw Error('Immutable runtime modified: '+e.name+'/'+file);}
}
 let current;try{current=JSON.parse(await readFile(path.join(root,'release.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(current){let snap;try{snap=JSON.parse(await readFile(path.join(dir,current.id,'runtime-manifest.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(snap){for(const[file,expected]of Object.entries(snap.assets)){if(snap.textPinned&&isText(file)){if(!sameText(await readFile(path.join(root,file)),await readFile(path.join(dir,current.id,file))))throw Error('Current assets differ from frozen release: '+file);continue;}if(!cache.has(file))cache.set(file,digest(await readFile(path.join(root,file))));if(cache.get(file)!==expected)throw Error('Current assets differ from frozen release: '+file);}
 const source=(await readdir(root)).filter(f=>/\.(js|css|webmanifest)$/.test(f));for(const file of source)if(!snap.code[file]||!sameText(await readFile(path.join(root,file)),await readFile(path.join(dir,current.id,file))))throw Error('Current runtime differs from frozen release: '+file+'. Choose a new release ID and freeze before publishing.');}}

}
