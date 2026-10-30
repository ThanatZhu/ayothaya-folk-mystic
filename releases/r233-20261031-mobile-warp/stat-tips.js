// 0.122 hover / tap help for each status stat: what one point does for this class (read from deriveStats in
// character-stats.js, so keep the two in step) and, worked out live, what the next point would add right now.
import {STAT_LABEL,STAT_MAX,raiseCost,deriveStats} from './character-stats.js?v=tier167';

const MAGIC=new Set(['shaman','acolyte']),RANGED=new Set(['hunter']);
const RULES={
 str:c=>MAGIC.has(c)?['สายเวทตีด้วย MATK · STR แทบไม่มีผลกับดาเมจ']:RANGED.has(c)?['ทุก 5 STR: ATK +1']:['ATK +1 ต่อแต้ม','ครบทุก 10 แต้ม ATK โบนัสเพิ่ม (10 = +1 · 20 = +4 · 30 = +9 …)'],
 agi:()=>['FLEE +1 ต่อแต้ม (หลบหลีก)','ความเร็วโจมตี: ดีเลย์ลดลง 0.6% ต่อแต้ม'],
 vit:()=>['HP สูงสุด +2% ต่อแต้ม','ทุก 2 VIT: DEF +1'],
 int:c=>[...(MAGIC.has(c)?['MATK +1.5 ต่อแต้ม','ครบทุก 7 แต้ม MATK โบนัสเพิ่ม (7 = +1 · 14 = +4 · 21 = +9 …)']:['MATK +1.5 ต่อแต้ม (สายกายภาพไม่ได้ใช้ตีมอน)']),'MP สูงสุด +2% ต่อแต้ม · ฟื้น MP เร็วขึ้น 2% ต่อแต้ม','ทุก 2 INT: MDEF +1'],
 dex:c=>[...(RANGED.has(c)?['ATK +1 ต่อแต้ม','ครบทุก 10 แต้ม ATK โบนัสเพิ่ม (10 = +1 · 20 = +4 · 30 = +9 …)']:MAGIC.has(c)?[]:['ทุก 5 DEX: ATK +1']),'HIT +1 ต่อแต้ม (ตีโดน)','ความเร็วโจมตี: ดีเลย์ลดลง 0.2% ต่อแต้ม'],
 luk:c=>['คริติคอล +0.4% ต่อแต้ม',...(MAGIC.has(c)?[]:['ทุก 3 LUK: ATK +1']),'ทุก 3 LUK: HIT +1','ทุก 5 LUK: FLEE +1','หลบหลีก +0.1% ต่อแต้ม']
};
// derived numbers worth comparing, with how to show a change
const FIELDS=[['atk','ATK'],['matk','MATK'],['maxHp','HP สูงสุด'],['maxMp','MP สูงสุด'],['def','DEF'],['mdef','MDEF'],['hit','HIT'],['fleeStat','FLEE'],
 ['crit','คริติคอล',n=>(Math.round(n*1000)/10)+'%'],['delay','ความเร็วโจมตี',(n,o)=>Math.round((100/n-100/o)*10)/10+'%']];

// who: {classId, level, reborn}; stats / gear: the player's own allocation and worn gear
export function statTip(stat,{who,stats,gear}){
 const value=stats[stat],cost=raiseCost(value),now=deriveStats({...who,stats,gear}),next=value<STAT_MAX?deriveStats({...who,stats:{...stats,[stat]:value+1},gear}):null;
 const gains=[];
 if(next)for(const [k,label,show] of FIELDS){
  const a=now[k],b=next[k];if(a==null||b==null||Math.abs(b-a)<1e-9)continue;
  if(k==='delay'){if(b<a)gains.push([label,'+'+show(b,a)]);continue;}
  if(k==='matk'&&!now.magic&&stat!=='int'||k==='atk'&&now.magic)continue;   // only the number the class hits with
  gains.push([label,'+'+(show?show(b-a):Math.round((b-a)*10)/10)]);
 }
 return {title:STAT_LABEL[stat],rules:RULES[stat](who.classId),gains,raise:value<STAT_MAX?`เพิ่ม ${STAT_LABEL[stat]} ${value} → ${value+1} ใช้ ${cost} แต้ม`:`${STAT_LABEL[stat]} สูงสุดแล้ว (${STAT_MAX})`};
}
