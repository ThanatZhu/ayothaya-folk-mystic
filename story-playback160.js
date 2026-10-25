// Pure Thai-grapheme-safe presentation clock, with no quest or reward dependencies.
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('th',{granularity:'grapheme'}):null;
export const storyGraphemes=text=>segmenter?[...segmenter.segment(text)].map(x=>x.segment):Array.from(text);
export function createPlayback(lines){return {lines:lines.map(storyGraphemes),shot:0,revealed:0,speed:30,hold:0,age:0,done:false};}
export function advancePlayback(p,seconds){
 if(p.done||!Number.isFinite(seconds)||seconds<=0)return;
 const length=p.lines[p.shot].length;p.age+=seconds;
 const revealTime=Math.min(seconds,Math.max(0,length-p.revealed)/p.speed);
 p.revealed=Math.min(length,p.revealed+revealTime*p.speed);p.hold+=seconds-revealTime;
 if(p.hold>=3.2)nextShot(p);
}
function nextShot(p){if(p.shot>=p.lines.length-1){p.done=true;return;}p.shot++;p.revealed=0;p.speed=30;p.hold=0;p.age=0;}
export function acceleratePlayback(p){
 if(p.done)return;
 // Initial taps accelerate letters; only a later tap on a fully read shot advances.
 if(p.revealed<p.lines[p.shot].length)p.speed=Math.min(240,p.speed*4);
 else if(p.age>.35)nextShot(p);
}
export function playbackFrame(p,reduced=false){
 const letters=p.lines[p.shot],count=Math.floor(p.revealed);
 return {shot:p.shot,text:letters.slice(0,count).join(''),next:letters[count]??'',letterOpacity:p.revealed-count,
  opacity:reduced?1:Math.min(1,p.age/.45),complete:count>=letters.length,done:p.done};
}
