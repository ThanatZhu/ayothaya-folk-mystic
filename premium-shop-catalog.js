// Prices are a first-pass game catalog, not a real-money exchange rate.
// Old SKUs keep their ids so purchase receipts stay valid. Every product lists its items; bundles list several.
import {STAT_RESET_ITEM,STAT_RESET_PRICE} from './stat-reset-item.js';
import {REVIVAL_ITEM,REVIVAL_PRICE} from './revival-item.js';
export const PREMIUM_RENAME_PRICE=1000;
export const SHOP_CATEGORIES=Object.freeze([
 {id:'featured',name:'แนะนำ'},{id:'bundle',name:'แพ็กคุ้มค่า'},{id:'food',name:'อาหารบัฟ'},{id:'travel',name:'ของใช้เดินทาง'},
 {id:'refine',name:'ตีบวก'},{id:'identity',name:'ตัวละคร'},{id:'favorite',name:'รายการโปรด'}
].map(Object.freeze));
// Systems still to be built: listed in the sidebar so players see what is coming.
export const SHOP_COMING=Object.freeze(['ยันต์ EXP / ดรอป','กรอบชื่อ','ออร่า','ชุดแฟชั่น','พาหนะ']);
const P=(sku,category,price,name,tip,{item,count=1,items=[{id:item,count}],...extra})=>Object.freeze({sku,category,price,name,tip,...extra,item:items[0].id,count:items[0].count,items:Object.freeze(items.map(i=>Object.freeze({...i})))});
const food=(item,name,stat)=>P('food-'+item,'food',25,name+' · 5 ชิ้น',`กินแล้ว ${stat} +4 นาน 10 นาที`,{item,count:5});
export const PREMIUM_SHOP_PRODUCTS=Object.freeze([
 P('bundle-adventurer','bundle',95,'แพ็กนักผจญภัย','ยาสมุนไพรแดงขวดใหญ่ 20 · น้ำมนต์ทองคำ 10 · ปีกเหินลม 10 · ธูปกลับเมือง 3 · ถูกกว่าซื้อแยก',{badge:'hot',featured:true,items:[{id:'hp-large',count:20},{id:'mp-large',count:10},{id:'fly-wing',count:10},{id:'return-incense',count:3}]}),
 P('bundle-starter','bundle',50,'แพ็กมือใหม่','ยาสมุนไพรแดงขวดใหญ่ 10 · น้ำมนต์ทองคำ 5 · ปีกเหินลม 5 · ธูปกลับเมือง 2',{badge:'new',featured:true,items:[{id:'hp-large',count:10},{id:'mp-large',count:5},{id:'fly-wing',count:5},{id:'return-incense',count:2}]}),
 P('bundle-refine','bundle',320,'แพ็กตีบวก','เหล็กไหล 10 · ยันต์กันแตก 2 · ถูกกว่าซื้อแยก',{badge:'value',featured:true,items:[{id:'lek-lai',count:10},{id:'break-guard',count:2}]}),
 P('bundle-feast','bundle',55,'แพ็กอาหารบัฟ','ข้าวต้มมัด เมี่ยงคำ ข้าวหลาม บัวลอยใบเตย ตั๊กแตนทอดกรอบ อย่างละ 3',{badge:'value',featured:true,items:['khao-tom-mat','miang-kham','khao-lam','bua-loi','fried-hopper'].map(id=>({id,count:3}))}),
 P('bundle-hero','bundle',420,'แพ็กฮีโร่','ยันต์คืนวิถี 1 · ยันต์คืนขวัญ 2 · ยาสมุนไพรแดงขวดใหญ่ 20',{items:[{id:STAT_RESET_ITEM,count:1},{id:REVIVAL_ITEM,count:2},{id:'hp-large',count:20}]}),
 food('khao-tom-mat','ข้าวต้มมัด','STR'),food('miang-kham','เมี่ยงคำ','AGI'),food('khao-lam','ข้าวหลาม','VIT'),food('bua-loi','บัวลอยใบเตย','INT'),food('fried-hopper','ตั๊กแตนทอดกรอบ','DEX'),
 P('hp-large-pack','travel',40,'ยาสมุนไพรแดงขวดใหญ่ · 20 ขวด','ฟื้น HP 180 ต่อขวด',{featured:true,item:'hp-large',count:20}),
 P('mp-large-pack','travel',40,'น้ำมนต์ทองคำ · 10 ขวด','ฟื้น MP 120 ต่อขวด',{item:'mp-large',count:10}),
 P('green-herb-pack','travel',20,'ยาเขียว · 10 ชิ้น','แก้พิษและอาการผิดปกติ',{item:'green-herb',count:10}),
 P('fly-wing-pack','travel',30,'ปีกเหินลม · 10 ชิ้น','วาร์ปไปจุดสุ่มในแผนที่นี้',{featured:true,item:'fly-wing',count:10}),
 P('return-incense-pack','travel',30,'ธูปกลับเมือง · 5 ดอก','จุดแล้วกลับเมืองหลวงอยุธยาจากที่ไหนก็ได้',{item:'return-incense',count:5}),
 P(REVIVAL_ITEM,'travel',REVIVAL_PRICE,'ยันต์คืนขวัญ','ฟื้นคืนชีพตรงจุดที่ล้ม',{badge:'new',featured:true,item:REVIVAL_ITEM}),
 P('lek-lai-pack','refine',100,'เหล็กไหล · 5 ชิ้น','วัตถุดิบเสริมสำหรับตีบวก · ตรวจเงื่อนไขและโอกาสสำเร็จในหน้าตีบวก',{featured:true,item:'lek-lai',count:5}),
 P('break-guard','refine',100,'ยันต์กันแตก','ใช้ป้องกันอุปกรณ์ตามเงื่อนไขในหน้าตีบวก · ไม่ทำให้โอกาสสำเร็จเป็น 100%',{badge:'hot',featured:true,item:'break-guard'}),
 P(STAT_RESET_ITEM,'identity',STAT_RESET_PRICE,'ยันต์คืนวิถี','รีเซ็ตแต้มสถานะที่ลงไว้ทั้งหมด · ใช้จากกระเป๋า · เก็บโบนัสจุติและอุปกรณ์เดิม',{featured:true,item:STAT_RESET_ITEM}),
 P('rename-card','identity',PREMIUM_RENAME_PRICE,'บัตรเปลี่ยนชื่อ','เปลี่ยนชื่อตัวละคร 1 ครั้ง · กดปากกาข้างชื่อตัวละครเพื่อใช้บัตร',{item:'rename-card'})
]);
export function normalizePremiumShop(raw){return {receipts:Array.isArray(raw?.receipts)?raw.receipts.filter(r=>typeof r?.id==='string'&&typeof r?.signature==='string'&&r.purchase).slice(-64):[]};}
