const fs = require('fs');
const path = require('path');
const settings = require('../../config/settings.json');

const restartTxt = path.join(__dirname, '..', '..', 'caches', 'restart.txt');

module.exports = {
  name: "restart",
  aliases: ["rst"],
  author: "Hridoy",
  countDown: 0,
  role: 1,
  description: "Restarts the bot (owner/admin only).",
  category: "System",
  usePrefix: true,
  usage: "{pn}",
  async execute(bot, msg) {
    const userId = msg.from.id.toString();
    if (
      settings.ownerUid !== userId &&
      !(Array.isArray(settings.admins) && settings.admins.includes(userId))
    ) {
      return bot.sendMessage(
        msg.chat.id,
        "🚫 Only the bot owner or admins can use this command.",
        { reply_to_message_id: msg.message_id }
      );
    }

   
    try {
      const cachesDir = path.dirname(restartTxt);
      if (!fs.existsSync(cachesDir)) fs.mkdirSync(cachesDir, { recursive: true });
      fs.writeFileSync(restartTxt, `${msg.chat.id} ${Date.now()}`);
    } catch (e) {
   
      console.error("Failed to write restart.txt:", e);
    }

    await bot.sendMessage(msg.chat.id, "🔄 Bot is restarting...", {
      reply_to_message_id: msg.message_id,
    });

    process.exit(2); 
  },

  async notifyOnRestart(bot) {
    if (fs.existsSync(restartTxt)) {
      try {
        const [chatId, oldtime] = fs.readFileSync(restartTxt, "utf-8").split(" ");
        await bot.sendMessage(
          chatId,
          `✅ | Bot restarted successfully!\n⏰ | Restart time: ${(Date.now() - oldtime) / 1000}s`
        );
      } catch (e) {
        console.error("Failed to notify restart:", e);
      }
      fs.unlinkSync(restartTxt);
    }
  },
};