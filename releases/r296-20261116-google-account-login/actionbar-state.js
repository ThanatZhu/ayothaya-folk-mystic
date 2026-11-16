// Local shortcuts only. Combat, inventory and skill ownership stay authoritative.
export const ACTION_COLUMNS=8,ACTION_MAX_ROWS=4;
export function actionEntry(value,skills,itemExists){
 if(value?.kind==='skill'&&Number.isInteger(value.index)&&skills[value.index]&&!skills[value.index].reserved&&!skills[value.index].passive)return {kind:'skill',index:value.index};
 if(value?.kind==='item'&&typeof value.id==='string'&&itemExists(value.id))return {kind:'item',id:value.id};
 return null;
}
export function defaultActionbar(skills,order,items=[]){
 const entries=[...new Set(order)].filter(i=>skills[i]&&!skills[i].reserved&&!skills[i].passive).map(index=>({kind:'skill',index}));
 for(const id of new Set(items.filter(Boolean)))entries.push({kind:'item',id});
 return {version:1,rows:Math.max(1,Math.min(ACTION_MAX_ROWS,Math.ceil(entries.length/ACTION_COLUMNS))),slots:Array.from({length:ACTION_COLUMNS*ACTION_MAX_ROWS},(_,i)=>entries[i]??null)};
}
export function normalizeActionbar(saved,fallback,skills,itemExists){
 if(saved?.version!==1||!Array.isArray(saved.slots))return structuredClone(fallback);
 return {version:1,rows:Math.max(1,Math.min(ACTION_MAX_ROWS,Math.trunc(Number(saved.rows)||1))),slots:Array.from({length:ACTION_COLUMNS*ACTION_MAX_ROWS},(_,i)=>actionEntry(saved.slots[i],skills,itemExists))};
}
// Row zero is always the bottom row. Hidden rows retain assignments when re-opened.
export function resizeActionbar(state,delta){return {...state,rows:Math.max(1,Math.min(ACTION_MAX_ROWS,state.rows+Math.sign(delta)))};}
export function actionKey(row,column){return (row===1?'Shift+':row===2?'Alt+':row===3?'Shift+Alt+':'')+(column+1);}
