const axios = require('axios');
const User = require('../../models/User');

module.exports = {
  name: "rank",
  aliases: [],
  author: "Hridoy",
  countDown: 5,
  role: 0,
  description: "Show your rank card or check others. Use 'rank top' to see top users.",
  category: "Economy",
  usePrefix: true,
  usage: "{pn}rank [@user|reply|top]",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    let arg = args?.trim()?.toLowerCase() || "";
    let userId = msg.from.id.toString();
    const messageId = msg.message_id;

 
    if (arg.startsWith('top')) {
  
      const users = await User.find({}).sort({ xp: -1 }).limit(10);

      let text = "╭─── ✦ TOP 10 USERS ✦ ───╮\n";
      users.forEach((u, i) => {
        text += `│ #${i+1} ${u.username ? '@' + u.username : u.firstName || u.telegramId}\n`;
        text += `│   🏅 Level: ${u.level || 1}  ✨ XP: ${u.xp || 0}\n`;
      });
      text += "╰────────────────────╯\n";
  
      const allUsers = await User.find({}).sort({ xp: -1 });
      const yourRank = allUsers.findIndex(u => u.telegramId === userId) + 1;
      const yourRow = allUsers.find(u => u.telegramId === userId);
      if (yourRank > 0 && yourRow) {
        text += `\n👤 Your Rank: #${yourRank} (${yourRow.username ? '@' + yourRow.username : yourRow.firstName || userId})\n`;
        text += `Level: ${yourRow.level || 1} | XP: ${yourRow.xp || 0}`;
      }
      await bot.sendMessage(chatId, text, {
        reply_to_message_id: messageId
      });
      return;
    }

   
    let targetUser = null;
    let targetUserId = userId;

  
    if (msg.reply_to_message) {
      targetUserId = msg.reply_to_message.from.id.toString();
    }
 
    else if (arg.startsWith("@")) {
      const username = arg.replace(/^@/, "");
      targetUser = await User.findOne({ username });
      if (targetUser) targetUserId = targetUser.telegramId;
    }

    else if (/^\d+$/.test(arg)) {
      targetUserId = arg;
    }

  
    if (!targetUser) targetUser = await User.findOne({ telegramId: targetUserId });

    if (!targetUser) {
      await bot.sendMessage(chatId, "❗ User not found in database.", { reply_to_message_id: messageId });
      return;
    }

  
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

   
    const allUsers = await User.find({}).sort({ xp: -1 });
    const rank = allUsers.findIndex(u => u.telegramId === targetUser.telegramId) + 1;

   
    const apiUrl = `https://sus-apis.onrender.com/api/rank-card?avatar=${encodeURIComponent(imageUrl)}&username=${encodeURIComponent(targetUser.username || targetUser.firstName || "User")}&level=${targetUser.level || 1}&currentXP=${targetUser.currentXP || targetUser.xp || 0}&requiredXP=${targetUser.requiredXP || 100}&rank=${rank}`;

    try {
      const res = await axios.get(apiUrl, { responseType: "arraybuffer" });
      await bot.sendPhoto(chatId, res.data, {
        caption: `<b>Rank card for ${targetUser.username ? '@' + targetUser.username : targetUser.firstName || targetUserId}</b>`,
        parse_mode: "HTML",
        reply_to_message_id: messageId
      });
    } catch (err) {
      await bot.sendMessage(chatId, "❗ Failed to fetch rank card image.", { reply_to_message_id: messageId });
    }
  }
};