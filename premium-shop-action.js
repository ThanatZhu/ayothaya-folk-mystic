import {PREMIUM_SHOP_PRODUCTS} from './premium-shop-catalog.js';
import {normalizePetAccount} from './pet-account.js';
import {addLoot,normalizeBag} from './items.js';

// The host commits inventory, wallet and receipt as a single durable record.
export function buyPremiumItem(record,message){
 const {id,sku,quantity}=message;
 if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(id))throw Error('bad-request-id');
 const product=PREMIUM_SHOP_PRODUCTS.find(p=>p.sku===sku);
 if(!product)throw Error('bad-product');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>20)throw Error('bad-quantity');
 const wallet=normalizePetAccount(record.petCollection),signature=JSON.stringify([sku,quantity]),old=wallet.premiumShop.receipts.find(r=>r.id===id);
 if(old){if(old.signature!==signature)throw Error('request-conflict');return {record,purchase:old.purchase,replayed:true};}
 const total=product.price*quantity,count=product.count*quantity;
 if(wallet.balance<total)throw Error('no-gems');
 const loot=addLoot(normalizeBag(record.bag),{items:[{id:product.item,count}]});
 if(loot.lost.length)throw Error('bag-full');
 const purchase={sku,item:product.item,count,quantity,total};
 wallet.balance-=total;wallet.premiumShop.receipts=[...wallet.premiumShop.receipts,{id,signature,purchase}].slice(-64);
 return {record:{...record,bag:loot.bag,petCollection:wallet},purchase,replayed:false};
}
