const User = require('../../models/User');

module.exports = {
  name: "unsend",
  aliases: [],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Deletes a bot message when replied to.",
  category: "General",
  usePrefix: false,
  usage: "unsend [reply to bot message]",
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

  
      if (!msg.reply_to_message) {
        const errorMessage = `
╔════════════════════════════╗
║         ❌ ERROR         ║
╚════════════════════════════╝

📛 Please reply to a bot message.
⚡ Use "unsend" while replying!
        `;
        await bot.sendMessage(chatId, errorMessage, { reply_to_message_id: messageId });
        return;
      }

    
      const botInfo = await bot.getMe();
      if (msg.reply_to_message.from.id !== botInfo.id) {
        const errorMessage = `
╔════════════════════════════╗
║         ❌ ERROR         ║
╚════════════════════════════╝

📛 Can only delete bot messages.
⚡ Reply to a bot message!
        `;
        await bot.sendMessage(chatId, errorMessage, { reply_to_message_id: messageId });
        return;
      }

      await bot.deleteMessage(chatId, msg.reply_to_message.message_id);

  
      const confirmationMessage = `
╔════════════════════════════╗
║       ✅ SUCCESS       ║
╚════════════════════════════╝

📬 Bot message deleted!
⚡ This message will auto-delete.
      `;
      const sentMessage = await bot.sendMessage(chatId, confirmationMessage, { reply_to_message_id: messageId });
      setTimeout(async () => {
        try {
          await bot.deleteMessage(chatId, sentMessage.message_id);
        } catch (error) {
          console.error('Error deleting confirmation message:', error.message);
        }
      }, 5000);

    } catch (error) {
      console.error('Unsend command error:', error.message);
      const errorMessage = `
╔════════════════════════════╗
║         ❌ ERROR         ║
╚════════════════════════════╝

📛 Something went wrong.
⚡ Please try again!
      `;
      await bot.sendMessage(chatId, errorMessage, { reply_to_message_id: messageId });
    }
  }
};