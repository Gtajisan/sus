const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const User = require('../../models/User');

module.exports = {
  name: "chill-guy",
  aliases: [],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Generates a chill guy image with the provided text.",
  category: "Fun",
  usePrefix: true,
  usage: "{pn} <text>",
  execute: async (bot, msg, args) => {
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

    
      if (!args) {
        const errorMessage = `
╔════════════════════════════╗
║         ❌ ERROR         ║
╚════════════════════════════╝

📛 Text is required.
⚡ Usage: =chill-guy <text>
        `;
        await bot.sendMessage(chatId, errorMessage, { reply_to_message_id: messageId });
        return;
      }

      const text = args.trim();
      const apiUrl = `https://sus-apis.onrender.com/api/chill-guy?text=${encodeURIComponent(text)}`;
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      const tempFilePath = path.join(tempDir, `${userId}_${Date.now()}.png`);

      try {
        await fs.mkdir(tempDir, { recursive: true });
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        if (response.status !== 200) {
          throw new Error('Failed to generate chill guy image');
        }
        await fs.writeFile(tempFilePath, Buffer.from(response.data));

 
        const caption = `Chill guy says: ${text} 😎`;
        await bot.sendPhoto(chatId, tempFilePath, {
          caption,
          reply_to_message_id: messageId
        });

        await fs.unlink(tempFilePath).catch(err => console.error('Error deleting temp file:', err.message));
      } catch (error) {
        console.error('Error generating/sending chill guy image:', error.message);
        const errorMessage = `
╔════════════════════════════╗
║         ❌ ERROR         ║
╚════════════════════════════╝

📛 Failed to generate chill guy image.
📝 Reason: ${error.message}
⚡ Try again later!
        `;
        await bot.sendMessage(chatId, errorMessage, { reply_to_message_id: messageId });
      }
    } catch (error) {
      console.error('Chill-guy command error:', error.message);
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