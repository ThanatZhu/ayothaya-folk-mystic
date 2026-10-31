// Compatibility entry point for existing game and lab imports.
// Ordinary menus use the approved 236 skin; preserve existing gacha/pet subpanels.
import {installUnifiedMenus236} from './unified-menu236.js';
export function installJadeSurfaces(){
 if(globalThis.__jadeSurfaces222)return globalThis.__jadeSurfaces222;
 const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./jade-surfaces222.css',import.meta.url).href;link.id='jade-surfaces222';document.head.append(link);
 const api=installUnifiedMenus236();globalThis.__jadeSurfaces222=api;return api;
}
installJadeSurfaces();
