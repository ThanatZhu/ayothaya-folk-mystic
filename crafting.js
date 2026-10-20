// 0.94 crafting: monster drops + a few cowries become potions, food and refine stones. Shared by the realm server
// and the offline bag, so the recipes and checks are the same everywhere. Crafting works anywhere (from the bag).
import {normalizeBag,addLoot} from './items.js?v=95';

export const CRAFT_GROUPS=[['potion','ยา'],['food','อาหาร'],['refine','หินตีบวก']];
// out: item made, count: how many per craft, needs: materials used, coins: cowries spent.
export const RECIPES=[
 {out:'hp-small',count:2,group:'potion',needs:{'straw-bundle':3},coins:5},
 {out:'mp-small',count:2,group:'potion',needs:{'rat-tooth':2,'lantern-paper':1},coins:5},
 {out:'sticky-rice',count:2,group:'potion',needs:{'rice-sheaf':1},coins:5},
 {out:'hp-large',count:1,group:'potion',needs:{'hp-small':3,'spirit-thread':1},coins:10},
 {out:'mp-large',count:1,group:'potion',needs:{'mp-small':3,'lantern-paper':1},coins:10},
 {out:'green-herb',count:1,group:'potion',needs:{'lotus-seed':1,'tough-vine':1},coins:10},
 {out:'khao-tom-mat',count:1,group:'food',needs:{'rice-sheaf':2,'sticky-rice':1},coins:20},
 {out:'miang-kham',count:1,group:'food',needs:{'betel-nut':3,'tough-vine':1},coins:20},
 {out:'fried-hopper',count:1,group:'food',needs:{'hopper-wing':3},coins:20},
 {out:'khao-lam',count:1,group:'food',needs:{'rice-sheaf':2,'tough-vine':2},coins:30},
 {out:'bua-loi',count:1,group:'food',needs:{'lotus-seed':2,'sticky-rice':1},coins:30},
 {out:'iron-ore',count:1,group:'refine',needs:{'rat-tooth':4,'hopper-wing':2},coins:60},
 {out:'laterite',count:1,group:'refine',needs:{'straw-bundle':4,'betel-nut':2},coins:60},
 {out:'lek-lai',count:1,group:'refine',needs:{'spirit-thread':5,'palm-leaf':1},coins:500},
 {out:'break-guard',count:1,group:'refine',needs:{'palm-leaf':2,'spirit-thread':3,'lek-lai':1},coins:2000},
];
export const recipeFor=out=>RECIPES.find(r=>r.out===out)??null;
// How many times the bag can afford a recipe.
export function craftable(bag,r){const b=normalizeBag(bag);let n=r.coins?Math.floor(b.coins/r.coins):99;for(const [id,k] of Object.entries(r.needs))n=Math.min(n,Math.floor((b.items[id]??0)/k));return Math.max(0,Math.min(99,n));}
export function craft(bag,out,times=1){
 const r=recipeFor(out);if(!r)throw new Error('no-recipe');
 if(!Number.isSafeInteger(times)||times<1||times>99)throw new Error('bad-count');
 if(craftable(bag,r)<times)throw new Error(normalizeBag(bag).coins<r.coins*times?'no-coins':'no-material');
 const b=normalizeBag(bag);b.coins-=r.coins*times;
 for(const [id,k] of Object.entries(r.needs)){b.items[id]-=k*times;if(!b.items[id])delete b.items[id];}
 const res=addLoot(b,{items:[{id:out,count:r.count*times}]});if(res.lost.length)throw new Error('bag-full');
 return {bag:res.bag,made:r.count*times};
}
