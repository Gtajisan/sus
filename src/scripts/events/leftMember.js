const axios = require('axios');
const User = require('../../models/User');
const logger = require('../../utils/logger');

module.exports = {
  name: "left_member",
  description: "Sends a farewell card when a member leaves a group.",
  execute: async (bot, msg) => {
    const chatId = msg.chat.id.toString();
    const member = msg.left_chat_member;

    if (!member) return;

    const userId = member.id.toString();
    const username = member.username || member.first_name || 'User';

    try {
      // Update user details
      let user = await User.findOne({ telegramId: userId });
      if (!user) {
        user = new User({
          telegramId: userId,
          username: member.username,
          firstName: member.first_name,
          lastName: member.last_name,
        });
      }
      await user.updateOne({ lastInteraction: new Date(), $inc: { commandCount: 0 } });
      await user.save();

      // Get user profile photo
      let imageUrl = 'https://sus-apis.onrender.com/assets/images/logo.png';
      try {
        const userProfile = await bot.getUserProfilePhotos(userId, { limit: 1 });
        if (userProfile.total_count > 0) {
          const fileId = userProfile.photos[0][0].file_id;
          const file = await bot.getFile(fileId);
          imageUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
        }
      } catch (error) {
        logger.error('Error fetching profile photo', { error: error.message });
      }

      // Get group name
      const chat = await bot.getChat(chatId);
      const groupName = chat.title || 'the group';

      // Fixed farewell message (4 words)
      const farewellMessage = 'Sorry to see you go!';

      // Construct API URL
      const apiUrl = `https://sus-apis.onrender.com/api/welcome-v2?userName=${encodeURIComponent(username)}&text1=Goodbye from ${encodeURIComponent(groupName)}&text2=${encodeURIComponent(farewellMessage)}&userImage=${encodeURIComponent(imageUrl)}`;

      // Fetch farewell card
      const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
      if (response.status !== 200) {
        throw new Error('Failed to generate farewell card');
      }

      // Send image to chat with mention
      const mention = member.username ? `@${member.username}` : member.first_name;
      await bot.sendPhoto(chatId, Buffer.from(response.data), {
        caption: `${mention}, farewell from ${groupName}! 😢`,
        reply_to_message_id: msg.message_id
      });

      logger.info('Member left, farewell card sent', { chatId, event: 'left_member', userId, username, imageUrl });
    } catch (error) {
      console.error('Left member event error:', error.message);
      logger.error('Left member event error', { event: 'left_member', error: error.message });
      // Fallback to text message
      await bot.sendMessage(chatId, `Goodbye ${username}, we'll miss you! 😢`, {
        reply_to_message_id: msg.message_id
      });
    }
  }
};