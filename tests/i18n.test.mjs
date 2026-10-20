import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collect} from '../scripts/i18n-missing.mjs';

const THAI=/[฀-๿]/;
await import('../i18n-en.js');
const dict=globalThis.I18N_EN;

// Run i18n.js against a bare stub of the browser in English mode.
function load(stored){
 const store={'ayothaya.lang':stored};
 globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v};
 Object.defineProperty(globalThis,'navigator',{value:{language:'th-TH'},configurable:true});
 globalThis.document={addEventListener(){},documentElement:{nodeType:9,style:{setProperty(){}}}};
 globalThis.window={alert(){},confirm(){},prompt(){}};
 globalThis.MutationObserver=class{observe(){}};
 new Function(readFileSync(new URL('../i18n.js',import.meta.url),'utf8'))();
 return globalThis.I18N;
}

test('every player-facing Thai string has English with the same placeholders', () => {
 const missing=[...collect().keys()].filter(s=>!(s in dict));
 assert.deepEqual(missing,[],'run node scripts/i18n-missing.mjs');
 const holes=s=>(s.match(/\{\d+\}/g)??[]).sort().join();
 for(const [th,en] of Object.entries(dict)){
  assert.ok(!THAI.test(en),th);
  assert.equal(holes(en),holes(th),th);
 }
});

test('English mode translates exact, templated and pieced-together text; Thai mode is untouched', () => {
 const {t,lang}=load('en');
 assert.equal(lang,'en');
 assert.equal(t('  นักดาบ '),'  Swordsman ');
 assert.equal(t('ช่องที่ใช้ 3 / 40'),'Slots used 3 / 40');
 assert.equal(t('ของขวัญ Lv.2 · นักดาบ'),'Gift Lv.2 · Swordsman');
 assert.equal(t('นักดาบ / หมอผี'),'Swordsman / Shaman');
 assert.equal(t('Novice · ชาย'),'Novice · Male');
 assert.equal(t('เซิร์ฟเวอร์ 1 · อยุธยา · ริมเจ้าพระยา'),'Realm 1 · Ayutthaya · Chao Phraya Riverside');
 assert.equal(t('ตั้งแผง'),'Set Up Stall');
 assert.equal(t('ประกาศ: 🔥 ฝูงคลั่งที่ บึงบัวต้องมนตร์! · EXP ×2 และดรอป ×2 อีก 5 นาที'),'Announcement: 🔥 Frenzy swarm at Enchanted Lotus Marsh! · EXP ×2 and drop ×2 for 5 min');
 assert.equal(t('HP 10'),'HP 10');
 const th=load('th');
 assert.equal(th.lang,'th');
 assert.equal(th.t('นักดาบ'),'นักดาบ');
});
