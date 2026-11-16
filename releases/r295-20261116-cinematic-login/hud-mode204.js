// All in-game HUD owners use one breakpoint, including wide, short phone viewports
// previewed with a mouse. Input/performance policies may still distinguish devices.
export const MOBILE_HUD_QUERY='(any-pointer:coarse),(max-width:900px),(max-height:600px)';
export function mobileHudMedia(scope=globalThis){return scope.matchMedia(MOBILE_HUD_QUERY);}
export function usesMobileHud({width,height,coarse=false}){return coarse||width<=900||height<=600;}
