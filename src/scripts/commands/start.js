const mongoose = require('mongoose');
const User = require('../../models/User');
const settings = require('../../config/settings.json');

module.exports = {
  name: "start",
  aliases: ["begin"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Initializes the bot and registers the user.",
  category: "General",
  usePrefix: true,
  usage: "{pn}",
  execute: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    try {
      if (!User || typeof User.findOne !== 'function') {
        throw new Error('User model is not properly defined');
      }

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

      bot.sendMessage(chatId, `Welcome ${msg.from.first_name}! I'm your advanced Telegram bot. Use ${settings.botPrefix}help to see available commands.`);
    } catch (error) {
      console.error('Start command error:', error);
      bot.sendMessage(chatId, 'Something went wrong. Please try again.');
    }
  }
};