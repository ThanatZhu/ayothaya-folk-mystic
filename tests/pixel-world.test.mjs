import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MONSTER_TYPES} from '../combat-core.js';
import {CITIZEN_STYLES} from '../city-life-data.js';
import {PIXEL_NPC_ARTS,pixelNPCArt} from '../pixel-npc.js';

const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const png=name=>{const b=fs.readFileSync(new URL('../assets/pixel/'+name,import.meta.url));return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};};
const world=read('maps/world.json');

test('every monster that appears on a map is drawn in pixel art',()=>{
 const monsters=read('assets/pixel/monsters.json');
 for(const map of world.maps)for(const [, , type] of map.mobs??[])assert.ok(monsters[MONSTER_TYPES[type].id],map.id+' '+MONSTER_TYPES[type].id);
});
test('every named NPC, mentor and townsperson has a complete pixel strip',()=>{
 const npcs=read('assets/pixel/npcs.json');
 for(const art of PIXEL_NPC_ARTS){assert.ok(npcs[art],art);assert.deepEqual(png(art+'.png'),{width:npcs[art].cell*8,height:npcs[art].cell},art);}
 for(const map of world.maps)for(const n of map.npcs??[])assert.ok(pixelNPCArt(n),map.id+' '+n.name);
 CITIZEN_STYLES.forEach(style=>assert.ok(pixelNPCArt({...style,citizen:true}),style.name));
});
