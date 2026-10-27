// Prices are a first-pass game catalog, not a real-money exchange rate.
import {STAT_RESET_ITEM,STAT_RESET_PRICE} from './stat-reset-item.js';
export const PREMIUM_RENAME_PRICE=1000;
export const PREMIUM_SHOP_PRODUCTS=Object.freeze([
 Object.freeze({sku:STAT_RESET_ITEM,item:STAT_RESET_ITEM,count:1,price:STAT_RESET_PRICE,category:'identity',name:'ยันต์คืนวิถี',tip:'รีเซ็ตแต้มสถานะที่ลงไว้ทั้งหมด · ใช้จากกระเป๋า · เก็บโบนัสจุติและอุปกรณ์เดิม'}),
 Object.freeze({sku:'rename-card',item:'rename-card',count:1,price:PREMIUM_RENAME_PRICE,category:'identity',name:'บัตรเปลี่ยนชื่อ',tip:'เปลี่ยนชื่อตัวละคร 1 ครั้ง · กดปากกาข้างชื่อตัวละครเพื่อใช้บัตร'}),
 Object.freeze({sku:'lek-lai-pack',item:'lek-lai',count:5,price:100,category:'refine',name:'เหล็กไหล · 5 ชิ้น',tip:'วัตถุดิบเสริมสำหรับตีบวก · ตรวจเงื่อนไขและโอกาสสำเร็จในหน้าตีบวก'}),
 Object.freeze({sku:'break-guard',item:'break-guard',count:1,price:100,category:'refine',name:'ยันต์กันแตก',tip:'ใช้ป้องกันอุปกรณ์ตามเงื่อนไขในหน้าตีบวก · ไม่ทำให้โอกาสสำเร็จเป็น 100%'})
]);
export function normalizePremiumShop(raw){return {receipts:Array.isArray(raw?.receipts)?raw.receipts.filter(r=>typeof r?.id==='string'&&typeof r?.signature==='string'&&r.purchase).slice(-64):[]};}
