import test from 'node:test';
import assert from 'node:assert/strict';
import {targetHudState} from '../target-hud.js';
const types=[{name:'หนูนา'},{name:'บอส',boss:true},{name:'หัวหน้า'}],player={x:0,z:0};
const mob=(type,extra={})=>({type,hp:50,maxHp:100,x:4,z:4,...extra});
test('no selected enemy, dead enemies and idle bosses leave the top HUD hidden',()=>{
 for(const args of [{},{target:mob(0,{hp:0})},{mobs:[mob(1)]},{mobs:[mob(1,{aggro:true,hp:0})]},{mobs:[mob(1,{aggro:true,x:100})]}])assert.equal(targetHudState({types,player,...args}).visible,false);
});
test('selected ordinary monsters and players show correct uncluttered vitals',()=>{
 assert.equal(targetHudState({types,target:mob(0)}).kind,'monster');
 const p=targetHudState({types,target:{pvp:true,name:'คู่ประลอง',hp:20,maxHp:80}});assert.equal(p.name,'คู่ประลอง');assert.equal(p.percent,25);assert.equal(p.kind,'player');
});
test('a nearby engaged boss gets a boss bar even without selection; camp leaders do not',()=>{
 assert.equal(targetHudState({types,player,mobs:[mob(1,{aggro:true})]}).kind,'boss');
 assert.equal(targetHudState({types,player,mobs:[mob(2,{leader:true,aggro:true})]}).visible,false);
 assert.equal(targetHudState({types,target:mob(1)}).kind,'boss');
});
