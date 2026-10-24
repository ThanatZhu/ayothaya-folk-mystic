export const TALK_DISTANCE=2.3;
export function nearestTalkNPC(npcs,player,radius=TALK_DISTANCE){
 if(!player||player.hp<=0)return null;let nearest=null,distance=radius;
 for(const npc of npcs){const d=Math.hypot(player.x-npc.x,player.z-npc.z);if(d<distance){nearest=npc;distance=d;}}
 return nearest;
}
const images=new WeakMap();
// Hit the painted silhouette, so the large transparent padding around a sprite
// still behaves as empty ground. Walking, sitting and mirrored poses use live UVs.
export function opaqueNPCHit(hit,makeCanvas=()=>document.createElement('canvas')){
 const texture=hit.object.material?.map,image=texture?.image;if(!image||!hit.uv)return true;
 try{
  const uv=hit.uv.clone();texture.transformUv(uv);let canvas=image;
  if(!image.getContext){if(!images.has(image)){canvas=makeCanvas();canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);images.set(image,canvas);}else canvas=images.get(image);}
  const x=Math.max(0,Math.min(canvas.width-1,Math.floor(uv.x*canvas.width))),y=Math.max(0,Math.min(canvas.height-1,Math.floor(uv.y*canvas.height)));
  return canvas.getContext('2d').getImageData(x,y,1,1).data[3]>=40;
 }catch{return true;}
}
