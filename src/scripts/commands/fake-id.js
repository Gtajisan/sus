const axios = require('axios');
const User = require('../../models/User');

module.exports = {
  name: "fakeid",
  aliases: ["fakeidentity", "idgen"],
  author: "Hridoy",
  countDown: 3,
  role: 0,
  description: "Generates a random fake identity for fun or testing.",
  category: "Fun",
  usePrefix: true,
  usage: "{pn}fakeid",
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

      const res = await axios.get("https://sus-apis.onrender.com/api/fakeidentity");
      const data = res.data;

      if (!data.success || !data.identity) {
        throw new Error("Failed to fetch identity.");
      }

      const id = data.identity;

      const caption = `
🕵️ *Fake Identity Generated!*

👤 Name: *${id.name}*
🧠 Gender: *${id.gender}*
📧 Email: *${id.email}*
📱 Phone: *${id.phone}*
🎂 DOB: *${id.dob}*
💼 Job: *${id.job}*
🏠 Address: *${id.address}*
👨‍💻 Username: *${id.username}*
🕒 Created At: *${new Date(id.createdAt).toLocaleString()}*
      `.trim();

      await bot.sendPhoto(chatId, id.avatar, {
        caption,
        parse_mode: "Markdown",
        reply_to_message_id: messageId
      });

    } catch (err) {
      console.error("FakeID error:", err.message);
      await bot.sendMessage(chatId, `💀 Couldn't generate identity.\nReason: ${err.message}`, {
        reply_to_message_id: messageId
      });
    }
  }
};
