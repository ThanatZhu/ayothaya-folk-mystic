import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherAt,WEATHERS,WEATHER_SLOT} from '../weather.js';
const field={id:'rice-fields'},t0=Date.UTC(2026,9,19);
test('weather is the same for everyone in a 15-minute slot and dungeons stay dry',()=>{
 const a=weatherAt(t0+1000,field),b=weatherAt(t0+WEATHER_SLOT-1000,field);assert.equal(a.id,b.id);assert.equal(a.endsAt,t0+WEATHER_SLOT);
 assert.equal(weatherAt(t0,{id:'mill-cellar',instance:true}).id,'clear');
});
test('over a week every weather shows up, clear most often and storms least',()=>{
 const seen={};for(let i=0;i<672;i++){const w=weatherAt(t0+i*WEATHER_SLOT,field);seen[w.id]=(seen[w.id]??0)+1;}
 for(const id of Object.keys(WEATHERS))assert.ok(seen[id]>0,id);
 assert.ok(seen.clear>seen.drizzle&&seen.drizzle>seen.storm,JSON.stringify(seen));
});
