// Connecting is not offline play. Never turn a missing first snapshot into t1.
export function storyReady(game,account,mapId){
 const expected=game.networkExpected||game.online||account?.cloud;
 return !expected||!!(game.online&&game.networkStatus==='online'&&game.world.story&&(!game.world.networkMapId||!mapId||game.world.networkMapId===mapId));
}
