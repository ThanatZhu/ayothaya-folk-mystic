import test from 'node:test';import assert from 'node:assert/strict';
import {costExpenseDraft,monthlyBillableCosts,financeDay} from '../dashboard-finance172.js';
const domain={id:'c-domain',name:'ค่าจดโดเมนเนมส่วนตัว (.com / .gg)',payer:'Chok',category:'โดเมน / อื่นๆ',role:'ชื่อเว็บไซต์ส่วนตัว',cycle:'yearly',usd:11,thb:365,status:'optional'};
test('an annual optional domain becomes a reviewable full payment with the payer and correct category',()=>{
 const original=structuredClone(domain),draft=costExpenseDraft(domain);
 assert.deepEqual(draft,{type:'expense',category:'ค่าโดเมน / เว็บไซต์',title:domain.name,payer:'Chok',amount:365,note:domain.role});
 assert.deepEqual(domain,original);assert.equal(draft.amount,365,'an actual annual payment must not be divided by twelve or recalculated from USD');
 for(const status of ['optional','paused','free','active'])assert.equal(costExpenseDraft({...domain,status}).amount,365);
});
test('zero/invalid costs cannot become payments, while decimal baht amounts remain supported',()=>{
 for(const thb of [0,-1,NaN,Infinity,'bad'])assert.throws(()=>costExpenseDraft({...domain,thb}),/cost-amount/);
 assert.throws(()=>costExpenseDraft({...domain,name:'  '}),/cost-name/);
 assert.equal(costExpenseDraft({...domain,thb:365.5}).amount,365.5);
 assert.equal(costExpenseDraft({...domain,usd:0,thb:365.5}).amount,365.5);
});
test('the monthly shortcut excludes annual and one-time payments and preserves expense categories',()=>{
 const active={...domain,status:'active'},host={...active,id:'host',cycle:'monthly',category:'เซิร์ฟเวอร์ (Hosting)'},ads={...active,id:'ads',cycle:'monthly',category:'การตลาด / โฆษณา'};
 assert.deepEqual(monthlyBillableCosts([domain,active,{...active,cycle:'once'},host,ads,{...host,status:'paused'},{...host,thb:0}]).map(c=>c.id),['host','ads']);
 assert.equal(costExpenseDraft(ads).category,'ค่าโฆษณา / โปรโมท');assert.equal(costExpenseDraft(host).category,'ค่าเซิร์ฟเวอร์ (DigitalOcean/Render)');
});
test('default ledger dates use the Thai calendar day at the UTC date boundary',()=>{
 assert.equal(financeDay(new Date('2026-10-25T17:00:00Z')),'2026-10-26');assert.equal(financeDay(new Date('2026-10-25T16:59:59Z')),'2026-10-25');
});
