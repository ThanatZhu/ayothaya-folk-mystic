import {itemDef} from './items.js?v=class-reward192';
// Manual healing, mana and remedy taps have no item cooldown. Food/teleports keep theirs.
export function rapidConsumable(id){
 const item=itemDef(id);
 return item?.kind==='potion'&&!item.buff&&!!(item.hp||item.mp||item.cure);
}
export function consumableCategory(id){
 const item=itemDef(id);if(!rapidConsumable(id))return null;
 return item.cure?'cure':item.hp?'hp':'mp';
}
export function consumableChoices(bag,category){
 return Object.keys(bag?.items??{}).filter(id=>(bag.items[id]??0)>0&&consumableCategory(id)===category)
  .sort((a,b)=>(itemDef(b)[category]??0)-(itemDef(a)[category]??0)||a.localeCompare(b));
}
