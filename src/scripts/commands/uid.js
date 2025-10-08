const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const User = require('../../models/User');
const settings = require('../../config/settings.json');

module.exports = {
  name: "uid",
  aliases: ["id", "userid"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Displays the user's Telegram ID and optional profile photo if mentioned.",
  category: "General",
  usePrefix: true,
  usage: "{pn} [@username or reply]",
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
      let mentioned = false;

      if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
        targetUsername = msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || 'User';
        mentioned = true;
      } else if (msg.text) {
        const match = msg.text.match(/@(\w+)/);
        if (match) {
          const username = match[1];
          const member = await bot.getChatMember(chatId, `@${username}`).catch(() => null);
          if (member) {
            targetUserId = member.user.id.toString();
            targetUsername = member.user.username || member.user.first_name || 'User';
            mentioned = true;
          }
        }
      }

      let targetUser = await User.findOne({ telegramId: targetUserId });
      if (!targetUser) {
        targetUser = new User({
          telegramId: targetUserId,
          username: targetUsername,
          firstName: msg.from.first_name,
          lastName: msg.from.last_name,
        });
      }
      await targetUser.updateOne({ lastInteraction: new Date(), $inc: { commandCount: 0 } });
      await targetUser.save();

      let response = `Telegram ID: ${targetUserId}`;
      const button = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📋 Copy UID",
                url: `https://t.me/share/url?url=${targetUserId}`
              }
            ]
          ]
        },
        reply_to_message_id: messageId
      };

      if (mentioned || targetUserId !== userId) {
        let imageUrl = 'https://sus-apis.onrender.com/assets/images/logo.png';
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


        const tempDir = path.join(__dirname, '..', '..', 'temp');
        const tempFilePath = path.join(tempDir, `${targetUserId}_${Date.now()}.jpg`);
        try {
          await fs.mkdir(tempDir, { recursive: true });
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          await fs.writeFile(tempFilePath, Buffer.from(imageResponse.data));


          response = `User: @${targetUsername}\nTelegram ID: ${targetUserId}`;
          await bot.sendPhoto(chatId, tempFilePath, {
            caption: response,
            ...button
          });

          await fs.unlink(tempFilePath).catch(err => console.error('Error deleting temp file:', err.message));
        } catch (error) {
          console.error('Error downloading/sending image:', error.message);

          await bot.sendMessage(chatId, response, button);
        }
      } else {

        await bot.sendMessage(chatId, response, button);
      }
    } catch (error) {
      console.error('UID command error:', error.message);
      await bot.sendMessage(chatId, 'Something went wrong. Please try again.', {
        reply_to_message_id: messageId
      });
    }
  }
};