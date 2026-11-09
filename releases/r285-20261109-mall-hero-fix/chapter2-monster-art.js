// Review renderer for authored atlases; live monster catalog and spawns are unchanged.
export const CHAPTER2_ACTIONS=['sequence','idle','move','attack','hurt','down'];
const BASE='./assets/monsters-chapter2/';
export async function loadChapter2Monster(monster){
  const response=await fetch(BASE+monster.animation);
  if(!response.ok)throw new Error('Missing animation: '+monster.id);
  const meta=await response.json(),source=new Image();
  source.src=BASE+'animations/'+meta.source;await source.decode();
  if(source.width!==meta.sourceSize[0]||source.height!==meta.sourceSize[1])throw new Error('Atlas dimensions changed: '+monster.id);
  const frames=meta.frames.map(frame=>{
    const [sx,sy,w,h]=frame.rect,canvas=document.createElement('canvas');
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d'),path=new Path2D();
    // Clip to this creature's alpha component: neighboring wings may overlap
    // nominal cell bounding boxes. Original PNG pixels stay untouched.
    for(const [y,x,length] of frame.clipRows)path.rect(x,y,length,1);
    ctx.clip(path);ctx.drawImage(source,sx,sy,w,h,0,0,w,h);
    return canvas;
  });
  return {monster,meta,frames};
}
function clipFrame(clip,time){
  const total=clip.durations.reduce((a,b)=>a+b,0);
  let t=clip.loop?Math.max(0,time)%total:Math.min(Math.max(0,time),total-1);
  for(let i=0;i<clip.frames.length;i++){if(t<clip.durations[i])return clip.frames[i];t-=clip.durations[i];}
  return clip.frames.at(-1);
}
export function chapter2FrameAt(meta,action,time){
  if(action==='sequence'){
    let t=Math.max(0,time)%9000;
    for(const [name,length] of [['idle',1000],['move',2600],['attack',2400],['hurt',1500],['down',1500]]){
      if(t<length)return {index:clipFrame(meta.clips[name],t),action:name};t-=length;
    }
  }
  const clip=meta.clips[action];if(!clip)throw new Error('Unknown monster action: '+action);
  return {index:clipFrame(clip,time),action};
}
export function drawChapter2Monster(ctx,asset,index,x,foot,idleHeight){
  const frame=asset.meta.frames[index],scale=idleHeight/asset.meta.idlePixels;
  const [,,w,h]=frame.rect,[ax,ay]=frame.anchor;
  ctx.save();ctx.translate(x,foot);if(frame.flipX)ctx.scale(-1,1);
  ctx.drawImage(asset.frames[index],-ax*scale,-ay*scale,w*scale,h*scale);ctx.restore();
}
export function chapter2PreviewSize(asset,maxWidth,maxHeight){
  const w=Math.max(...asset.meta.frames.map(f=>f.rect[2])),h=Math.max(...asset.meta.frames.map(f=>f.rect[3]));
  return Math.min(maxWidth/w,maxHeight/h)*asset.meta.idlePixels;
}
