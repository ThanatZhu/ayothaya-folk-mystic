const overlaps=(a,b,gap=0)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
export function placeCoachTip({target,quest,width,height,viewportWidth,viewportHeight,obstacles=[]}){
 const gap=12,margin=12,rect=(left,top)=>({left,top,right:left+width,bottom:top+height});
 const candidates=[];if(quest)candidates.push(rect(quest.right+gap,target.top),rect(quest.left-width-gap,target.top),rect(quest.left,quest.bottom+gap),rect(quest.left,quest.top-height-gap));
 candidates.push(rect(target.right+gap,target.top),rect(target.left-width-gap,target.top),rect(target.left,target.top-height-gap),rect(target.left,target.bottom+gap));
 for(const c of candidates){c.left=Math.max(margin,Math.min(c.left,viewportWidth-width-margin));c.top=Math.max(margin,Math.min(c.top,viewportHeight-height-margin));c.right=c.left+width;c.bottom=c.top+height;
  if(c.right>viewportWidth-margin||c.bottom>viewportHeight-margin||overlaps(c,target,10)||quest&&overlaps(c,quest,8)||obstacles.some(r=>overlaps(c,r,4)))continue;return c;
 }
 return null; // Keep the non-interactive target ring when there is no safe space for a bubble.
}
