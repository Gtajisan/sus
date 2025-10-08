const settings = require("../../config/settings.json");
const axios = require("axios");

let botStartTime = Date.now();

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));
  let str = "";
  if (day) str += `${day}d,`;
  if (hr) str += `${hr}h,`;
  if (min) str += `${min}m,`;
  str += `${sec}s`;
  return str;
}

module.exports = {
  name: "uptime",
  aliases: [],
  author: "Hridoy",
  countDown: 0,
  role: 0,
  description: "Show bot uptime card.",
  category: "Utility",
  usePrefix: true,
  usage: "{pn}uptime",
  async execute(bot, msg) {
    const uptime = formatUptime(Date.now() - botStartTime);
    const avatarUrl = settings.avatarUrl || "";
    const botName = settings.botName || "Bot";
    const developer = settings.ownerName || "Unknown";
    const url = `https://nexalo-api.vercel.app/api/uptime-card?image=${encodeURIComponent(avatarUrl)}&botname=${encodeURIComponent(botName)}&uptime=${encodeURIComponent(uptime)}&developer=${encodeURIComponent(developer)}`;

    try {
      await bot.sendPhoto(msg.chat.id, url, {
        caption: `<b>${botName}</b> Uptime: <code>${uptime}</code>`,
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id
      });
    } catch (e) {
      await bot.sendMessage(msg.chat.id, "❌ Failed to fetch uptime card.", {
        reply_to_message_id: msg.message_id
      });
    }
  },
  setStartTime(date) {
    botStartTime = date;
  }
};