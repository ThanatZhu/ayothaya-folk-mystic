// Server-owned exclusions for the four staff characters identified by the owner.
// Names seed the policy; realm.rank keeps a sticky flag on the stable character
// entry so renaming/restarting cannot put an identified tester back.
const normalize=name=>String(name??'').normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase();
const STAFF_NAMES=new Set(['PowerRanger','Chok fag web web','ThanatZhu','Chok teohman'].map(normalize));
export const isRankingExcluded=(...entries)=>entries.some(v=>v?.excludedFromRankings===true||STAFF_NAMES.has(normalize(v?.name)));
