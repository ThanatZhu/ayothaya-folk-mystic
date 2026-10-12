// Motion is layered over the four original illustrated poses; no duplicated frame claims.
export const MOTION_MODES=['idle','walk','attack','cast','guard','hit','dash','bow','celebrate','rest'];
export function characterMotion({time=0,mode='idle',classId='shaman',reduced=false}={}){
 const t=Math.max(0,time),wave=Math.sin(t*8),pulse=Math.max(0,Math.sin(t*6));let frame=0,x=0,y=0,sx=1,sy=1,rotation=0;
 if(mode==='walk'){frame=[1,0,2,0][Math.floor(t*9)%4];y=Math.abs(wave)*.045;rotation=wave*.025;}
 else if(mode==='attack'){const fast=['boxer','rogue'].includes(classId),a=t*(fast?13:8),strike=Math.max(0,Math.sin(a));frame=strike>.25?3:0;x=strike*(fast?.07:.04);rotation=Math.sin(a)*(classId==='lancer'?.035:.085);sy=1-strike*.03;}
 else if(mode==='cast'){frame=3;y=pulse*.04;rotation=Math.sin(t*4)*.025;sy=1+pulse*.025;}
 else if(mode==='guard'){frame=0;sy=.9;sx=1.06;rotation=-.025;}
 else if(mode==='hit'){frame=0;x=Math.sin(t*35)*.04;rotation=-.09;sy=.96;}
 else if(mode==='dash'){frame=2;rotation=-.16;y=.035;}
 else if(mode==='bow'){frame=0;sy=1-pulse*.18;rotation=pulse*.09;}
 else if(mode==='celebrate'){frame=pulse>.2?3:0;y=pulse*.16;rotation=Math.sin(t*6)*.08;}
 else if(mode==='rest'){frame=0;sy=.72;sx=1.05;y=0;}
 else{sy=1+Math.sin(t*2)*.012;}
 if(reduced)return {frame:mode==='attack'||mode==='cast'?3:0,x:0,y:0,sx:1,sy:1,rotation:0};
 return {frame,x,y,sx,sy,rotation};
}
