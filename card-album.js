// Deposits are distinct from the old automatically recorded discovery list.
import {ALBUM_CARDS,ALBUM_MILESTONES,normalizeAlbum} from './bounty.js?v=107';
import {normalizeBag,addLoot,MAX_COINS} from './items.js?v=107';

export const ALBUM_ERRORS={
 'album-card':'เลือกการ์ดมอนสเตอร์ที่ต้องการฝาก',
 'album-owned':'ไม่มีการ์ดใบนี้ในกระเป๋า',
 'album-deposited':'ฝากการ์ดชนิดนี้แล้ว',
 'album-full':'เว้นช่องกระเป๋าเพื่อรับรางวัลก่อนฝากการ์ด',
 'album-coins':'เบี้ยเต็มแล้ว · ใช้เบี้ยก่อนรับรางวัลสะสม',
};
export function normalizeAlbumState(record){
 const migrated=record?.albumSchema===2;
 const album=migrated?normalizeAlbum(record.album):[];
 // Legacy milestones were already paid. Preserve that ledger without treating discoveries as deposits.
 const paid=migrated?(Array.isArray(record.albumRewards)?record.albumRewards:[]):ALBUM_MILESTONES.filter(m=>normalizeAlbum(record?.album).length>=m.count).map(m=>m.count);
 return {albumSchema:2,album,albumRewards:ALBUM_MILESTONES.filter(m=>paid.includes(m.count)).map(m=>m.count)};
}
export function depositAlbumCard(record,bag,card){
 if(typeof card!=='string'||!ALBUM_CARDS.includes(card))throw Error('album-card');
 const state=normalizeAlbumState(record),b=normalizeBag(bag);
 if(state.album.includes(card))throw Error('album-deposited');
 if(!(b.items[card]>=1))throw Error('album-owned');
 if(--b.items[card]===0)delete b.items[card];
 state.album.push(card);
 const milestones=ALBUM_MILESTONES.filter(m=>state.album.length>=m.count&&!state.albumRewards.includes(m.count));
 const reward={coins:milestones.reduce((n,m)=>n+m.reward.coins,0),items:milestones.flatMap(m=>m.reward.items.map(i=>({...i})))};
 if(b.coins+reward.coins>MAX_COINS)throw Error('album-coins');
 const r=addLoot(b,reward);
 // Nothing is consumed if any milestone gift cannot fit.
 if(r.lost.length)throw Error('album-full');
 state.albumRewards.push(...milestones.map(m=>m.count));
 return {state,bag:r.bag,reward,milestones};
}
