const mongoose = require('mongoose');
const User = require('../../models/User');
const settings = require('../../config/settings.json');

module.exports = {
  name: "stats",
  aliases: ["status", "info"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Displays user usage statistics.",
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

      const statsMessage = `
Your Stats:
Username: ${user.username || 'N/A'}
Commands used: ${user.commandCount}
Last interaction: ${user.lastInteraction.toLocaleString()}
Joined: ${user.createdAt.toLocaleString()}
      `;

      bot.sendMessage(chatId, statsMessage);
    } catch (error) {
      console.error('Stats command error:', error);
      bot.sendMessage(chatId, 'Something went wrong. Please try again.');
    }
  }
};