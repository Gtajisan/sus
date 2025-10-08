const axios = require('axios');
const User = require('../../models/User');

module.exports = {
  name: "qr-code",
  aliases: ["qr"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Generates a cool gradient QR code from your text.",
  category: "Fun",
  usePrefix: true,
  usage: "{pn}qr-code <text>",
  execute: async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageId = msg.message_id;

    const text = args?.trim?.();

    if (!text) {
      await bot.sendMessage(chatId, `❌ You gotta provide some text for the QR code.\nUsage: ${this.usage}`, {
        reply_to_message_id: messageId,
      });
      return;
    }

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

      const apiUrl = `https://sus-apis.onrender.com/api/gradient-qr?text=${encodeURIComponent(text)}`;
      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      if (response.status !== 200) throw new Error("Failed to generate QR code");

      const buffer = Buffer.from(response.data);

      await bot.sendPhoto(chatId, buffer, {
        caption: `Here’s your 🔥 gradient QR code for:\n\n*${text}*`,
        parse_mode: "Markdown",
        reply_to_message_id: messageId,
      });
    } catch (err) {
      console.error("QR Code command error:", err.message);
      await bot.sendMessage(chatId, `❌ Failed to generate QR code.\nReason: ${err.message}`, {
        reply_to_message_id: messageId,
      });
    }
  }
};
