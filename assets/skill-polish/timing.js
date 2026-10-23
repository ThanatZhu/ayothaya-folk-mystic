// Three deliberate sample clips, separate from combat rules and saved skill indices.
export const CLIPS={
 sword:{id:'sword',classId:'swordsman',job:'duelist',skillId:'cross-finish',title:'กากบาทพิฆาต',tag:'นักดาบ · ขุนดาบทะลวง',description:'เงื้อคม → ฟันเฉียง → กลับคมฟันไขว้ → คืนหลัก',duration:3.2,impacts:[.74,1.08],beats:[{time:.44,name:'เงื้อดาบ'},{time:.76,name:'คมแรก'},{time:1.09,name:'ฟันกากบาท'},{time:1.56,name:'เศษคมจาง'}]},
 rooster:{id:'rooster',classId:'hunter',job:'spirit-hunter',skillId:'peck',title:'ไก่อาคมพุ่งจิก',tag:'นายพราน · พรานอาคม',description:'ส่งสัญญาณ → ไก่ย่อพุ่ง → จิกถึงเป้า → ลงยืน',duration:3.2,impacts:[.96],beats:[{time:.34,name:'เตรียมพุ่ง'},{time:.73,name:'กลางอากาศ'},{time:.97,name:'จิกโดนเป้า'},{time:1.65,name:'ลงยืน'}]},
 lotus:{id:'lotus',classId:'acolyte',job:'healer',skillId:'great-revive',title:'คืนขวัญมหาเมตตา',tag:'พระ / แม่ชี · ผู้บำเพ็ญเมตตา',description:'ประนมร่าย → บัวคลี่ → แสงคืนขวัญ → ลุกขึ้น',duration:4.8,impacts:[2.08],beats:[{time:.65,name:'ตั้งจิต'},{time:1.45,name:'บัวคลี่'},{time:2.12,name:'คืนขวัญ'},{time:2.95,name:'ลุกขึ้น'}]}
};
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const ramp=(a,b,t)=>ease((t-a)/(b-a));
const key=(frames,t)=>{let value=frames[0][1];for(const [at,n] of frames)if(t>=at)value=n;return value;};
export const atlasUv=(index,cols=4,rows=2,inset=.002)=>({x:index%cols/cols+inset,y:1-(Math.floor(index/cols)+1)/rows+inset,w:1/cols-inset*2,h:1/rows-inset*2});
export function sampleClip(id,time,{reduced=false}={}){
 const clip=CLIPS[id];if(!clip)throw new Error('Unknown sample clip');
 const t=Number.isFinite(time)?Math.max(0,Math.min(clip.duration,time)):0;
 const pulse=(at,width=.2)=>Math.max(0,1-Math.abs(t-at)/width);
 const out={id,time:t,frame:0,heroX:-2,heroY:0,targetX:1.55,targetY:0,targetMode:'idle',targetTime:0,phase:'พร้อม',fxFrame:0,fxOpacity:0,fxSize:3,roosterFrame:0,roosterX:-1,roosterY:0,roosterFlip:false,roosterOpacity:0,reaction:0,shake:0,hp:700};
 if(id==='sword'){
  out.frame=key([[0,0],[.2,5],[.64,6],[.88,9],[1.02,7],[1.34,10],[1.85,0]],t);
  out.heroX=-2+1.85*ramp(.52,.74,t)-1.85*ramp(1.5,2.3,t);
  out.fxFrame=key([[0,0],[.68,1],[.77,2],[.93,3],[1.04,4],[1.18,5],[1.36,6],[1.56,7]],t);
  out.fxOpacity=ramp(.58,.66,t)*(1-ramp(1.57,1.92,t));out.fxSize=2.65;
  out.reaction=Math.max(pulse(.79,.15),pulse(1.13,.19));out.shake=Math.max(pulse(.76,.1)*.055,pulse(1.10,.14)*.1);
  out.hp=700-(t>=.74?130:0)-(t>=1.08?230:0);out.targetX+=out.reaction*.2;
  out.phase=t<.2?'พร้อม':t<.64?'เงื้อดาบ':t<.88?'ฟันคมแรก':t<1.04?'กลับคม':t<1.34?'ฟันกากบาท':t<1.92?'ริ้วคมสลาย':'คืนหลัก';
 }else if(id==='rooster'){
  out.frame=key([[0,0],[.2,8],[.55,7],[1.05,10],[1.6,0]],t);
  out.roosterFrame=key([[0,0],[.47,1],[.63,2],[.80,3],[.94,4],[1.12,5],[1.37,6],[1.60,7]],t);
  out.roosterX=-1.1+1.85*ramp(.43,.95,t)-.22*ramp(1.1,1.6,t);
  out.roosterY=Math.sin(clamp((t-.43)/1.15)*Math.PI)*.42;
  out.roosterOpacity=1;out.reaction=pulse(1.01,.18);out.shake=pulse(.98,.12)*.055;out.hp=700-(t>=.96?180:0);out.targetX+=out.reaction*.16;
  out.phase=t<.2?'พร้อม':t<.47?'ส่งสัญญาณ':t<.94?'ไก่พุ่งจิก':t<1.13?'จิกโดนเป้า':t<1.6?'ผ่อนแรงลงพื้น':'กลับท่ายืน';
 }else{
  out.frame=key([[0,0],[.18,11],[.75,8],[2.06,7],[2.85,11],[3.5,0]],t);
  out.fxFrame=key([[0,0],[.65,1],[1.02,2],[1.38,3],[1.85,4],[2.35,5],[2.8,6],[3.2,7]],t);
  out.fxOpacity=ramp(.2,.58,t)*(1-ramp(3.15,4.05,t));out.fxSize=2.95;
  out.targetMode=t<2.08?'sleep':t<3.3?'standUp':'idle';out.targetTime=t<2.08?3:t<3.3?t-2.08:t-3.3;
  out.hp=t<2.08?0:525;out.phase=t<.2?'เพื่อนล้ม':t<1.02?'ประนมร่าย':t<1.85?'บัวคลี่กลีบ':t<2.35?'แสงคืนขวัญ':t<3.3?'เพื่อนลุกขึ้น':'กลีบบัวสลาย';
 }
 if(reduced){out.heroX=-2;out.heroY=0;out.reaction=0;out.shake=0;out.roosterY=0;}
 return out;
}
