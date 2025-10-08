module.exports = {
    name: "stalk",
    aliases: ["userinfo", "tgstalk"],
    author: "Hridoy",
    countDown: 0,
    role: 0,
    description: "Show Telegram user's info in a terminal UI style and their profile photo.",
    category: "Utility",
    usePrefix: true,
    usage: "{pn}stalk [@username|user_id|reply]",
    async execute(bot, msg, args) {
      const chatId = msg.chat.id;
      let targetUser = null;

      if (msg.reply_to_message) {
        targetUser = msg.reply_to_message.from;
      } else if (args && args.trim().length > 0) {
        const arg = args.trim();
     
        if (arg.startsWith("@")) {
          try {
            const admins = await bot.getChatAdministrators(chatId);
            targetUser = admins.map(a => a.user).find(u => "@" + (u.username || "").toLowerCase() === arg.toLowerCase());
          } catch {}
        } else if (/^\d+$/.test(arg)) {
          try {
            targetUser = await bot.getChatMember(chatId, Number(arg)).then(res => res.user);
          } catch {}
        }
      } else {
        targetUser = msg.from;
      }
  
      if (!targetUser) {
        return bot.sendMessage(chatId, "❗ Could not find the specified user.", { reply_to_message_id: msg.message_id });
      }
  
     
      let fileId = null;
      try {
        const photos = await bot.getUserProfilePhotos(targetUser.id, { limit: 1 });
        if (photos.total_count > 0 && photos.photos.length > 0) {
      
          fileId = photos.photos[0][photos.photos[0].length - 1].file_id;
        }
      } catch {}
  
  
      const userId = targetUser.id;
      const fullName = [targetUser.first_name, targetUser.last_name].filter(Boolean).join(" ");
      const username = targetUser.username ? "@" + targetUser.username : "N/A";
      const isBot = targetUser.is_bot ? "Yes" : "No";
      const lang = targetUser.language_code || "N/A";
      let bio = "N/A";
    
      try {
        const info = await bot.getChat(targetUser.id);
        if (info.bio) bio = info.bio;
      } catch {}
  
      const lines = [
        "╭──✦ [ User Information ]",
        `├‣ 🆔 User ID: ${userId}`,
        `├‣ 👤 Full Name: ${fullName}`,
        `├‣ 📱 Username: ${username}`,
        `├‣ 🤖 Is Bot: ${isBot}`,
        `├‣ 🌐 Language Code: ${lang}`,
        `├‣ 📝 Bio: ${bio}`,
        "╰──────────────"
      ];
      const terminalUI = lines.join("\n");
  
    
      if (fileId) {
        await bot.sendPhoto(chatId, fileId, {
          caption: `<pre>${terminalUI}</pre>`,
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id
        });
      } else {
        await bot.sendMessage(chatId, `<pre>${terminalUI}</pre>`, {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id
        });
      }
    }
  };