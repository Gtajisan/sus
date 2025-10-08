const User = require('../../models/User');
const Group = require('../../models/Group');
const settings = require('../../config/settings.json');

module.exports = {
  name: "setprefix",
  aliases: ["sp"],
  author: "Hridoy",
  countDown: 5,
  role: 1,
  description: "Changes the group prefix (admin only).",
  category: "Admin",
  usePrefix: true,
  usage: "{pn} <newPrefix>",
  execute: async (bot, msg, args) => {
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


      if (settings.admins.includes(userId)) {
        if (!args) {
          bot.sendMessage(chatId, `Please provide a new prefix. Usage: ${settings.botPrefix}setprefix <newPrefix>`);
          return;
        }

        let group = await Group.findOne({ groupId: chatId.toString() });
        if (!group) {
          group = new Group({ groupId: chatId.toString(), prefix: args });
        } else {
          group.prefix = args;
        }
        await group.save();

        bot.sendMessage(chatId, `Group prefix changed to: ${args}`);
        return;
      }

      const admins = await bot.getChatAdministrators(chatId);
      const isGroupAdmin = admins.some(admin => admin.user.id.toString() === userId);

      if (!isGroupAdmin) {
        bot.sendMessage(chatId, 'Only group admins or bot admins can use this command.');
        return;
      }

      if (!args) {
        bot.sendMessage(chatId, `Please provide a new prefix. Usage: ${settings.botPrefix}setprefix <newPrefix>`);
        return;
      }

      let group = await Group.findOne({ groupId: chatId.toString() });
      if (!group) {
        group = new Group({ groupId: chatId.toString(), prefix: args });
      } else {
        group.prefix = args;
      }
      await group.save();

      bot.sendMessage(chatId, `Group prefix changed to: ${args}`);
    } catch (error) {
      console.error('Setprefix command error:', error);
      bot.sendMessage(chatId, 'Something went wrong. Please try again.');
    }
  }
};