// Presentation rules share the real recipes and atomic crafting validation.
import {RECIPES,CRAFT_GROUPS,craftable,craft} from './crafting.js?v=amulet-craft193';
import {ITEMS,DROPS,SHOPS,normalizeBag,itemDef} from './items.js?v=amulet-craft193';
import {MONSTER_TYPES} from './combat-core.js?v=surfaces222';
import {CONQUEST_SHARD} from './rainbow-crafting.js';
import {recipeAllowed,WEAPON_COLOURS} from './weapon-crafting.js';
export const craftRecipeLabel=r=>itemDef(r.out).name+(r.weaponGrade!=null?' · '+WEAPON_COLOURS[r.weaponGrade]:'');
const normalize=s=>String(s??'').normalize('NFKC').toLowerCase().trim();
export function craftRecipes(bag,{classId,gender,group='potion',query='',readyOnly=false,translate=s=>s}={}){
 const search=normalize(query);
 return RECIPES.filter(r=>{const it=itemDef(r.out);return it&&!it.retired&&r.group===group&&recipeAllowed(it,{classId,gender})&&(!readyOnly||craftable(bag,r)>0)&&(!search||normalize([r.out,craftRecipeLabel(r),it.text,translate(it.name)].join(' ')).includes(search));});
}
export function craftQuote(raw,recipe,quantity=1,character=null){
 if(!recipe)return null;const bag=normalizeBag(raw),max=craftable(bag,recipe),times=Math.max(1,Math.min(max||1,99,Math.floor(Number(quantity))||1));
 let reason=null;try{craft(bag,recipe.out,times,Math.random,character);}catch(e){reason=e.message;}
 return {times,max,made:recipe.count*times,cost:recipe.coins*times,canCraft:!reason,reason,needs:Object.entries(recipe.needs).map(([id,n])=>({id,have:bag.items[id]??0,need:n*times,missing:Math.max(0,n*times-(bag.items[id]??0))}))};
}
export function craftSources(id,catalog={maps:[]}){
 const maps=catalog.maps??[],sources=[];
 if(id===CONQUEST_SHARD)sources.push({kind:'event',name:'กิลด์วอร์อันดับ 1–3',detail:'สมาชิกที่ร่วมรบทุกคน · สุ่ม 1–3 เศษ · รับทางจดหมาย'});
 for(const [name,shop]of Object.entries(SHOPS))if(shop.stock.includes(id))sources.push({kind:'shop',name,map:maps.find(m=>m.id===shop.mapId)?.name??shop.mapId,currency:shop.currency?ITEMS[shop.currency]?.name:null});
 for(const [monster,drop]of Object.entries(DROPS))if(drop.items.some(([item,rate])=>item===id&&rate>0)){
  const index=MONSTER_TYPES.findIndex(t=>t.id===monster),type=MONSTER_TYPES[index];if(!type)continue;
  const locations=maps.filter(m=>m.worldBoss?.id===monster||(m.mobs??[]).some(([,,n])=>n===index));
  sources.push({kind:'drop',name:type.name,maps:locations.map(m=>m.name)});
 }
 for(const r of RECIPES.filter(r=>r.out===id))sources.push({kind:'craft',name:CRAFT_GROUPS.find(([key])=>key===r.group)?.[1]??r.group,group:r.group});
 return sources;
}
