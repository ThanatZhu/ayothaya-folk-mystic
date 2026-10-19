// One-shot: creates roles + channels on the Discord server. Safe to re-run — skips anything that already exists by name.
// Run: npm run bot:setup
import { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits as P } from "discord.js";

const ROLES = [
  { name: "👑 ทีมงาน", colors: { primaryColor: 0xe0b04a }, hoist: true,
    permissions: [P.ManageMessages, P.KickMembers, P.BanMembers, P.ModerateMembers, P.ManageNicknames, P.MuteMembers, P.MoveMembers] },
  { name: "🧪 ผู้ทดสอบ", colors: { primaryColor: 0x5fb3a1 }, hoist: true, permissions: [] },
  { name: "⚔️ ผู้เล่น", colors: { primaryColor: 0x8a9ad6 }, hoist: false, permissions: [] },
];

// readOnly: everyone reads, only staff posts. staffOnly: hidden from everyone but staff.
const CATEGORIES = [
  { name: "📜 ข้อมูลเซิร์ฟเวอร์", channels: [
    { name: "📖กฎของเซิร์ฟเวอร์", readOnly: true, topic: "อ่านกฎก่อนเริ่มพูดคุย" },
    { name: "📢ประกาศ", readOnly: true, topic: "ข่าวสารและกิจกรรมของ Ayothaya Online" },
    { name: "📝แพตช์โน้ต", readOnly: true, topic: "อัปเดตเวอร์ชันใหม่ของเกม" },
  ] },
  { name: "💬 พูดคุย", channels: [
    { name: "💬คุยทั่วไป", topic: "คุยเรื่องเกมหรือเรื่องทั่วไป" },
    { name: "🤝หาปาร์ตี้", topic: "หาเพื่อนลงดันเจี้ยน ล่าบอส ทำเควส" },
    { name: "💰ซื้อขายไอเทม", topic: "ประกาศซื้อ ขาย แลกเปลี่ยนไอเทม" },
    { name: "🖼️แชร์ภาพ", topic: "อวดตัวละคร ชุด และภาพในเกม" },
  ] },
  { name: "🛠️ ช่วยเหลือ", channels: [
    { name: "❓ถามตอบ", topic: "สงสัยอะไรเกี่ยวกับเกม ถามได้ที่นี่" },
    { name: "🐛แจ้งบั๊ก", topic: "แจ้งบั๊ก: บอกเวอร์ชัน อุปกรณ์ และวิธีทำให้เกิดบั๊ก" },
    { name: "💡ข้อเสนอแนะ", topic: "อยากให้เกมมีอะไรเพิ่ม เสนอได้เลย" },
  ] },
  { name: "🔊 ห้องเสียง", channels: [
    { name: "🔊 ห้องรวม", voice: true },
    { name: "⚔️ ปาร์ตี้ 1", voice: true },
    { name: "⚔️ ปาร์ตี้ 2", voice: true },
  ] },
  { name: "🔒 ทีมงาน", staffOnly: true, channels: [
    { name: "🔒คุยทีมงาน" },
    { name: "📋บันทึกระบบ", topic: "บอทรายงานเหตุการณ์ของเซิร์ฟเวอร์" },
  ] },
];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(process.env.DISCORD_TOKEN);
const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
const everyone = { id: guild.id }; // @everyone role id == guild id

const roles = await guild.roles.fetch();
const roleByName = {};
for (const r of ROLES) {
  roleByName[r.name] = roles.find((x) => x.name === r.name)
    ?? (console.log(`+ ยศ ${r.name}`), await guild.roles.create(r));
}
const staff = roleByName["👑 ทีมงาน"];

const existing = await guild.channels.fetch();
const find = (name, type, parentId = null) =>
  existing.find((c) => c.name === name && c.type === type && (parentId === null || c.parentId === parentId));

for (const cat of CATEGORIES) {
  const catOverwrites = cat.staffOnly
    ? [{ id: everyone.id, deny: [P.ViewChannel] }, { id: staff.id, allow: [P.ViewChannel] }]
    : [];
  const category = find(cat.name, ChannelType.GuildCategory)
    ?? (console.log(`+ หมวด ${cat.name}`),
        await guild.channels.create({ name: cat.name, type: ChannelType.GuildCategory, permissionOverwrites: catOverwrites }));

  for (const ch of cat.channels) {
    const type = ch.voice ? ChannelType.GuildVoice : ChannelType.GuildText;
    // Discord lowercases text channel names and turns spaces into dashes; match on what it stores.
    const stored = ch.voice ? ch.name : ch.name.toLowerCase().replace(/\s+/g, "-");
    if (find(stored, type, category.id)) continue;
    const overwrites = ch.readOnly
      ? [{ id: everyone.id, deny: [P.SendMessages, P.CreatePublicThreads] }, { id: staff.id, allow: [P.SendMessages] }]
      : catOverwrites;
    console.log(`  + ห้อง ${ch.name}`);
    await guild.channels.create({ name: ch.name, type, topic: ch.topic, parent: category.id, permissionOverwrites: overwrites });
  }
}

console.log("เสร็จแล้ว");
await client.destroy();
