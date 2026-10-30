// Status ailments (0.48), shared by the offline world and the realm server. Monsters inflict them on hit;
// ยาเขียว cures all. Seconds per ailment; stun/sleep stop moving and acting, sleep breaks when hit.
export const AILMENTS={
 poison:{name:'ติดพิษ',time:8,icon:'st-poison',text:'เสีย HP ทุกวินาที (ไม่ตาย)'},
 stun:{name:'มึนงง',time:2,icon:'st-stun',text:'ขยับและโจมตีไม่ได้'},
 sleep:{name:'หลับ',time:5,icon:'st-sleep',text:'ขยับไม่ได้จนกว่าจะโดนตี'},
 silence:{name:'ใบ้',time:6,icon:'st-silence',text:'ใช้สกิลไม่ได้'},
 blind:{name:'ตาพร่า',time:8,icon:'st-blind',text:'ความเสียหาย -30% · หลบได้น้อยลง'},
 curse:{name:'คำสาป',time:8,icon:'st-curse',text:'ความเสียหาย -25% · เดินช้าลง'},
};
export const MONSTER_AILMENT={rat:['poison',.08],hopper:['stun',.05],monkey:['blind',.08],vine:['silence',.07],lantern:['sleep',.06],
 'rat-chief':['poison',.2],'monkey-chief':['blind',.2],'mill-keeper':['curse',.2],'lantern-lord':['sleep',.15],'straw-king':['curse',.25],'marsh-rat':['poison',.12],'lotus-vine':['silence',.1],'bog-lantern':['sleep',.08],'marsh-ape':['blind',.2]};
export function rollAilment(monsterId,rand=Math.random){const a=MONSTER_AILMENT[monsterId];return a&&rand()<a[1]?a[0]:null;}
export const held=status=>!!(status?.stun||status?.sleep);
