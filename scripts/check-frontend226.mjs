import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim(),base=process.argv[2]??'origin/main',authority=new Set();
function scan(file){
 file=file.replaceAll('\\','/');if(authority.has(file)||!fs.existsSync(file))return;authority.add(file);
 const text=fs.readFileSync(file,'utf8');
 for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g)){
  const ref=match[1].split('?')[0];if(ref.startsWith('.'))scan(path.posix.normalize(path.posix.join(path.posix.dirname(file),ref)));
 }
}
scan('server/host.js');
const changes=git('diff','--name-only',base,'HEAD').split('\n').filter(Boolean);
const blocked=changes.filter(file=>authority.has(file)||/^(server\/|maps\/|\.do\/|package(?:-lock)?\.json$|Dockerfile|Procfile$)/.test(file)||/^[^/]+\.json$/.test(file)&&file!=='release.json');
if(blocked.length)throw Error('Authority changes require a separate planned backend rollout: '+blocked.join(', '));
if(git('branch','--show-current')==='main')throw Error('Frontend publication must use frontend-live, never push main.');
console.log(JSON.stringify({base,authorityFiles:authority.size,changed:changes.length,authorityChanges:0,frontendOnly:true}));
