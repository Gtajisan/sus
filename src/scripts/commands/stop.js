const settings = require('../../config/settings.json');

module.exports = {
  name: "stop",
  aliases: ["shutdown", "exit"],
  author: "Hridoy",
  countDown: 0,
  role: 1, 
  description: "Stops the bot (owner/admin only).",
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

    await bot.sendMessage(msg.chat.id, "🛑 Bot is shutting down...", {
      reply_to_message_id: msg.message_id,
    });

    process.exit(0); 
  },
};