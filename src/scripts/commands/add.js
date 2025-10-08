module.exports = {
    name: "add",
    aliases: ["addme"],
    author: "Hridoy",
    countDown: 0,
    role: 0,
    description: "Get an invite link to add the bot to a group.",
    category: "Utility",
    usePrefix: true,
    usage: "{pn}add",
    async execute(bot, msg, args) {
      const chatId = msg.chat.id;
      const botInfo = await bot.getMe();
      const botUsername = botInfo.username
        ? `@${botInfo.username}`
        : "the bot";
  
      await bot.sendMessage(chatId,
        `🤖 Want to add ${botUsername} to your group?\n\nJust tap the button below!`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "➕ Add me to a group",
                  url: `https://t.me/${botInfo.username}?startgroup=add`
                }
              ]
            ]
          },
          reply_to_message_id: msg.message_id
        }
      );
    }
  };