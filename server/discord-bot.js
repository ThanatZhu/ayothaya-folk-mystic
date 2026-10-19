import { Client, Events, GatewayIntentBits, ActivityType } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Discord bot online as ${c.user.tag}`);
  for (const g of c.guilds.cache.values()) console.log(`  guild: ${g.name} (${g.id})`);
  c.user.setActivity("Ayothaya Online", { type: ActivityType.Playing });
});

client.login(process.env.DISCORD_TOKEN);
