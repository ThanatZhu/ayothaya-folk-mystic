import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';
test('frontend gate accepts UI but blocks changed or deleted shared authority code and map changes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'frontend226-'));const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe'});
 const commit=()=>{git('add','-A');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');};
 try{
  fs.mkdirSync(path.join(root,'server'));fs.mkdirSync(path.join(root,'maps'));fs.mkdirSync(path.join(root,'scripts'));
  fs.copyFileSync(new URL('../scripts/check-frontend226.mjs',import.meta.url),path.join(root,'scripts/check-frontend226.mjs'));
  fs.writeFileSync(path.join(root,'server/host.js'),"import {damage} from '../shared.js';");fs.writeFileSync(path.join(root,'shared.js'),'export const damage=1;');fs.writeFileSync(path.join(root,'ui.css'),'body{}');fs.writeFileSync(path.join(root,'maps/world.json'),'{}');
  git('init','-q');git('checkout','-qb','frontend-live');commit();const base=git('rev-parse','HEAD').toString().trim();
  const check=()=>spawnSync(process.execPath,['scripts/check-frontend226.mjs',base],{cwd:root,encoding:'utf8'});
  fs.writeFileSync(path.join(root,'ui.css'),'body{color:red}');commit();assert.equal(check().status,0);
  fs.writeFileSync(path.join(root,'shared.js'),'export const damage=2;');commit();let r=check();assert.notEqual(r.status,0);assert.match(r.stderr,/shared.js/);
  git('checkout',base,'--','shared.js');commit();fs.unlinkSync(path.join(root,'shared.js'));commit();r=check();assert.notEqual(r.status,0);assert.match(r.stderr,/shared.js/);
  git('checkout',base,'--','shared.js');fs.writeFileSync(path.join(root,'maps/world.json'),'{"map":"changed"}');commit();r=check();assert.notEqual(r.status,0);assert.match(r.stderr,/maps\/world.json/);
 }finally{if(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('frontend226-'))fs.rmSync(root,{recursive:true,force:true});}
});
