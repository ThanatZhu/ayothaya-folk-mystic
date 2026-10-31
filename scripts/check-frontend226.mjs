import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim(),base=process.argv[2]??'origin/main',authority=new Set();
function scan(file){
 file=file.replaceAll('\\','/');if(authority.has(file))return;authority.add(file);if(!fs.existsSync(file))return;
 const text=fs.readFileSync(file,'utf8');
 for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g)){
  const ref=match[1].split('?')[0];if(ref.startsWith('.'))scan(path.posix.normalize(path.posix.join(path.posix.dirname(file),ref)));
 }
}
scan('server/host.js');
const changes=git('diff','--name-only',base,'HEAD').split('\n').filter(Boolean);
// The already-published r233 fix adds only this static release-entry redirect.
// Keep all build settings and authority routing protected while preserving that fix.
function releaseEntryRedirectOnly(){
 try{
  const before=JSON.parse(git('show',base+':vercel.json')),after=JSON.parse(git('show','HEAD:vercel.json'));
  const allowed={source:'/releases/:release/',destination:'/game.html',permanent:false};
  const added=(after.redirects??[]).filter(r=>!(before.redirects??[]).some(b=>JSON.stringify(b)===JSON.stringify(r)));
  if(!added.length||added.some(r=>JSON.stringify(r)!==JSON.stringify(allowed)))return false;
  const stripped={...after,redirects:after.redirects.filter(r=>!added.includes(r))};
  return JSON.stringify(stripped)===JSON.stringify(before);
 }catch{return false;}
}
const blocked=changes.filter(file=>authority.has(file)||/^(server\/|maps\/|\.do\/|package(?:-lock)?\.json$|Dockerfile|Procfile$)/.test(file)||/^[^/]+\.json$/.test(file)&&file!=='release.json');
const unsafe=blocked.filter(file=>file!=='vercel.json'||!releaseEntryRedirectOnly());
if(unsafe.length)throw Error('Authority changes require a separate planned backend rollout: '+unsafe.join(', '));
if(git('branch','--show-current')==='main')throw Error('Frontend publication must use frontend-live, never push main.');
console.log(JSON.stringify({base,authorityFiles:authority.size,changed:changes.length,authorityChanges:0,frontendOnly:true}));
