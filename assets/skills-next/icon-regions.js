// Measured dark dividers in the original PNGs. The generated rows are not
// uniform: e.g. shaman Master art starts at y=925, not 5*1355/7 (~968).
export const ICON_LAYOUTS={
 'role-skills-v1.png':{width:1161,height:1355,y:[0,190,373,555,742,928,1122,1355],x:[
  [0,202,392,579,769,960,1161],[0,201,393,579,769,959,1161],
  [0,201,393,579,769,959,1161],[0,201,393,579,768,960,1161],
  [0,202,393,579,768,960,1161],[0,201,392,579,769,959,1161],
  [0,201,392,579,768,960,1161]]},
 'master-skills-v1.png':{width:1161,height:1355,y:[0,189,374,556,742,925,1117,1355],x:[
  [0,200,393,582,770,962,1161],[0,200,391,582,770,962,1161],
  [0,202,392,582,770,962,1161],[0,202,392,582,770,962,1161],
  [0,200,392,582,769,962,1161],[0,202,391,582,770,959,1161],
  [0,202,392,582,768,959,1161]]},
 'master-passives-v1.png':{width:948,height:1659,y:[0,230,450,671,891,1113,1350,1659],x:[
  [0,235,473,718,948],[0,235,473,717,948],[0,236,473,717,948],
  [0,236,473,717,948],[0,237,473,717,948],[0,237,473,717,948],
  [0,236,473,717,948]]}
};
export function roleIconRegion({sheet,row,col}){
 const l=ICON_LAYOUTS[sheet];if(!l||!Number.isInteger(row)||!Number.isInteger(col)||row<0||row>=7||col<0||col>=l.x[row].length-1)throw new Error('Invalid skill icon region');
 const inset=3,x=l.x[row][col]+inset,y=l.y[row]+inset;
 return {rect:[x,y,l.x[row][col+1]-inset-x,l.y[row+1]-inset-y],width:l.width,height:l.height};
}
