import {createAmuletGachaPanel} from './amulet-gacha-ui.js?v=surfaces222';
import {drawAmulets} from './amulet-gacha.js';
import {normalizePetAccount} from './pet-account.js';
import {publicPetAccount} from './pet-account.js';
let record={bag:{coins:0,items:{}},petCollection:{balance:10000}},rainbow=false;
const game={online:true,world:{bag:record.bag,petCollection:normalizePetAccount(record.petCollection)}};
game.world.petCommand=async(type,data,id)=>{
 if(type!=='amuletDraw')throw Error('preview-only');
 await new Promise(r=>setTimeout(r,200));
 const random=rainbow?(()=>{let first=true;return ()=>{if(first){first=false;return 0;}return Math.random();};})():Math.random;
 const draw=drawAmulets(record,{...data,id},random);record=draw.record;rainbow=false;document.getElementById('lab-rainbow').textContent='ทดลองผลรุ้งครั้งถัดไป';
 return {petCollection:publicPetAccount(record.petCollection),bag:record.bag,results:draw.results,replayed:draw.replayed};
};
const panel=createAmuletGachaPanel({game,parent:document.getElementById('amulet-preview'),dialog:document.getElementById('pet-window')});panel.root.hidden=false;panel.root.removeAttribute('aria-labelledby');panel.root.setAttribute('aria-label','พรีวิวตู้พระเครื่องส้ม แดง และรุ้ง');panel.render(true);
document.getElementById('lab-funds').onclick=()=>{record.petCollection.balance=Math.min(1000000000,record.petCollection.balance+1000);game.world.petCollection=publicPetAccount(record.petCollection);panel.render(true);};
document.getElementById('lab-rainbow').onclick=e=>{rainbow=!rainbow;e.currentTarget.textContent=rainbow?'เปิดตัวอย่างรุ้งแล้ว · กดสุ่ม 1 ครั้ง':'ทดลองผลรุ้งครั้งถัดไป';};
