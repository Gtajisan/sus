const settings = require("../../config/settings.json");

module.exports = {
  name: "support",
  aliases: [],
  author: "Hridoy",
  countDown: 0,
  role: 0,
  description: "Join the official support group.",
  category: "Utility",
  usePrefix: true,
  usage: "{pn}support",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const supportGCUrl = settings.supportGC;



    const supportGCId = settings.supportGCId; 


    async function isBotAdminInGroup(bot, groupId) {
      try {
        const member = await bot.getChatMember(groupId, (await bot.getMe()).id);
        return member && (member.status === "administrator" || member.status === "creator");
      } catch {
        return false;
      }
    }


    async function isUserInGroup(bot, groupId, userId) {
      try {
        const member = await bot.getChatMember(groupId, userId);
 
        return member && member.status !== "left";
      } catch {
        return false;
      }
    }


    if (supportGCId) {

      const inGroup = await isUserInGroup(bot, supportGCId, userId);
      if (inGroup) {
        return bot.sendMessage(chatId, "✅ You are already in the support group!", { reply_to_message_id: msg.message_id });
      }


      const botIsAdmin = await isBotAdminInGroup(bot, supportGCId);

      if (botIsAdmin) {
        try {
     
          await bot.exportChatInviteLink(supportGCId); 
       
          await bot.inviteChatMember
            ? await bot.inviteChatMember(supportGCId, userId)
            : await bot.sendMessage(chatId, "🤖 Please join the support group using the button below.", {
                reply_markup: {
                  inline_keyboard: [[{ text: "Join Support Group", url: supportGCUrl }]]
                },
                reply_to_message_id: msg.message_id
              });
          await bot.sendMessage(chatId, "✅ You have been added to the support group!", { reply_to_message_id: msg.message_id });
        } catch (e) {
       
          await bot.sendMessage(chatId, "⚠️ Couldn't add you automatically. Please join using the button below.", {
            reply_markup: {
              inline_keyboard: [[{ text: "Join Support Group", url: supportGCUrl }]]
            },
            reply_to_message_id: msg.message_id
          });
        }
      } else {
    
        await bot.sendMessage(chatId, "🔗 Click the button below to join the official support group!", {
          reply_markup: {
            inline_keyboard: [[{ text: "Join Support Group", url: supportGCUrl }]]
          },
          reply_to_message_id: msg.message_id
        });
      }
    } else {
    
      await bot.sendMessage(chatId, "🔗 Click the button below to join the official support group!", {
        reply_markup: {
          inline_keyboard: [[{ text: "Join Support Group", url: supportGCUrl }]]
        },
        reply_to_message_id: msg.message_id
      });
    }
  }
};