// 0.100.6 back-office "บันทึกเข้าเกม" in production: commit balance-data.js to the game repository through the GitHub
// contents API. The push redeploys Vercel (game) and Render (server), so the new numbers reach everyone in a few minutes.
// Needs GITHUB_TOKEN on Render: a fine-grained token with Contents read/write on this one repository only.
export const BALANCE_PATH='balance-data.js';
export const balanceText=clean=>'// Balance overrides written by the admin dashboard (admin.html). Empty = the numbers in the code.\nexport default '+JSON.stringify(clean,null,1)+';\n';

export async function commitBalance(text,{token=process.env.GITHUB_TOKEN,repo=process.env.GITHUB_REPO||'ThanatZhu/ayothaya-folk-mystic',branch='main',fetch=globalThis.fetch}={}){
 if(!token)throw new Error('github-unset');
 const url=`https://api.github.com/repos/${repo}/contents/${BALANCE_PATH}`,headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','User-Agent':'ayothaya-admin','Content-Type':'application/json'};
 const current=await fetch(url+'?ref='+branch,{headers});if(!current.ok)throw new Error('github-failed');
 const {sha,content}=await current.json();
 if(Buffer.from(content??'','base64').toString('utf8')===text)return {unchanged:true};
 const put=await fetch(url,{method:'PUT',headers,body:JSON.stringify({message:'Balance update from the back office',content:Buffer.from(text).toString('base64'),sha,branch})});
 if(!put.ok)throw new Error(put.status===409?'github-conflict':'github-failed');
 return {commit:(await put.json()).commit?.sha?.slice(0,7)??null};
}
