import {normalizeBag} from './items.js?v=revival-shop181';
export const REVIVAL_ITEM='soul-talisman',REVIVAL_PRICE=200;
export const revivalCount=bag=>normalizeBag(bag).items[REVIVAL_ITEM]??0;
// Pure transaction shared by offline inventory and the authoritative server.
export function consumeRevival(bag,player){
 if(!(player?.hp<=0))throw Error('respawn-invalid');
 const next=normalizeBag(bag);if(!(next.items[REVIVAL_ITEM]>0))throw Error('no-revival-item');
 if(--next.items[REVIVAL_ITEM]===0)delete next.items[REVIVAL_ITEM];return next;
}
