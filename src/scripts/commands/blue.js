const axios = require('axios');
const User = require('../../models/User');

module.exports = {
  name: "blue",
  aliases: [],
  author: "Hridoy",
  countDown: 3,
  role: 0,
  description: "Sends a random Blue Archive anime image for the weebs 🎯",
  category: "Anime",
  usePrefix: true,
  usage: "{pn}blue",
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

      const response = await axios.get('https://sus-apis.onrender.com/api/blue-archive-image', { responseType: 'arraybuffer' });
      if (response.status !== 200) throw new Error('Failed to fetch Blue Archive image');

      const buffer = Buffer.from(response.data);

      await bot.sendPhoto(chatId, buffer, {
        caption: "Blue Archive vibes incoming! 🔥",
        reply_to_message_id: messageId
      });
    } catch (err) {
      console.error('Blue command error:', err.message);
      await bot.sendMessage(chatId, `❌ Failed to get Blue Archive image.\nReason: ${err.message}`, {
        reply_to_message_id: messageId
      });
    }
  }
};
