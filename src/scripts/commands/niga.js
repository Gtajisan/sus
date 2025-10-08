const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const User = require('../../models/User');

module.exports = {
  name: "niga",
  aliases: [],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Applies green screen effect on user or replied user image.",
  category: "Fun",
  usePrefix: true,
  usage: "{pn} [reply to message or image]",
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

      let targetUserId = userId;
      let imageUrl = 'https://sus-apis.onrender.com/assets/images/logo.png'; // fallback

      if (msg.reply_to_message) {
        if (msg.reply_to_message.photo) {
          const fileId = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id;
          const file = await bot.getFile(fileId);
          imageUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
        } else {
          targetUserId = msg.reply_to_message.from.id.toString();
          try {
            const userProfile = await bot.getUserProfilePhotos(targetUserId, { limit: 1 });
            if (userProfile.total_count > 0) {
              const fileId = userProfile.photos[0][0].file_id;
              const file = await bot.getFile(fileId);
              imageUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
            }
          } catch (e) {
            console.error('Error fetching replied user profile photo:', e.message);
          }
        }
      } else {
        try {
          const userProfile = await bot.getUserProfilePhotos(userId, { limit: 1 });
          if (userProfile.total_count > 0) {
            const fileId = userProfile.photos[0][0].file_id;
            const file = await bot.getFile(fileId);
            imageUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
          }
        } catch (e) {
          console.error('Error fetching user profile photo:', e.message);
        }
      }

      const apiUrl = `https://sus-apis.onrender.com/api/green-screen?image=${encodeURIComponent(imageUrl)}`;
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      const tempFilePath = path.join(tempDir, `${targetUserId}_${Date.now()}.jpg`);

      try {
        await fs.mkdir(tempDir, { recursive: true });
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        if (response.status !== 200) throw new Error('Failed to generate green screen image');

        await fs.writeFile(tempFilePath, Buffer.from(response.data));

        const caption = `Here's your green screen effect! 🌳`;
        await bot.sendPhoto(chatId, tempFilePath, {
          caption,
          reply_to_message_id: messageId
        });

        await fs.unlink(tempFilePath).catch(err => console.error('Error deleting temp file:', err.message));
      } catch (err) {
        console.error('Error generating/sending green screen:', err.message);
        await bot.sendMessage(chatId, `❌ Failed to generate green screen image.\nReason: ${err.message}`, {
          reply_to_message_id: messageId
        });
      }
    } catch (err) {
      console.error('Niga command error:', err.message);
      await bot.sendMessage(chatId, `❌ Something went wrong. Please try again!`, {
        reply_to_message_id: messageId
      });
    }
  }
};
