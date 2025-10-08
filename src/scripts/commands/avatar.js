const axios = require('axios');
const User = require('../../models/User');
const settings = require('../../config/settings.json');
const logger = require('../../utils/logger');

module.exports = {
  name: "avatar",
  aliases: ["av", "luffy"],
  author: "Hridoy",
  countDown: 22,
  role: 0,
  description: "Generates an anime-style avatar with user-provided text.",
  category: "General",
  usePrefix: true,
  usage: "{pn} <text>",
  execute: async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const username = msg.from.username || msg.from.first_name || 'User';
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

      if (!args) {
        bot.sendMessage(chatId, `Please provide text for the avatar. Usage: ${settings.botPrefix}avatar <text>`, {
          reply_to_message_id: messageId
        });
        return;
      }

      const apiUrl = `https://sus-apis.onrender.com/api/anime-text?text=${encodeURIComponent(args)}&topText=${encodeURIComponent(username)}`;
      logger.info('API Request', { url: apiUrl });
      const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

      logger.info('API Response', { status: 'Success', contentType: response.headers['content-type'] });

      const contentType = response.headers['content-type'];
      if (!contentType.startsWith('image/')) {
        bot.sendMessage(chatId, 'Error: API did not return an image.', {
          reply_to_message_id: messageId
        });
        logger.error('Avatar command error', { error: 'API did not return an image' });
        return;
      }

      await bot.sendPhoto(chatId, Buffer.from(response.data), {
        caption: `Anime avatar for ${username}`,
        reply_to_message_id: messageId
      });
    } catch (error) {
      console.error('Avatar command error:', error.message);
      logger.error('Avatar command error', { error: error.message });
      bot.sendMessage(chatId, 'Something went wrong while generating the avatar. Please try again.', {
        reply_to_message_id: messageId
      });
    }
  }
};