// Ragnarok-style elements and sizes (0.44). Pure data + one multiplier, shared by the offline world and the server.
export const ELEMENT_NAME={neutral:'ไม่มีธาตุ',earth:'ดิน',fire:'ไฟ',water:'น้ำ',wind:'ลม',holy:'ศักดิ์สิทธิ์',ghost:'ผี'};
export const SIZE_NAME={small:'เล็ก',medium:'กลาง',large:'ใหญ่'};

// Per monster id (MONSTER_TYPES[].id). Unlisted / older monsters: neutral, medium.
export const MONSTER_AFFINITY={
 straw:{element:'earth',size:'medium'},rat:{element:'neutral',size:'small'},hopper:{element:'wind',size:'small'},
 monkey:{element:'earth',size:'medium'},vine:{element:'earth',size:'medium'},lantern:{element:'ghost',size:'small'},
 'rat-chief':{element:'neutral',size:'medium'},'monkey-chief':{element:'earth',size:'large'},'mill-keeper':{element:'ghost',size:'large'},'lantern-lord':{element:'ghost',size:'large'},'straw-king':{element:'fire',size:'large'},
};
export const affinityOf=id=>MONSTER_AFFINITY[id]??{element:'neutral',size:'medium'};

// Attack element → defender element multiplier (missing pairs are 1).
const TABLE={
 neutral:{ghost:.7},  // Ragnarok uses .25; softened so physical classes can still clear ghost areas
 fire:{earth:1.5,fire:.5,water:.5,ghost:1.25},
 water:{fire:1.5,water:.5,earth:.75},
 wind:{water:1.5,wind:.5,earth:.75},
 earth:{wind:1.5,earth:.5,fire:.75},
 holy:{ghost:1.75,holy:0},
 ghost:{ghost:1.5,neutral:.5},
};
export const elementMultiplier=(attack,defend)=>TABLE[attack]?.[defend]??1;

// Physical size penalties by weapon type (as in Ragnarok); magic ignores size.
export const CLASS_WEAPON={novice:'fist',swordsman:'sword',lancer:'spear',hunter:'bow',boxer:'fist',rogue:'dagger',shaman:'staff',acolyte:'mace'};
const SIZE={fist:{small:1,medium:1,large:.85},sword:{small:.85,medium:1,large:.85},spear:{small:.85,medium:.85,large:1},bow:{small:1,medium:1,large:.85},dagger:{small:1,medium:.85,large:.7},staff:{small:1,medium:1,large:1},mace:{small:.85,medium:1,large:1}};
export const sizeMultiplier=(weapon,size)=>SIZE[weapon]?.[size]??1;

// Skill element by class (basic attacks use the weapon's element, default neutral).
export const CLASS_SKILL_ELEMENT={shaman:'fire',acolyte:'holy'}; // hunters stay neutral: wind is weak vs the earth-heavy fields

export function affinityMultiplier({element='neutral',physical=true,classId='novice'},monsterId){
 const a=affinityOf(monsterId);
 return elementMultiplier(element,a.element)*(physical?sizeMultiplier(CLASS_WEAPON[classId],a.size):1);
}
