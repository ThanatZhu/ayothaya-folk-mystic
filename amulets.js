// Cultural inspiration, with fictional gameplay values. No claims about real amulets' powers.
export const AMULET_PRICE=100,AMULET_PITY=100,AMULET_RATE=.005;
export const AMULET_TIERS=Object.freeze([
 {id:'rainbow',name:'รุ้ง',rate:AMULET_RATE,power:1},
 {id:'red',name:'แดง',rate:.045,power:.75},
 {id:'orange',name:'ส้ม',rate:.20,power:.5},
]);
export const AMULET_MATERIALS=Object.freeze([
 {id:'lek-lai',count:2,rate:.25},
 {id:'break-guard',count:1,rate:.20},
 {id:'shard-soul',count:3,rate:.20},
 {id:'shard-gem',count:1,rate:.10},
]);
export const AMULETS=Object.freeze([
 {id:'amulet-somdej',art:'somdej',name:'พระสมเด็จวัดระฆัง',origin:'กรุงเทพมหานคร',theme:'คุ้มครอง',ability:'ร่มโพธิ์คุ้มกาย',
  bonus:{vit:12,int:6},def:24,mdef:18,pct:{hpPct:1,defPct:.50,dmgReduce:.30}},
 {id:'amulet-phra-rod',art:'phra-rod',name:'พระรอดวัดมหาวัน',origin:'ลำพูน',theme:'แคล้วคลาด',ability:'ก้าวพ้นภยันตราย',
  bonus:{agi:16,dex:10},def:16,mdef:16,pct:{moveSpeed:.15,dmgReduce:.20},effect:{flee:.35}},
 {id:'amulet-nang-phaya',art:'nang-phaya',name:'พระนางพญา',origin:'พิษณุโลก',theme:'บารมี',ability:'บารมีนางพญา',
  bonus:{str:12,int:12},atk:25,matk:25,pct:{atkPct:.80,matkPct:.80,crit:.20,critDmg:1,armorPen:.30}},
 {id:'amulet-phong-suphan',art:'phong-suphan',name:'พระผงสุพรรณ',origin:'สุพรรณบุรี',theme:'เมตตาและคงกระพัน',ability:'ขวัญมั่นแห่งสุพรรณ',
  bonus:{vit:10,int:12},atk:18,matk:18,def:20,mdef:20,pct:{hpPct:.50,mpCut:.40,cdr:.40}},
 {id:'amulet-sum-kor',art:'sum-kor',name:'พระกำแพงซุ้มกอ',origin:'กำแพงเพชร',theme:'โชคลาภ',ability:'ลาภผลแห่งทุ่งเศรษฐี',
  bonus:{luk:20,dex:10},atk:15,matk:15,pct:{hpPct:.30,crit:.15},effect:{coinPct:2}},
]);
export const amuletArt=a=>'assets/amulets-rainbow/'+a.art+'.png';
const rounded=n=>Math.round((n+Number.EPSILON)*10000)/10000;
function effectLines(pct,effect){
 const lines=[],percent=n=>rounded(n*100);
 if(pct.atkPct===pct.matkPct&&pct.atkPct)lines.push('ATK / MATK +'+percent(pct.atkPct)+'%');
 else for(const k of ['atkPct','matkPct'])if(pct[k])lines.push((k==='atkPct'?'ATK':'MATK')+' +'+percent(pct[k])+'%');
 const labels={hpPct:n=>'HP สูงสุด +'+n+'%',defPct:n=>'DEF +'+n+'%',dmgReduce:n=>'ลดความเสียหายที่ได้รับ '+n+'%',
  moveSpeed:n=>'ความเร็วเคลื่อนที่ +'+n+'%',crit:n=>'คริติคอล +'+n+' จุดเปอร์เซ็นต์',critDmg:n=>'ดาเมจคริติคอล +'+n+' จุดเปอร์เซ็นต์',armorPen:n=>'เจาะเกราะ '+n+'%',cdr:n=>'ลดคูลดาวน์สกิล '+n+'%',mpCut:n=>'ใช้ MP กับสกิลน้อยลง '+n+'%'};
 for(const [key,label] of Object.entries(labels))if(pct[key])lines.push(label(percent(pct[key])));
 if(effect.flee)lines.push('โอกาสหลบหลีก +'+percent(effect.flee)+' จุดเปอร์เซ็นต์');
 if(effect.coinPct)lines.push('เบี้ยจากมอนสเตอร์ +'+percent(effect.coinPct)+'%');
 return lines;
}
export function amuletAtTier(amulet,tierId='rainbow'){
 const a=typeof amulet==='string'?AMULETS.find(a=>a.id===amulet):amulet,tier=AMULET_TIERS.find(t=>t.id===tierId);
 if(!a||!tier)throw Error('bad-amulet-tier');
 const scale=values=>Object.fromEntries(Object.entries(values??{}).map(([k,v])=>[k,rounded(v*tier.power)]));
 const pct=tierId==='rainbow'?{...a.pct}:{},effect=tierId==='rainbow'?{...a.effect}:{};
 return {...a,id:tierId==='rainbow'?a.id:a.id+'-'+tierId,amuletBase:a.id,tier:tier.id,tierName:tier.name,bonus:scale(a.bonus),pct,effect,
  ...Object.fromEntries(['atk','matk','def','mdef'].map(k=>[k,rounded((a[k]??0)*tier.power)])),effects:effectLines(pct,effect)};
}
export const AMULET_REWARDS=Object.freeze([...AMULET_TIERS.flatMap(t=>AMULETS.map(a=>({id:amuletAtTier(a,t.id).id,count:1,tier:t.id,rate:t.rate/AMULETS.length}))),...AMULET_MATERIALS.map(r=>({...r,tier:'material'}))]);
export function buildAmuletItems(){return Object.fromEntries(AMULET_TIERS.flatMap(t=>AMULETS.map(base=>{
 const a=amuletAtTier(base,t.id);return [a.id,{
 name:a.name+' · '+a.tierName,image:amuletArt(a),kind:'gear',slot:'accessory',level:1,slots:0,sell:0,rarity:4,rainbow:t.id==='rainbow',amulet:true,amuletTier:t.id,amuletBase:base.id,
 bonus:{...a.bonus},atk:a.atk??0,matk:a.matk??0,def:a.def??0,mdef:a.mdef??0,pct:{...a.pct},effect:{...a.effect},
 text:[...(t.id==='rainbow'?[a.ability,...a.effects]:['สเตตัสอุปกรณ์เท่านั้น · ไม่มีเอฟเฟกต์พิเศษ']),...['atk','matk','def','mdef'].filter(k=>a[k]).map(k=>k.toUpperCase()+' +'+a[k]),...Object.entries(a.bonus).map(([k,v])=>k.toUpperCase()+' +'+v),'เครื่องประดับระดับ'+a.tierName+' · ทุกอาชีพ · สวมใส่ได้ครั้งละ 1 องค์'].join(' · ')
 }];})));}
const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0?Math.min(n,max):0;
export function normalizeAmuletGacha(raw){
 const v=raw??{};
 return {v:1,pity:integer(v.pity,AMULET_PITY-1),pulls:integer(v.pulls,1000000000),
  receipts:Array.isArray(v.receipts)?v.receipts.filter(r=>typeof r?.id==='string'&&[1,10].includes(r.count)&&Array.isArray(r.results)).slice(-64):[]};
}
