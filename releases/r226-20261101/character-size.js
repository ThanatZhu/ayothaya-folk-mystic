// Standing crown-to-sole measurements in the source art; spear/trident tips are excluded.
// Keep one multiplier throughout each clip: crouches and lifted feet must not inflate the body.
export const BODY_HEIGHT=210,FRAME_SIZE=320,FRAME_FOOT=276,LOGICAL_SIZE=256;
// Rendered body height, not the size of the transparent sprite rectangle.
// Preserve the existing hero's size and use it for every human actor.
export const CHARACTER_WORLD_SCALE=2.1;
export const WORLD_BODY_HEIGHT=CHARACTER_WORLD_SCALE*BODY_HEIGHT/LOGICAL_SIZE;
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
// The original walk strips were fitted separately by each frame's entire alpha
// box. For lancers that box includes a moving spear tip: it inflated the person
// by up to 21%. These reviewed crown/sole pairs exclude that weapon (frames 12–19).
export const LANCER_WALK_BODY={
 animation37:{
  male:[[54,305],[37,291],[50,304],[53,304],[36,285],[51,299],[56,312],[19,269]],
  female:[[46,293],[18,260],[45,291],[47,289],[18,258],[43,283],[26,241],[30,237]]
 },
 equipment41:{
  male:[[72,328],[62,315],[68,325],[71,325],[57,309],[66,317],[56,312],[34,286]],
  female:[[49,298],[35,278],[50,298],[50,293],[29,271],[50,291],[25,243],[40,249]]
 }
};
export function paintedFrameCalibration(directory,classId,gender,index,frame,idleScale){
 const factor=bodyScale(directory,classId,gender,idleScale);
 if(index<12)return {factor,foot:244};
 const height=frame.rect[3],body=classId==='lancer'?LANCER_WALK_BODY[directory]?.[gender]?.[index-12]:[0,height];
 if(!body||!(body[1]>body[0])||body[1]!==height||!(frame.scale>0))throw new Error('Walk body calibration needs remeasurement');
 // Preserve the existing walk normalization convention for other classes and
 // weapon sets, but use the measured body instead of the spear's extent.
 return {factor:BODY_HEIGHT/((body[1]-body[0])*frame.scale),foot:244-(height-body[1])*frame.scale};
}
// x/y/size describe the old 256px logical frame. Padding holds long weapons without shrinking the person.
export function drawCharacterFrame(ctx,frame,x,y,size=256){
 const ratio=size/LOGICAL_SIZE,pad=(FRAME_SIZE-LOGICAL_SIZE)/2;
 ctx.drawImage(frame,x-pad*ratio,y-pad*ratio,FRAME_SIZE*ratio,FRAME_SIZE*ratio);
}
