// Posts a markdown file to a channel as the bot.
// Run: npm run bot:post -- <channel name> <file.md> [--replace]
// --replace deletes the bot's earlier messages in that channel first (for the rules page).
import { readFileSync } from "node:fs";
import { Client, GatewayIntentBits, ChannelType } from "discord.js";

const [channelName, file, flag] = process.argv.slice(2);
if (!channelName || !file) throw new Error("usage: bot:post -- <channel name> <file.md> [--replace]");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(process.env.DISCORD_TOKEN);
const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
const texts = (await guild.channels.fetch()).filter((c) => c.type === ChannelType.GuildText);
const channel = texts.find((c) => c.name === channelName);
if (!channel) throw new Error(`no text channel named ${channelName}`);

// "#ห้อง" in the file becomes a clickable channel link; longest names first so prefixes don't win.
let body = readFileSync(file, "utf8");
for (const c of [...texts.values()].sort((a, b) => b.name.length - a.name.length))
  body = body.replaceAll(`#${c.name}`, `<#${c.id}>`);

// Discord caps a message at 2000 characters: split on blank lines.
const chunks = [];
for (const para of body.trim().split(/\n\s*\n/)) {
  const last = chunks.length - 1;
  if (last >= 0 && chunks[last].length + para.length + 2 <= 2000) chunks[last] += "\n\n" + para;
  else chunks.push(para);
}

if (flag === "--replace") {
  const mine = (await channel.messages.fetch({ limit: 100 })).filter((m) => m.author.id === client.user.id);
  for (const m of mine.values()) await m.delete();
}
for (const c of chunks) await channel.send({ content: c, allowedMentions: { parse: [] } });
console.log(`posted ${chunks.length} message(s) to #${channel.name}`);
await client.destroy();
