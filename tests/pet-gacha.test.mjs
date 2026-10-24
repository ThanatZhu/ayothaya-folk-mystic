import test from 'node:test';import assert from 'node:assert/strict';import {stat} from 'node:fs/promises';
import {PREMIUM_PETS,premiumPet,petAtStars} from '../premium-pets.js';
import {normalizePetPreview,newPetPreview,previewPetDraw,upgradePreviewPet,addPreviewCopy,PET_PITY,PET_STAR_COST} from '../pet-gacha.js';
import {newPetSandbox,petSandboxAction,stepPetSandbox} from '../pet-skill-preview.js';

test('ten original pets have the requested tiers, five flyers, five ground walkers and ten different skills',async()=>{
 assert.deepEqual(Object.fromEntries(['S','A','B'].map(t=>[t,PREMIUM_PETS.filter(p=>p.tier===t).length])),{S:3,A:3,B:4});assert.equal(PREMIUM_PETS.filter(p=>p.movement==='fly').length,5);assert.equal(new Set(PREMIUM_PETS.map(p=>p.skill.kind)).size,10);
 let total=0;for(const p of PREMIUM_PETS){assert.ok(p.skill.tip);assert.ok(petAtStars(p.id,5).bonus);const file=await stat(new URL('../assets/pets125/'+p.id+'.webp',import.meta.url));assert.ok(file.size>1000);total+=file.size;}assert.ok(total<2000000);
});
test('draws debit test gems exactly once and duplicate results give copies, not free star upgrades',()=>{
 const state=newPetPreview(),before=structuredClone(state),r=previewPetDraw(state,10,()=>.7),pet=r.results[0];assert.equal(r.state.balance,9000);assert.deepEqual(state,before);assert.equal(r.results.length,10);assert.equal(r.state.collection[pet.id].stars,1);assert.equal(r.state.collection[pet.id].copies,9);assert.equal(r.results[0].duplicate,false);assert.ok(r.results.slice(1).every(p=>p.duplicate));assert.equal(r.state.pulls,10);
 assert.throws(()=>previewPetDraw({...state,balance:99},1),/no-gems/);assert.throws(()=>previewPetDraw(state,5),/bad-count/);assert.throws(()=>previewPetDraw(state,1,()=>1),/bad-random/);assert.deepEqual(state,before);
});
test('rarity boundaries and the 80th pull guarantee are shared by single and ten-draw requests',()=>{
 for(const [sample,tier] of [[.029,'S'],[.03,'A'],[.199,'A'],[.20,'B'],[.99,'B']])assert.equal(previewPetDraw(newPetPreview(),1,()=>sample).results[0].tier,tier);
 const r=previewPetDraw({...newPetPreview(),pity:PET_PITY-1},1,()=>.9);assert.equal(r.results[0].tier,'S');assert.equal(r.results[0].guaranteed,true);assert.equal(r.state.pity,0);
 const batch=previewPetDraw({...newPetPreview(),pity:75},10,()=>.8);assert.equal(batch.results[4].tier,'S');assert.equal(batch.state.pity,5);
});
test('stars consume exactly the required same-pet duplicates, reject unowned pets and stop at five',()=>{
 let state=newPetPreview();for(let i=0;i<11;i++)state=addPreviewCopy(state,'rice-rabbit');const balance=state.balance;assert.equal(state.collection['rice-rabbit'].copies,10);
 for(let stars=1;stars<5;stars++){const copies=state.collection['rice-rabbit'].copies;state=upgradePreviewPet(state,'rice-rabbit');assert.equal(state.collection['rice-rabbit'].stars,stars+1);assert.equal(state.collection['rice-rabbit'].copies,copies-PET_STAR_COST[stars]);}assert.equal(state.collection['rice-rabbit'].copies,0);assert.equal(state.balance,balance);assert.throws(()=>upgradePreviewPet(state,'rice-rabbit'),/max-stars/);assert.throws(()=>upgradePreviewPet(state,'moon-kirin'),/pet-not-owned/);
 let low=addPreviewCopy(newPetPreview(),'jade-turtle');assert.throws(()=>upgradePreviewPet(low,'jade-turtle'),/not-enough-copies/);assert.equal(low.collection['jade-turtle'].stars,1);
});
test('corrupt preview records cannot introduce unknown pets, negative balances or forged star levels',()=>{
 const state=normalizePetPreview({balance:-1,pity:999,collection:{'rice-rabbit':{stars:6,copies:99},'jade-turtle':{stars:2,copies:-4},unknown:{stars:1,copies:1}}});assert.equal(state.balance,0);assert.equal(state.pity,79);assert.deepEqual(state.collection,{'jade-turtle':{stars:2,copies:0}});assert.throws(()=>premiumPet('__proto__'),/unknown-pet/);assert.throws(()=>petAtStars('rice-rabbit',9),/bad-stars/);
});
test('all ten pet abilities produce their own sandbox effects and enforce cooldowns',()=>{
 const expected=['damage','cleanse','shield','guard','armor-break','root','heal','shield','mana','slow'];PREMIUM_PETS.forEach((pet,i)=>{const initial=newPetSandbox(pet.id),cast=petSandboxAction(initial,'skill',pet.id);assert.ok(cast.events.some(e=>e.kind===expected[i]),pet.id);assert.throws(()=>petSandboxAction(cast,'skill',pet.id),/skill-cooldown/);assert.equal(initial.cooldowns[pet.id],undefined);assert.ok(petAtStars(pet.id,5).skill.power>petAtStars(pet.id,1).skill.power);assert.ok(petAtStars(pet.id,5).skill.cooldown<pet.skill.cooldown);});
});
test('shields absorb damage, healing is capped, roots stop attacks and timed protections expire',()=>{
 let shield=petSandboxAction(newPetSandbox('moon-kirin'),'skill','moon-kirin'),hp=shield.player.hp;shield=petSandboxAction(shield,'enemy','moon-kirin');assert.equal(shield.player.hp,hp);assert.ok(shield.player.shield<shield.player.maxHp*.2);
 let heal=newPetSandbox('lotus-naga');heal.player.hp=heal.player.maxHp-1;heal=petSandboxAction(heal,'skill','lotus-naga');assert.equal(heal.player.hp,heal.player.maxHp);assert.equal(heal.player.poison,false);
 let root=petSandboxAction(newPetSandbox('blossom-fox'),'skill','blossom-fox');assert.equal(petSandboxAction(root,'enemy','blossom-fox').player.hp,root.player.hp);for(let i=0;i<8;i++)shield=stepPetSandbox(shield,1);assert.equal(shield.player.shield,0);
});
