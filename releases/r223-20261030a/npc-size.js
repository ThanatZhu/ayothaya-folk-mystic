import {WORLD_BODY_HEIGHT} from './character-size.js?v=size1';

// Native 627px quadrants in people.png, checked against the render cutoff
// (alpha >= 115). Sole is an exclusive pixel edge. Hair/buns/headwear belong
// to the crown; the merchant's luggage above his turban does not.
// Anchors center the two supporting feet, excluding staffs and carried props.
export const PEOPLE_BODY_CALIBRATION=[
 {crown:24,sole:625,anchor:402},
 {crown:55,sole:609,anchor:293.5},
 {crown:22,sole:588,anchor:354.5},
 {crown:61,sole:590,anchor:217.5}
];
const PEOPLE_CELL=627;

// Crown-to-sole pixels of the standing (column 0) pose, checked at alpha >= 128.
// Each row keeps this one scale through every gesture/walk pose. A raised bow,
// a lifted foot or a crouch must never change the character's body scale.
export const CITY_BODY_HEIGHTS={
 'citizens-market':[251,237,248,253],
 'citizens-river':[240,242,239,255],
 'masters-arms':[305,315,305,308],
 'masters-mystic':[293,306,297,294]
};

export function peoplePlacement(index,width=PEOPLE_CELL,height=PEOPLE_CELL){
 const body=PEOPLE_BODY_CALIBRATION[index];
 if(!body||!Number.isInteger(index)||!Number.isFinite(width)||!Number.isFinite(height)||!(width>0)||!(height>0))throw new Error('Unknown people size calibration');
 const bodyPixels=(body.sole-body.crown)*height/PEOPLE_CELL;
 const scale=WORLD_BODY_HEIGHT/bodyPixels;
 return {width:width*scale,height:height*scale,centerX:body.anchor/PEOPLE_CELL,centerY:1-body.sole/PEOPLE_CELL};
}

export function citizenBodyHeight(sheet,row){
 const height=CITY_BODY_HEIGHTS[sheet]?.[row];
 if(!height||!Number.isInteger(row))throw new Error('Unknown citizen size calibration');
 return height;
}
