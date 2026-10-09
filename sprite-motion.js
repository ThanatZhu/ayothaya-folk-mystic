// Four illustrated poses per gender; timing is shared by the lobby and the world.
export function poseFrame({time=0,moving=false,casting=false,reduced=false}={}){
 if(reduced)return casting?3:0;
 if(casting)return 3;
 return moving?[1,0,2,0][Math.floor(time*9)%4]:0;
}
export function atlasCell(gender,frame){
 const row=gender==='female'?1:0;return [Math.max(0,Math.min(3,frame))/4,row/2,.25,.5];
}
export function previewPose(time,mode='cycle',reduced=false){
 const phase=time%7,moving=mode==='walk'||(mode==='cycle'&&phase>=2&&phase<4.5),casting=mode==='attack'||(mode==='cycle'&&phase>=5&&phase<5.65);
 return {frame:poseFrame({time,moving,casting,reduced}),moving,casting};
}
