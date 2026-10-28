// Keep the established full-size HUD, then reduce small landscape screens together.
export function mobileHudScale208({width,height}){
 if(height>width)return 1;
 return Math.max(.55,Math.min(1,width/760,height/390));
}
