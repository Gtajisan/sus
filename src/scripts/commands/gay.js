const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const User = require('../../models/User');

module.exports = {
  name: "gay",
  aliases: [],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Applies a pride overlay to the user's profile photo, replied user's photo, or replied image.",
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
      let targetUsername = msg.from.username || msg.from.first_name || 'User';
      let isReplied = false;
      let imageUrl = 'https://sus-apis.onrender.com/assets/images/logo.png';

      if (msg.reply_to_message) {
        isReplied = true;
     
        if (msg.reply_to_message.photo) {
          const fileId = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id;
          const file = await bot.getFile(fileId);
          imageUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
          targetUsername = 'replied image';
        } else {

          targetUserId = msg.reply_to_message.from.id.toString();
          targetUsername = msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || 'User';
          try {
            const userProfile = await bot.getUserProfilePhotos(targetUserId, { limit: 1 });
            if (userProfile.total_count > 0) {
              const fileId = userProfile.photos[0][0].file_id;
              const file = await bot.getFile(fileId);
              imageUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
            }
          } catch (error) {
            console.error('Error fetching profile photo:', error.message);
          }
        }
      } else {
   
        try {
          const userProfile = await bot.getUserProfilePhotos(targetUserId, { limit: 1 });
          if (userProfile.total_count > 0) {
            const fileId = userProfile.photos[0][0].file_id;
            const file = await bot.getFile(fileId);
            imageUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
          }
        } catch (error) {
          console.error('Error fetching profile photo:', error.message);
        }
      }

  
      if (!msg.reply_to_message?.photo) {
        let targetUser = await User.findOne({ telegramId: targetUserId });
        if (!targetUser) {
          targetUser = new User({
            telegramId: targetUserId,
            username: targetUsername,
            firstName: isReplied ? msg.reply_to_message.from.first_name : msg.from.first_name,
            lastName: isReplied ? msg.reply_to_message.from.last_name : msg.from.last_name,
          });
        }
        await targetUser.updateOne({ lastInteraction: new Date(), $inc: { commandCount: 0 } });
        await targetUser.save();
      }

      const apiUrl = `https://sus-apis.onrender.com/api/pride-overlay?image=${encodeURIComponent(imageUrl)}`;
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      const tempFilePath = path.join(tempDir, `${targetUserId}_${Date.now()}.jpg`);

      try {
        await fs.mkdir(tempDir, { recursive: true });
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        if (response.status !== 200) {
          throw new Error('Failed to generate pride overlay image');
        }
        await fs.writeFile(tempFilePath, Buffer.from(response.data));

        const caption = isReplied && !msg.reply_to_message.photo ? `Look i found a gay 🤣 🌈 @${targetUsername}! ` : 
                       isReplied ? 'Look i found a gay 🤣 🌈' : 'Look i found a gay 🤣 🌈';
        await bot.sendPhoto(chatId, tempFilePath, {
          caption,
          reply_to_message_id: messageId
        });

        await fs.unlink(tempFilePath).catch(err => console.error('Error deleting temp file:', err.message));
      } catch (error) {
        console.error('Error generating/sending pride overlay:', error.message);
        const errorMessage = `
╔════════════════════════════╗
║         ❌ ERROR         ║
╚════════════════════════════╝

📛 Failed to generate pride overlay.
📝 Reason: ${error.message}
⚡ Try again later!
        `;
        await bot.sendMessage(chatId, errorMessage, { reply_to_message_id: messageId });
      }
    } catch (error) {
      console.error('Gay command error:', error.message);
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