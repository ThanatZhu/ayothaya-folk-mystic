import {walkable} from './combat-core.js';
import {serializeTraveler,restoreTraveler} from './world-state.js';

export function captureSave(world,map,camera,controls,motion){
 return {schema:1,mapId:map.id,traveler:serializeTraveler(world),
  position:{x:world.player.x,z:world.player.z},
  settings:{zoom:camera.zoom,azimuth:controls.getAzimuthalAngle(),motion}};
}
export function validateSave(data,catalog){
 if(!data||data.schema!==1)throw new Error('save-version');
 if(!catalog.maps.some(m=>m.id===data.mapId))throw new Error('save-map');
 const t=data.traveler;
 if(!t||t.version!==5||!['hp','mp','kills'].every(k=>Number.isFinite(t[k]))||
  !Array.isArray(t.cooldowns)||t.cooldowns.length!==10||!t.cooldowns.every(Number.isFinite))throw new Error('save-data');
 return data;
}
export function applySave(world,map,data){
 if(!data)return;
 restoreTraveler(world,data.traveler);
 const p=data.position;
 if(data.mapId===map.id&&p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&walkable(p.x,p.z,.32,map.nav)){
  world.player.x=p.x;world.player.z=p.z;
 }
}
// Optimistic revision checks prevent an older tab/device from overwriting a newer save.
export function nextRevision(actual,expected){
 if(actual!==expected)throw new Error('save-conflict');
 return expected+1;
}
