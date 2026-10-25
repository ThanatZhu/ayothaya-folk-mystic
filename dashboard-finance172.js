// A recurring budget is separate from an actual payment. Annual payments keep their full amount.
const CATEGORIES={
 'เซิร์ฟเวอร์ (Hosting)':'ค่าเซิร์ฟเวอร์ (DigitalOcean/Render)',
 'ฐานข้อมูล (Database)':'ค่าหน้าเว็บ / ฐานข้อมูล',
 'หน้าเว็บ (Frontend)':'ค่าหน้าเว็บ / ฐานข้อมูล',
 'พัฒนาเกม / อาร์ต / AI':'ค่าพัฒนาเกม / อาร์ต / เสียง',
 'การตลาด / โฆษณา':'ค่าโฆษณา / โปรโมท',
 'โดเมน / อื่นๆ':'ค่าโดเมน / เว็บไซต์'
};
export const financeDay=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function costExpenseDraft(cost){
 const amount=Number(cost?.thb),title=String(cost?.name??'').trim();
 if(!Number.isFinite(amount)||amount<=0)throw Error('cost-amount');
 if(!title)throw Error('cost-name');
 return {type:'expense',category:CATEGORIES[cost.category]??'ทุนสำรอง / อื่นๆ',title,payer:String(cost.payer??'').trim(),amount:Math.round((amount+Number.EPSILON)*100)/100,note:String(cost.role??'').trim()};
}
export const monthlyBillableCosts=costs=>costs.filter(c=>c.status==='active'&&c.cycle==='monthly'&&Number.isFinite(Number(c.thb))&&Number(c.thb)>0);
