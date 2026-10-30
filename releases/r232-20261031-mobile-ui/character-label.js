import {BODY_HEIGHT,LOGICAL_SIZE} from './character-size.js?v=size1';
// Characters are camera-facing planes planted at their feet, not vertical world-space billboards.
// Use that same camera up vector for the head, including root-motion offsets and raised ground.
export function characterHead(sprite,camera){
 const up=camera.matrixWorld.elements,h=sprite.scale.y*BODY_HEIGHT/LOGICAL_SIZE+.18,p=sprite.position;
 return {x:p.x+up[4]*h,y:p.y+up[5]*h,z:p.z+up[6]*h};
}
