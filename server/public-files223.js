import{readFile}from'node:fs/promises';import path from'node:path';
const manifests=new Map(),releasePattern='r[a-zA-Z0-9_-]{1,80}';
export function releaseRedirect(relative){const m=relative.match(new RegExp('^releases/('+releasePattern+')(?:/([^/]+\\.html))?/?$'));return m?'/'+(m[2]??'game.html'):null;}
export async function readPublicFile(base,relative){
 if(relative.includes(String.fromCharCode(0))||relative.includes(String.fromCharCode(92))||relative.split('/').includes('..'))throw Error('path');const file=path.resolve(base,relative);if(!file.startsWith(path.resolve(base)+path.sep))throw Error('path');
 try{return await readFile(file);}catch(e){if(e.code!=='ENOENT')throw e;}
 const m=relative.match(new RegExp('^releases/('+releasePattern+')/((?:assets|maps|vendor)/.+)$'));if(!m)throw Error('missing');
 const key=path.resolve(base,m[1]);let manifest=manifests.get(key);if(!manifest){manifest=JSON.parse(await readFile(path.join(base,'releases',m[1],'runtime-manifest.json'),'utf8'));manifests.set(key,manifest);}
 if(!Object.hasOwn(manifest.assets,m[2]))throw Error('missing-retained-asset');return readFile(path.join(base,m[2]));
}
