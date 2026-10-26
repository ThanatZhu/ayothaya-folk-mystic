// 0.118 rework icon art (docs/skills-icon-prompts.md, sheets in rework-icons-2026-10-26/): live skill id -> single
// 256x256 PNG in rework-icons-2026-10-26/icons/<class>-r<row>-c<col>.png. Matched by what each skill does, not by its
// slot. Skills with no icon of the same meaning keep their old atlas art (UNMATCHED); new-plan icons with no live
// skill yet are listed in docs/skills-icon-mapping.md.
const icon=(cls,r,c)=>'rework-icons-2026-10-26/icons/'+cls+'-r'+r+'-c'+c+'.png';
const S='swordsman',L='lancer',H='hunter',B='boxer',R='rogue',M='shaman',A='acolyte';
export const REWORK_ICONS={
 // swordsman
 break:icon(S,1,1),challenge:icon(S,1,2),guard:icon(S,1,3),cleave:icon(S,1,4),intercept:icon(S,1,5),
 bastion:icon(S,2,1),'shield-link':icon(S,2,2),'shield-edge':icon(S,2,6),'iron-call':icon(S,4,2),
 'gale-riposte':icon(S,3,1),'blade-brand':icon(S,3,2),'cross-finish':icon(S,3,4),'open-wound':icon(S,3,5),'riposte-flow':icon(S,3,6),
 // lancer
 pierce:icon(L,1,1),sweep:icon(L,1,2),brace:icon(L,1,3),'spear-zone':icon(L,1,4),step:icon(L,1,5),
 'spear-wall':icon(L,2,1),hook:icon(L,2,2),phalanx:icon(L,2,3),planted:icon(L,4,2),
 'naga-drill':icon(L,3,1),'chain-pierce':icon(L,3,2),'spear-storm':icon(L,3,4),'far-point':icon(L,4,5),'pierce-rhythm':icon(L,4,3),
 // hunter
 mark:icon(H,1,2),'vine-trap':icon(H,1,3),'arrow-rain':icon(H,1,4),'retreat-shot':icon(H,1,5),peck:icon(H,3,3),
 scatter:icon(H,2,1),ambush:icon(H,2,2),thicket:icon(H,2,3),weakpoint:icon(H,4,1),'quick-nock':icon(H,4,2),
 flock:icon(H,3,1),crow:icon(H,3,2),'mythic-rooster':icon(H,3,4),'rooster-heart':icon(H,3,5),bond:icon(H,3,6),
 // boxer
 jab:icon(B,1,1),knee:icon(B,1,3),elbow:icon(B,1,4),triangle:icon(B,1,5),hanuman:icon(B,1,6),
 'mae-mai':icon(B,2,1),'flying-knee':icon(B,2,2),'twin-fists':icon(B,2,4),breath:icon(B,4,1),rhythm:icon(B,4,2),
 'iron-body':icon(B,3,1),anchor:icon(B,3,2),'mountain-fist':icon(B,3,4),'iron-blood':icon(B,3,5),unbroken:icon(B,3,6),
 // rogue
 stealth:icon(R,1,2),backstab:icon(R,1,3),poison:icon(R,1,4),smoke:icon(R,1,5),execution:icon(R,1,6),hamstring:icon(R,3,3),
 clones:icon(R,2,1),'shadow-curtain':icon(R,2,2),'moon-dive':icon(R,2,4),'shadow-step':icon(R,2,5),'long-shadow':icon(R,4,1),
 'venom-blade':icon(R,3,1),'venom-burst':icon(R,3,2),'sunset-blade':icon(R,3,4),'deep-venom':icon(R,3,5),'last-drop':icon(R,3,6),
 // shaman
 curse:icon(M,1,2),thread:icon(M,1,3),'great-spirit':icon(M,1,4),talisman:icon(M,1,5),
 'spirit-lord':icon(M,2,1),'soul-chain':icon(M,2,2),'hundred-souls':icon(M,2,4),'soul-return':icon(M,2,5),'spirit-force':icon(M,4,1),
 'twin-seals':icon(M,3,1),'reverse-fate':icon(M,3,2),'great-yantra':icon(M,3,4),'ward-craft':icon(M,3,5),'return-force':icon(M,3,6),
 // acolyte (monk and nun share one class)
 holy:icon(A,1,1),heal:icon(A,1,2),cleanse:icon(A,1,4),revive:icon(A,1,5),sanctuary:icon(A,1,6),
 'great-lotus':icon(A,2,1),'life-tree':icon(A,2,4),'return-life':icon(A,2,5),kindness:icon(A,4,1),
 'holy-flame':icon(A,3,1),'curse-cut':icon(A,3,2),'dharma-dome':icon(A,3,3),'sacred-ground':icon(A,3,5),'light-edge':icon(A,3,6),
};
// Novice basics (skill slots 0 punch, 4 rest, 5 guard); the planned ultimate has no live slot yet.
export const NOVICE_ICONS={0:icon('novice',1,1),4:icon('novice',1,2),5:icon('novice',1,3)};
// Live skills with no new icon of the same meaning: they keep their v1 atlas art.
export const UNMATCHED=['counter','last-stand','sky-spear','long-wall','rooster','parry','spirit','curse-burst','regen','great-revive'];
export const reworkIconURL=file=>new URL('./'+file+'?v=118',import.meta.url).href;
export const REWORK_REGION={rect:[0,0,256,256],width:256,height:256};
