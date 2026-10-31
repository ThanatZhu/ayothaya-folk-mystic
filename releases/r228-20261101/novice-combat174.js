// Whole painted poses share the same contact fraction as the authoritative hit.
const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
export function novicePunchPose(phase,{impact=.42,heavy=false,reduced=false,variant=0}={}){
 const q=clamp(phase),hit=Math.max(.2,Math.min(.6,impact)),v=((variant|0)%4+4)%4;
 if(reduced||q<=0||q>=1)return {artFrame:0,paintOffsetX:0,paintOffsetY:0};
 const load=ease(q/(hit-.10))*(1-ease((q-(hit-.10))/.10));
 const drive=ease((q-(hit-.10))/.10)*(1-ease((q-(hit+.10))/(1-hit-.10)));
 let artFrame;
 if(v===0)artFrame=q<hit-.25?8:q+1e-9<hit?5:q<hit+.12?(heavy?9:6):q<hit+.25?5:q<.92?8:0;
 else if(v===1)artFrame=q<hit-.24?8:q+1e-9<hit?5:q<hit+.16?7:q<hit+.30?10:q<.92?8:0;
 else if(v===2)artFrame=q<hit-.24?8:q+1e-9<hit?7:q<hit+.16?6:q<hit+.32?10:q<.92?5:0;
 else artFrame=q<hit-.24?8:q+1e-9<hit?5:q<hit+.20?9:q<hit+.36?10:q<.92?8:0;
 const boost=v===3?1.45:v===2?1.2:v===1?1.1:1;
 return {artFrame,paintOffsetX:-load*.018+drive*(heavy?.080:.050*boost),paintOffsetY:-load*.008};
}
