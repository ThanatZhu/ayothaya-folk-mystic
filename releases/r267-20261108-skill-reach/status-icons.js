import {STATUS_ICONS,statusDefinition,statusArtStyle,remainingStatus,statusTime} from './assets/status/status-catalog.js';
import {ITEMS} from './items.js?v=107';
export {STATUS_ICONS,statusDefinition,statusArtStyle};
const foodKeys={str:'strength',agi:'agility',vit:'vitality',int:'intelligence',dex:'dexterity'};
export function activeStatusIcons(world){
 const active=new Map();
 for(const [id,value] of Object.entries(world.status??{})){const def=statusDefinition(id),seconds=remainingStatus(value);if(def&&seconds)active.set(id,{...def,id,seconds});}
 const shield=remainingStatus(world.player?.shield);if(shield&&!active.has('shield'))active.set('shield',{...statusDefinition('shield'),seconds:shield});
 const foodLeft=remainingStatus(world.food?.left);if(foodLeft){const item=ITEMS[world.food.id];for(const key of Object.keys(item?.buff??{})){const id=foodKeys[key];if(id)active.set(id,{...statusDefinition(id),seconds:foodLeft,source:item.name});}}
 return [...active.values()].sort((a,b)=>(a.kind==='debuff')-(b.kind==='debuff'));
}
export function statusBadgeHTML(effect){
 const d=statusDefinition(effect.id);if(!d)return '';const en=globalThis.I18N?.lang==='en',name=en?d.en:d.name,description=en?d.enDescription:d.description,seconds=remainingStatus(effect.seconds),label=name+' · '+description+(seconds?' · '+seconds+(en?' s':' วินาที'):'');
 const safe=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 return `<span class="status-badge ${d.kind}" title="${safe(label)}" aria-label="${safe(label)}" data-status="${effect.id}"><i class="status-art" aria-hidden="true" style='${statusArtStyle(effect.id)}'></i>${seconds?'<b>'+statusTime(seconds)+'</b>':''}</span>`;
}
export function loadStatusStyles(){if(document.querySelector('link[data-status-art]'))return;const css=document.createElement('link');css.rel='stylesheet';css.href='./status-icons.css?v=1';css.dataset.statusArt='';document.head.append(css);}
