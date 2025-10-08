const axios = require('axios');
const User = require('../../models/User');
const logger = require('../../utils/logger');

module.exports = {
  name: "new_member",
  description: "Sends a welcome card when a new member joins a group.",
  execute: async (bot, msg) => {
    const chatId = msg.chat.id.toString();
    const newMembers = msg.new_chat_members;

    if (!newMembers) return;

    for (const member of newMembers) {
      const userId = member.id.toString();
      const username = member.username || member.first_name || 'User';

      try {

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


        let imageUrl = 'https://sus-apis.onrender.com/assets/images/logo.png';
        try {
          const userProfile = await bot.getUserProfilePhotos(userId, { limit: 1 });
          if (userProfile.total_count > 0) {
            const fileId = userProfile.photos[0][0].file_id;
            const file = await bot.getFile(fileId);
            imageUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
          } else {
        
            const chat = await bot.getChat(chatId);
            if (chat.photo) {
              const fileId = chat.photo.big_file_id;
              const file = await bot.getFile(fileId);
              imageUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
            }
          }
        } catch (error) {
          logger.error('Error fetching profile photo', { error: error.message });
        }

 
        const chat = await bot.getChat(chatId);
        const groupName = chat.title || 'the group';
        const memberCount = await bot.getChatMemberCount(chatId);

     
        const welcomeMessages = [
          'Glad you’re here!',
          'Welcome to the crew!',
          'Happy to have you!',
          'Join the fun now!',
          'Great to see you!'
        ];
        const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];


        const apiUrl = `https://sus-apis.onrender.com/api/welcome-card-v2?image=${encodeURIComponent(imageUrl)}&name=${encodeURIComponent(username)}&text1=Welcome to ${encodeURIComponent(groupName)}&text2=${encodeURIComponent(randomMessage)}&memberCount=${memberCount}`;

        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        if (response.status !== 200) {
          throw new Error('Failed to generate welcome card');
        }

        const mention = member.username ? `@${member.username}` : member.first_name;
        await bot.sendPhoto(chatId, Buffer.from(response.data), {
          caption: `${mention}, welcome to ${groupName}! 🎉`,
          reply_to_message_id: msg.message_id
        });

        logger.info('New member joined, welcome card sent', { chatId, event: 'new_member', userId, username, imageUrl, memberCount });
      } catch (error) {
        console.error('New member event error:', error.message);
        logger.error('New member event error', { event: 'new_member', error: error.message });
    
        await bot.sendMessage(chatId, `Welcome ${username} to the group! 🎉 Use /help to see available commands.`, {
          reply_to_message_id: msg.message_id
        });
      }
    }
  }
};