// Server-owned exclusions for staff characters identified by the owner.
// Names seed the policy; realm.rank keeps a sticky flag on the stable character
// entry so renaming/restarting cannot put an identified tester back.
const normalize=name=>String(name??'').normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase();
// Retain previously identified names as well as the owner's corrected spellings.
const STAFF_NAMES=new Set(['PowerRanger','Chok fag web web','ThanatZhu','Chok teohman','Chok techman','Chok faa web web','BetaTester'].map(normalize));
export const isRankingExcluded=(...entries)=>entries.some(v=>v?.excludedFromRankings===true||STAFF_NAMES.has(normalize(v?.name)));
