import test from 'node:test';
import assert from 'node:assert/strict';
import {frameDue} from '../perf-settings.js';

// Drive the cap with a display's refresh ticks (and a little jitter) and count drawn frames per second.
function drawn(hz,cap,seconds=10,jitter=.3){
 let last=-Infinity,count=0;
 for(let i=0;i<hz*seconds;i++){const ms=i*1000/hz+(i%3-1)*jitter,next=frameDue(ms,last,cap);if(next!==null){last=next;count++;}}
 return count/seconds;
}
test('a 60 FPS cap gives close to 60 on fast screens, not a whole fraction of the refresh',()=>{
 for(const hz of [60,75,100,120,144,165,240])assert.ok(drawn(hz,60)>=55,hz+'Hz drew '+drawn(hz,60));
 for(const hz of [100,120,144,165,240])assert.ok(drawn(hz,60)<=61,hz+'Hz drew '+drawn(hz,60));
});
test('a 30 FPS cap holds 30 and no cap follows the screen',()=>{
 for(const hz of [60,100,120,144])assert.ok(Math.abs(drawn(hz,30)-30)<=2,hz+'Hz drew '+drawn(hz,30));
 assert.equal(drawn(144,0),144);
});
test('after a long stall the cap does not rush to catch up',()=>{
 let last=0;last=frameDue(5000,last,60);assert.equal(last,5000);assert.equal(frameDue(5005,last,60),null);
});
