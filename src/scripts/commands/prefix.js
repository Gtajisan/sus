const User = require('../../models/User');
const Group = require('../../models/Group');
const settings = require('../../config/settings.json');

module.exports = {
  name: "prefix",
  aliases: ["Prefix", "pfx"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Displays bot name, total users, and group prefix.",
  category: "General",
  usePrefix: false,
  usage: "{pn}",
  execute: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

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

      const totalUsers = await User.countDocuments();
      const group = await Group.findOne({ groupId: chatId.toString() });
      const prefix = group ? group.prefix : settings.botPrefix;

      const message = `
Bot Name: ${settings.botName}
Total Users: ${totalUsers}
Group Prefix: ${prefix}
      `;
      bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Prefix command error:', error);
      bot.sendMessage(chatId, 'Something went wrong. Please try again.');
    }
  }
};