// Whole painted poses share the same contact fraction as the authoritative hit.
const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
export function novicePunchPose(phase,{impact=.42,heavy=false,reduced=false}={}){
 const q=clamp(phase),hit=Math.max(.2,Math.min(.6,impact));
 if(reduced||q<=0||q>=1)return {artFrame:0,paintOffsetX:0,paintOffsetY:0};
 const load=ease(q/(hit-.10))*(1-ease((q-(hit-.10))/.10));
 const drive=ease((q-(hit-.10))/.10)*(1-ease((q-(hit+.10))/(1-hit-.10)));
 const artFrame=q<hit-.25?8:q+1e-9<hit?5:q<hit+.12?(heavy?9:6):q<hit+.25?5:q<.92?8:0;
 return {artFrame,paintOffsetX:-load*.018+drive*(heavy?.080:.050),paintOffsetY:-load*.008};
}
