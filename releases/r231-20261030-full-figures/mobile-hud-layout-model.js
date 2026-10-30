export const HUD_LAYOUT_KEY='ayothaya-mobile-hud-v1';
export const HUD_CONTROL_IDS=['skill-1','skill-2','skill-3','skill-4','attack','swap','auto','joystick','target'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function normalizeHudLayout(raw){
 const out={v:1,landscape:{},portrait:{}};
 for(const mode of ['landscape','portrait'])for(const id of HUD_CONTROL_IDS){const p=raw?.[mode]?.[id];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))out[mode][id]={x:clamp(p.x,0,1),y:clamp(p.y,0,1)};}
 return out;
}
export function hudPixelPosition(point,viewport,size){
 return {x:clamp(point.x*viewport.width-size.width/2,4,Math.max(4,viewport.width-size.width-4)),y:clamp(point.y*viewport.height-size.height/2,4,Math.max(4,viewport.height-size.height-4))};
}
export function hudRelativePosition(rect,viewport){return {x:clamp((rect.x+rect.width/2)/viewport.width,0,1),y:clamp((rect.y+rect.height/2)/viewport.height,0,1)};}
