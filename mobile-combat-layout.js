// One template measured from the approved 2796 x 1290 screenshot (932 x 430 logical pixels).
// Centres are anchored to the right/bottom; the cluster always scales uniformly, never per button/class.
export const COMBAT_REFERENCE={width:932,height:430,controls:{
 'skill-1':{x:718.833333,y:354.333333,size:46.44},
 'skill-2':{x:743.833333,y:299.333333,size:46.44},
 'skill-3':{x:788.833333,y:257.666667,size:46.44},
 'skill-4':{x:848.833333,y:239.333333,size:46.44},
 attack:{x:834.5,y:354.666667,size:96},
 swap:{x:882.333333,y:284.5,size:44},
 target:{x:762.5,y:392.5,size:44}
}};
export const STANDARD_COMBAT_IDS=Object.keys(COMBAT_REFERENCE.controls);
export function standardCombatLayout({width,height}){
 const ref=COMBAT_REFERENCE,controls=Object.values(ref.controls);
 const extentX=Math.max(...controls.map(p=>ref.width-p.x+p.size/2)),extentY=Math.max(...controls.map(p=>ref.height-p.y+p.size/2));
 // Small landscapes keep the same silhouette without crowding the existing centre toolbar.
 // The renderer supplies at least 44px touch areas independently of visual scale.
 const scale=Math.min(Math.max(.85,Math.min(width/ref.width,height/ref.height)),(width-4)/extentX,(height-4)/extentY);
 return {scale,controls:Object.fromEntries(Object.entries(ref.controls).map(([id,p])=>{
  const size=p.size*scale,cx=width-(ref.width-p.x)*scale,cy=height-(ref.height-p.y)*scale;
  return [id,{x:cx-size/2,y:cy-size/2,width:size,height:size}];
 }))};
}
export function keepNonCombatPreferences(layout){
 for(const mode of ['landscape','portrait'])for(const id of STANDARD_COMBAT_IDS)delete layout[mode]?.[id];
 return layout;
}
