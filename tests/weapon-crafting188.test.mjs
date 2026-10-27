import test from 'node:test';import assert from 'node:assert/strict';
import {craft,RECIPES,recipeFor} from '../crafting.js';import {ITEMS,itemDef,DROPS,composeId} from '../items.js';
import {WEAPON_CLASSES,weaponId} from '../gear-sets.js';import {WEAPON_CRAFT_GRADES,WEAPON_MATERIALS,weaponMaterialTier} from '../weapon-crafting.js';import {craftRecipes} from '../craft-view176.js';
import {STORY,STORY_VERSION,normalizeStory,currentObjective,storyEvent} from '../story-quests.js';import {RealmServer} from '../server/realm.js';import {initialSave} from '../realm-state.js';import {FRONTIER_MONSTERS} from '../monster-catalog.js';
test('all 42 class/tier weapons deterministically progress blue to purple, orange and red using a previous weapon and local fragments',()=>{
 assert.equal(RECIPES.filter(r=>r.weaponGrade!=null).length,42*4);
 for(const [classId]of WEAPON_CLASSES)for(let tier=1;tier<=6;tier++){
  const base=weaponId(classId,tier),blue=recipeFor(base),materials=Object.fromEntries(Object.entries(blue.needs).map(([id,n])=>[id,n*10]));assert.equal(blue.needs[WEAPON_MATERIALS[tier-1][0]],10+5*tier);
  let bag={coins:10000000,items:materials},last=0;
  for(const grade of WEAPON_CRAFT_GRADES){const id=grade?base+'^'+grade:base,r=recipeFor(id),before=structuredClone(bag);assert.equal(r.weaponGrade,grade);const made=craft(bag,id,1,()=>0,{classId});assert.deepEqual(bag,before,'pure operation');bag=made.bag;assert.equal(bag.items[id],1);assert.equal(itemDef(id).grade,grade);const power=itemDef(id).atk??itemDef(id).matk;assert.ok(power>last||grade===0);last=power;
   if(grade)assert.equal(bag.items[Object.keys(r.needs)[0]],undefined,'consumes previous colour exactly once');
  }
 }
});
test('no skipping colours, substituting map fragments or destroying refined/carded/affixed weapons',()=>{
 const base=weaponId('swordsman',1),purple=base+'^2',r=recipeFor(purple),needs={...r.needs},before={coins:100000,items:needs};
 for(const variant of [composeId(base,5,null),composeId(base,0,'card-rat'),composeId(base,0,null,'s1')]){const bag=structuredClone(before);delete bag.items[base];bag.items[variant]=1;const copy=structuredClone(bag);assert.throws(()=>craft(bag,purple),/no-material/);assert.deepEqual(bag,copy);}
 const wrong={...needs};delete wrong['weapon-fragment-rice'];wrong['weapon-fragment-marsh']=999;assert.throws(()=>craft({coins:100000,items:wrong},purple),/no-material/);
 const red=recipeFor(base+'^4'),skip={...red.needs};delete skip[base+'^3'];skip[base]=1;assert.throws(()=>craft({coins:100000,items:skip},red.out),/no-material/);
});
test('rainbow visibility and server rules require a real class and only its boss gear; common amulets remain shared',()=>{
 const rainbow=id=>itemDef(id).rainbow;
 assert.equal(craftRecipes({}, {group:'gear',classId:'novice'}).filter(r=>rainbow(r.out)).length,0);
 for(const [classId]of WEAPON_CLASSES){const rows=craftRecipes({}, {group:'gear',classId,gender:'male'}).filter(r=>rainbow(r.out));assert.ok(rows.some(r=>itemDef(r.out).bossSet===classId));assert.ok(rows.every(r=>!itemDef(r.out).bossSet||itemDef(r.out).bossSet===classId));assert.ok(rows.some(r=>r.out.startsWith('amulet-')));}
 assert.ok(craftRecipes({}, {group:'gear',classId:'acolyte',gender:'female'}).filter(r=>itemDef(r.out).rainbow&&itemDef(r.out).look).every(r=>itemDef(r.out).look==='nun'));
 const r=recipeFor('boss-weapon-swordsman'),bag={coins:r.coins,items:r.needs},copy=structuredClone(bag);for(const classId of ['novice','hunter','fake'])assert.throws(()=>craft(bag,r.out,1,Math.random,{classId}),/craft-locked/);assert.deepEqual(bag,copy);assert.equal(craft(bag,r.out,1,Math.random,{classId:'swordsman'}).made,1);
});
test('every monster drops the crafting fragment matching its actual level band',()=>{
 for(const m of FRONTIER_MONSTERS){const id=WEAPON_MATERIALS[weaponMaterialTier(m.level??1)-1][0];assert.ok(DROPS[m.id].items.some(([it,rate,count])=>it===id&&rate>0&&count>=1),m.id);assert.equal(ITEMS[id].kind,'loot');}
});
test('inserting the crafting lesson preserves every v3 objective and completed story without replaying rewards',()=>{
 const old=STORY.filter(q=>q.id!=='t17-craft');for(const [i,q]of old.entries()){const before={v:3,quest:i,step:q.steps.length-1,count:0},s=normalizeStory(before);assert.equal(s.v,STORY_VERSION);assert.equal(currentObjective(s).quest.id,q.id);assert.equal(s.step,q.steps.length-1);assert.deepEqual(normalizeStory(s),s);}
 assert.equal(normalizeStory({v:3,quest:old.length,done:true}).done,true);assert.equal(normalizeStory({v:2,quest:old.length+1,done:true}).done,true);
 const t17=STORY.findIndex(q=>q.id==='t17'),r=storyEvent({v:STORY_VERSION,quest:t17,step:0},{type:'do',action:'job'});assert.equal(currentObjective(r.state).quest.id,'t17-craft');assert.ok(r.reward.items.some(i=>i.id==='weapon-fragment-rice'&&i.count===15));
});
test('realm crafting completes only the blue class-weapon objective; potions, inventory ownership and forged foreign recipes do not',()=>{
 let now=10000;const map={id:'ayutthaya',safe:true,nav:{zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[],npcs:[{name:'ครูแสนดาบ',x:0,z:0}]},realm=new RealmServer({catalog:{capital:map.id,maps:[map]},now:()=>now}),index=STORY.findIndex(q=>q.id==='t17-craft');
 const p=realm.join({uid:'crafter',slotId:'slot-1',serverId:'server-1',record:{character:{name:'Crafter',classId:'swordsman',gender:'male'},state:initialSave(),story:{v:STORY_VERSION,quest:index,step:1},bag:{coins:100000,items:{'weapon-fragment-rice':30,'iron-ore':4,'straw-bundle':3,'weapon-swordsman-one':1}}},send:()=>{}});
 realm.storyCheck(p);assert.equal(p.story.step,1);const send=item=>{now+=1000;return realm.receive(p.id,{type:'craft',item,seq:p.seq+1,times:1});};assert.equal(send('hp-small'),true);assert.equal(p.story.step,1);
 const bag=structuredClone(p.bag);assert.equal(send('weapon-hunter-one'),false);assert.deepEqual(p.bag,bag);assert.equal(send('weapon-swordsman-one'),true);assert.equal(p.story.step,2);assert.equal(p.story.quest,index);assert.equal(p.bag.items['weapon-swordsman-one'],2);
 realm.storyProgress(p,{type:'do',action:'craftWeapon'});assert.equal(p.story.step,2,'reporting to the NPC is still required');
});
