import test from 'node:test';import assert from 'node:assert/strict';
import {price,shopCurrency,currencyChips} from '../market-currency.js';
test('price writes coins and gold with their unit',()=>{
 assert.equal(price(1200,'coins'),'1,200 เบี้ย');
 assert.equal(price(35,'gold'),'35 ทองแท่ง');
 assert.equal(price(undefined),'0 เบี้ย');
 assert.equal(price(5,'junk'),'5 เบี้ย');
});
test('shopCurrency defaults to coins',()=>{assert.equal(shopCurrency({currency:'gold'}),'gold');assert.equal(shopCurrency({}),'coins');assert.equal(shopCurrency(null),'coins');});
test('currencyChips: gold chip only while the switch is on',()=>{
 assert.deepEqual(currencyChips(false),['all','coins']);
 assert.deepEqual(currencyChips(true),['all','coins','gold']);
});
