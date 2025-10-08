const axios = require('axios');
const User = require('../../models/User');

module.exports = {
  name: "ascii",
  aliases: ["face", "ascii-face"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Sends a random ASCII face to lighten the mood 😏",
  category: "Fun",
  usePrefix: true,
  usage: "{pn}",
  execute: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageId = msg.message_id;

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

      const apiUrl = `https://sus-apis.onrender.com/api/ascii-faces?all=true`;

      const response = await axios.get(apiUrl);
      if (!response.data.success || !Array.isArray(response.data.data)) {
        throw new Error("Invalid API response");
      }

      const faces = response.data.data;
      const randomFace = faces[Math.floor(Math.random() * faces.length)];

      await bot.sendMessage(chatId, `Here ya go 😎:\n\n\`${randomFace}\``, {
        parse_mode: "Markdown",
        reply_to_message_id: messageId
      });

    } catch (err) {
      console.error('ASCII face command error:', err.message);
      const errorMessage = `
╔════════════════════════════╗
║         ❌ ERROR         ║
╚════════════════════════════╝

📛 Failed to fetch ASCII face.
📝 Reason: ${err.message}
⚡ Try again later!
      `;
      await bot.sendMessage(chatId, errorMessage, { reply_to_message_id: messageId });
    }
  }
};
