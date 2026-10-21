import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const map={id:'f',safe:false,nav:{zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
test('the back office can force a weather on a realm for some minutes, and it reaches players in the snapshot',()=>{
 let time=1e6;const realm=new RealmServer({catalog:{capital:'f',maps:[map,{...map,id:'cellar',instance:true}]},now:()=>time});
 const p=realm.join({uid:'a',serverId:'server-1',slotId:'slot-1',record:{character:{name:'hero',gender:'male',classId:'swordsman'},state:initialSave()},send:()=>{}});
 assert.equal(realm.snapshot(p).weather,null,'nothing forced at first');
 const s=realm.setWeather({serverId:'server-1',weather:'storm',minutes:20});assert.equal(s.id,'storm');assert.equal(s.left,20*60e3);
 assert.deepEqual(realm.snapshot(p).weather,{id:'storm',mapId:null,left:20*60e3});
 assert.equal(realm.weatherState('server-2'),null,'other realms untouched');
 time+=21*60e3;assert.equal(realm.snapshot(p).weather,null,'expires back to the clock');
 realm.setWeather({weather:'mist',mapId:'f'});assert.equal(realm.weatherState('server-1').mapId,'f');
 realm.setWeather({weather:'auto'});assert.equal(realm.weatherState('server-1'),null);
 assert.throws(()=>realm.setWeather({weather:'snow'}),/bad-weather/);
 assert.throws(()=>realm.setWeather({weather:'storm',mapId:'cellar'}),/bad-map/,'no weather in dungeons');
 assert.equal(realm.setWeather({weather:'clear',minutes:99999}).left,24*60*60e3,'capped at a day');
});
