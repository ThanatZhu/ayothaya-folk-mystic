// Whole painted poses: anatomical connections are authored pixels, never mesh cuts.
export const FRAME_COUNT=20;
export function motionFrame(mode,time=0,phase=null,reduced=false,classId='novice'){
 if(reduced)return 0;
 const t=Math.max(0,Number.isFinite(time)?time:0);
 if(mode==='walk')return 12+Math.floor((((phase??t*1.65)%1+1)%1)*8);
 if(mode==='attack'||mode==='cast')return t<.24?5:t<.58?(classId==='hunter'?7:6):t<.85?10:0;
 if(mode==='guard')return ['swordsman','novice'].includes(classId)?8:classId==='acolyte'?9:5;
 if(mode==='hit')return 5;
 if(mode==='dash')return 7;
 if(mode==='rest'||mode==='bow')return 11;
 if(mode==='celebrate')return 8;
 return 0;
}
export function gestureFrame(gesture,classId){
 const specific={
  hunter:{draw:6,release:7,sky:8,plant:9,low:9,focus:6},
  swordsman:{brace:8,ward:8,guard:8,shove:8,cross:7,high:5,chop:9},
  lancer:{thrust:6,sweep:7,spiral:7,cross:7,plant:9,high:8},
  boxer:{cross:6,shove:6,brace:0,ward:0,low:5,knee:8,kick:9,elbow:7},
  shaman:{focus:8,seal:9,palm:6,ward:8,high:8,sky:8,spiral:7},
  acolyte:{palm:6,open:7,ward:9,brace:9,pray:11,sky:8,seal:9}
 };
 if(specific[classId]?.[gesture]!==undefined)return specific[classId][gesture];
 if(['breathe','bow','mend','pray'].includes(gesture))return 11;
 if(['land','recoil','evade','turn'].includes(gesture))return 10;
 if(['brace','guard','ward','low','cross'].includes(gesture))return classId==='rogue'?5:0;
 if(['focus','high','draw'].includes(gesture))return 5;
 if(['sky','float','knee'].includes(gesture))return 8;
 if(['kick','plant','chop','shove'].includes(gesture))return 9;
 if(['elbow','sweep','spiral','open'].includes(gesture))return 7;
 if(['step','dash'].includes(gesture))return 3;
 return 6;
}
export function skillFrame(track,time,reduced=false){
 if(reduced||!track||!Number.isFinite(time)||time<=0||time>=track.duration)return 0;
 const q=time/track.duration;
 if(q<track.times[0])return q<.06?0:5;
 if(q>.9)return 10;
 // Hold each authored pose until the midpoint to the next choreography beat.
 const i=track.times.reduce((best,t,n)=>Math.abs(t-q)<Math.abs(track.times[best]-q)?n:best,0);
 return gestureFrame(track.sequence[i],track.classId);
}
