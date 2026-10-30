export const ATTACK_CLASSES224=Object.freeze(['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte']);
export const ATTACK_DIRECTIONS224=Object.freeze(['S','SE','E','NE','N','NW','W','SW']);
export function attackVariant224(castId){
 if(Number.isSafeInteger(castId)&&castId>0)return (castId-1)%3;
 if(typeof castId!=='string'||!castId)return 0;
 let h=0;for(const c of castId)h=(h*31+c.charCodeAt(0))>>>0;return h%3;
}
export function attackFrame224(phase=0,impact=.42,reduced=false){
 const q=Math.max(0,Math.min(1,Number.isFinite(phase)?phase:0)),hit=Math.max(.05,Math.min(.9,Number.isFinite(impact)?impact:.42));
 if(reduced)return q>=hit&&q<.85?2:0;
 return q<hit*.5?0:q<hit?1:q<hit+(1-hit)*.48?2:3;
}
export const ATTACK_STYLE224=Object.freeze({
 novice:{row:0,range:1.4,size:.8,hit:.55,tilts:[-.15,.12,.05]},
 swordsman:{row:1,range:1.65,size:1.35,hit:.65,tilts:[-.5,0,.5]},
 lancer:{row:2,range:2.6,size:1.3,hit:.58,tilts:[0,-.15,.28]},
 hunter:{row:3,range:6,size:.65,hit:.55,projectile:true,tilts:[0,0,0]},
 boxer:{row:4,range:1.3,size:.8,hit:.6,tilts:[-.15,.12,.4]},
 rogue:{row:5,range:1.5,size:1.1,hit:.6,tilts:[-.35,.3,0]},
 shaman:{row:6,range:3.3,size:.7,hit:.7,projectile:true,tilts:[0,.1,-.1]},
 acolyte:{row:7,range:4.2,size:.7,hit:.65,projectile:true,tilts:[0,.12,-.12]}
});

