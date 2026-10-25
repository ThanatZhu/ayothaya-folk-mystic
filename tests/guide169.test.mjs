import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ROLES} from '../assets/skills-next/catalog.js';
import {ITEMS} from '../items.js';
import {REFINE_RATE} from '../refine.js';
import {REFINE_TIERS} from '../refine-tiers.js';
import {PREMIUM_PETS} from '../premium-pets.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const data=JSON.parse(read('assets/guide169/game-data.json')),book=read('assets/guide169/handbook.md');
test('public reference is a deterministic export of gameplay data, not a hand-maintained duplicate',()=>{
 const before=read('assets/guide169/game-data.json');execFileSync(process.execPath,['scripts/build-guide169.mjs'],{cwd:fileURLToPath(root)});
 assert.equal(read('assets/guide169/game-data.json'),before);
 assert.deepEqual(data.rules.refine.rates,REFINE_RATE);assert.deepEqual(data.rules.refine.tiers,REFINE_TIERS);
 assert.equal(data.skills.length,ROLES.reduce((sum,r)=>sum+r.base.length+r.branches.reduce((n,b)=>n+b.active.length+b.passives.length,0),0));
 assert.equal(data.pets.length,PREMIUM_PETS.length);
 assert.ok(data.items.length>350);assert.ok(data.recipes.length>90);assert.equal(data.maps.length,14);
 for(const it of data.items){assert.ok(!ITEMS[it.id].retired);assert.notEqual(it.kind,'reserved');}
});
test('every reference image and authored crop exists and fits its atlas',()=>{
 for(const r of [...data.skills,...data.items,...data.monsters,...data.pets,...data.recipes]){
  const art=r.art;assert.ok(existsSync(new URL(art.src,root)),r.id+' '+art.src);
  if(art.rect){const [x,y,w,h]=art.rect;assert.ok(w>0&&h>0&&x>=0&&y>=0&&x+w<=art.width&&y+h<=art.height,r.id);}
  if(art.cols)assert.ok(art.index>=0&&art.index<art.cols*art.rows,r.id);
 }
});
test('detailed handbook covers live systems and distinguishes preview rewards',()=>{
 const articles=book.trim().split(/\n@/);assert.ok(articles.length>=30);assert.ok(book.length>22000);
 const ids=articles.map(s=>s.replace(/^@/,'').split('|')[0]);assert.equal(new Set(ids).size,ids.length);
 for(const id of ['account','masters','refine','cards','album','gacha','quests','bosses','party','war','arena','rebirth','mail','events','faq'])assert.ok(ids.includes(id),id);
 assert.match(book,/ต้องฝาก|กดฝาก/);assert.match(book,/200 ฉบับ/);assert.match(book,/ยังไม่เปิด ranked queue/);assert.match(book,/ยังไม่กำหนดวันสิ้นสุด/);
 assert.equal(data.rules.cbt.claimEnabled,false);assert.equal(data.rules.cbt.rankedQueueEnabled,false);
 for(const s of data.skills)assert.equal(s.max,s.passive?1:10);
});
test('guide is linked from home and game without loading the game or auth runtime',()=>{
 const html=read('guide.html'),js=read('guide.js');
 assert.match(read('index.html'),/href="guide.html"/);assert.match(read('game.html'),/href="guide.html" target="_blank" rel="noopener"/);
 assert.match(html,/https:\/\/ayothayaonline.com\/guide.html/);assert.match(html,/typography.css/);
 assert.doesNotMatch(js,/localStorage\.setItem|firebase|WebSocket|saveCharacter|server\//);
 assert.match(read('build-vercel.mjs'),/import\('\.\/scripts\/build-guide169.mjs'\)/);
});
