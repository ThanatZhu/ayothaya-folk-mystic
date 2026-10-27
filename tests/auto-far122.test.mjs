import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld} from '../combat-core.js';

// The picked kind lives 60 m away, another kind stands next to the hero.
const map={id:'field',name:'Field',safe:false,nav:{zones:[{x:-80,z:-80,w:160,d:160}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[[4,0,4],[60,0,5]]};

test('AUTO walks to a picked kind beyond 30 m instead of standing among other monsters (0.122)',()=>{
 const w=new CombatWorld(map);w.player.x=0;w.player.z=0;
 assert.equal(w.setAuto(true,null,{kind:'type',type:5}),true);
 const far=w.mobs.find(m=>m.type===5),start=far.hp;
 for(let i=0;i<600&&far.hp===start;i++){w.player.hp=w.player.maxHp;w.update(.05,{x:0,z:0});}
 assert.equal(w.auto,true);assert.ok(far.hp<start,'the far monster was hit');
 assert.equal(w.mobs.find(m=>m.type===4).hp,w.mobs.find(m=>m.type===4).maxHp??w.mobs.find(m=>m.type===4).hp,'the near one was left alone');
});

test('AUTO with a picked kind waits for it to respawn instead of switching off',()=>{
 const w=new CombatWorld(map);w.setAuto(true,null,{kind:'type',type:5});
 const far=w.mobs.find(m=>m.type===5);far.hp=0;far.dead=1e9;
 for(let i=0;i<700;i++){w.player.hp=w.player.maxHp;w.update(.05,{x:0,z:0});}
 assert.equal(w.auto,true);
 const all=new CombatWorld(map);all.setAuto(true);for(const m of all.mobs){m.hp=0;m.dead=1e9;}
 for(let i=0;i<700;i++)all.update(.05,{x:0,z:0});
 assert.equal(all.auto,false,'plain AUTO still switches off when nothing is near');
});
