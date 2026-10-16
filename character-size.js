// Standing crown-to-sole measurements in the source art; spear/trident tips are excluded.
// Keep one multiplier throughout each clip: crouches and lifted feet must not inflate the body.
export const BODY_HEIGHT=210,FRAME_SIZE=320,FRAME_FOOT=276,LOGICAL_SIZE=256;
const heights={
 animation37:{novice:[234,240],swordsman:[217,222],lancer:[198,211],hunter:[219,226],boxer:[217,226],rogue:[216,223],shaman:[221,224],acolyte:[219,226]},
 equipment41:{novice:[237,243],swordsman:[219,225],lancer:[201,214],hunter:[222,229],boxer:[221,229],rogue:[218,224],shaman:[225,228],acolyte:[220,227]}
};
export function bodyScale(directory,classId,gender,idleScale){
 const height=heights[directory]?.[classId]?.[gender==='female'?1:0];
 if(!height||!(idleScale>0))throw new Error('Unknown character size calibration');
 return BODY_HEIGHT/(height*idleScale);
}
export function standingHeight(directory,classId,gender){return heights[directory][classId][gender==='female'?1:0];}
// x/y/size describe the old 256px logical frame. Padding holds long weapons without shrinking the person.
export function drawCharacterFrame(ctx,frame,x,y,size=256){
 const ratio=size/LOGICAL_SIZE,pad=(FRAME_SIZE-LOGICAL_SIZE)/2;
 ctx.drawImage(frame,x-pad*ratio,y-pad*ratio,FRAME_SIZE*ratio,FRAME_SIZE*ratio);
}
