// 0.96 game announcements to a Discord channel through a webhook. The URL holds its own secret, so it lives only in
// the host's DISCORD_WEBHOOK_URL env var (Render dashboard); with no URL this returns null and nothing is posted.
export function discordPoster(url=process.env.DISCORD_WEBHOOK_URL){
 if(!url)return null;
 return text=>fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content:text,allowed_mentions:{parse:[]}})})
  .then(r=>{if(!r.ok)console.error('discord-webhook',r.status);}).catch(e=>console.error('discord-webhook',e.message));
}
