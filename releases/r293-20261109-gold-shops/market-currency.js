// Pure helpers for gold-priced shops (the UI adds the gold-bars icon beside gold prices).
export const GOLD_ICON='assets/summon147/gold-bars.webp';
export const shopCurrency=s=>s?.currency==='gold'?'gold':'coins';
export const price=(n,currency='coins')=>(n??0).toLocaleString('th-TH')+(currency==='gold'?' ทองแท่ง':' เบี้ย');
// Filter chips for the search tab; gold only while the owner switch is on (the server hides gold rows when it is off).
export const currencyChips=goldMarket=>['all','coins',...(goldMarket?['gold']:[])];
