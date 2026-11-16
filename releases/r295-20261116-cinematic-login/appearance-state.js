// Appearance choices are saved on the character, scoped by UID and server.
export const APPEARANCE_OPTIONS={
 garment:['original','shouldercloth','cloak'],
 outfit:['original','indigo','crimson','ivory'],
 hair:['original','topknot','braid'],
 hairColor:['original','black','brown','silver'],
 eyes:['original','brown','green','blue'],
 beard:['none','mustache','goatee'],
 tattoo:['none','forehead','arms']
};
export const DEFAULT_APPEARANCE=Object.fromEntries(Object.entries(APPEARANCE_OPTIONS).map(([k,v])=>[k,v[0]]));
export function validateAppearance(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('invalid-appearance');
 if(Object.keys(input).some(k=>!APPEARANCE_OPTIONS[k]))throw new Error('invalid-appearance');
 const result={...DEFAULT_APPEARANCE,...input};
 for(const [k,values] of Object.entries(APPEARANCE_OPTIONS))if(!values.includes(result[k]))throw new Error('invalid-appearance');
 return result;
}
