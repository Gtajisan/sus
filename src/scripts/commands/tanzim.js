const axios = require('axios');
const User = require('../../models/User');

module.exports = {
  name: "tanzim",
  aliases: [],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Get a based quote from the legend Tanzim 💥",
  category: "General",
  usePrefix: true,
  usage: "{pn}tanzim [language] (default: bn)",
  execute: async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageId = msg.message_id;

    const lang = args?.trim?.().toLowerCase() || "bn";

    try {
      let user = await User.findOne({ telegramId: userId });
      if (!user) {
        user = new User({
          telegramId: userId,
          username: msg.from.username,
          firstName: msg.from.first_name,
          lastName: msg.from.last_name,
        });
      }
      await user.updateOne({ lastInteraction: new Date(), $inc: { commandCount: 1 } });
      await user.save();

      const apiUrl = `https://sus-apis.onrender.com/api/tanzim?language=${encodeURIComponent(lang)}`;
      const res = await axios.get(apiUrl);

      if (!res.data.success || !res.data.data) throw new Error("Invalid response from API");

      const quote = res.data.data.text;
      const img = res.data.data.image;

      await bot.sendPhoto(chatId, img, {
        caption: `🧠 *Tanzim says:*\n\n${quote}`,
        parse_mode: "Markdown",
        reply_to_message_id: messageId
      });

    } catch (err) {
      console.error("Tanzim command error:", err.message);
      await bot.sendMessage(chatId, `❌ Failed to fetch Tanzim wisdom.\nReason: ${err.message}`, {
        reply_to_message_id: messageId
      });
    }
  }
};
