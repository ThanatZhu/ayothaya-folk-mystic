import {deriveStats,normalizeStats,normalizeGear,statPoints} from '../character-stats.js';
import {normalizeEquipment} from '../equipment.js';
import {progression} from '../advancement.js';
import {activePremiumPet} from '../pet-account.js';
import {foodBuff} from '../items.js';

// Read-only projection: no session lease, inventory, mail or credentials leave this endpoint.
export function characterPreview(record,slotId,live=null){
 const character=live?.character??record.character;
 const traveler=live?.world??record.state.traveler;
 const level=progression(traveler).level,reborn=live?.rebirth??record.rebirth??0;
 const stats=normalizeStats(live?.stats??record.stats),gear=normalizeGear(live?.gear??record.gear);
 const who={classId:character.classId,level,reborn};
 const pet=activePremiumPet(live?.petCollection??record.petCollection)?.bonus??{};
 const derived=live?.derived??deriveStats({...who,stats,gear,pet,food:foodBuff(traveler)});
 return {slotId,serverId:live?.serverId??record.serverId,character,level,rebirth:reborn,
  mapId:live?.room?.map.id??record.state.mapId,equipment:normalizeEquipment(live?.equipment??record.equipment,character.classId),
  stats,gear,pet,food:foodBuff(traveler),points:Math.max(0,statPoints(stats,level,reborn)),derived,source:live?'live':'saved'};
}
