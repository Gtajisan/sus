const settings = require("../../config/settings.json");
const User = require("../../models/User");

const PAGINATION_TIMEOUT = 2 * 60 * 1000; 
const PAGE_SIZE = 10;

module.exports = {
  name: "ban",
  aliases: [],
  author: "Hridoy",
  countDown: 0,
  role: 1,
  description: "Ban, unban, or list banned users. Interactive with buttons and pagination.",
  category: "Administration",
  usePrefix: true,
  usage: "{pn}ban @username|userId <reason> | {pn}ban remove @username|userId | {pn}ban list",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();


    let isAdmin = false;
    const isOwner = settings.ownerUid === userId;
    if ((msg.chat.type === "group" || msg.chat.type === "supergroup") && !isOwner) {
      try {
        const admins = await bot.getChatAdministrators(chatId);
        isAdmin = admins.some(a => a.user && a.user.id && a.user.id.toString() === userId);
      } catch (err) {
        if (Array.isArray(settings.admins) && settings.admins.includes(userId)) {
          isAdmin = true;
        }
      }
    } else if (Array.isArray(settings.admins) && settings.admins.includes(userId)) {
      isAdmin = true;
    }
    if (!isOwner && !isAdmin) {
      return bot.sendMessage(chatId, "🚫 Only the bot owner or admins can use this command.", {
        reply_to_message_id: msg.message_id
      });
    }

    if (!args) {
      return bot.sendMessage(chatId, "Usage:\n{pn}ban @username|userId <reason>\n{pn}ban remove @username|userId\n{pn}ban list", {
        reply_to_message_id: msg.message_id
      });
    }

    const argArr = args.trim().split(/\s+/);

   
    if (argArr[0].toLowerCase() === "list") {
      let page = 0;
      if (argArr[1] && !isNaN(argArr[1])) page = Math.max(0, parseInt(argArr[1]) - 1);

     
      const showBanList = async (pageNum, sentMessageId = null) => {
        const bannedUsers = await User.find({ ban: true });
        const total = bannedUsers.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const paged = bannedUsers.slice(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE);

        if (!total) {
          if (!sentMessageId) {
            return bot.sendMessage(chatId, "✅ No users are currently banned.", { reply_to_message_id: msg.message_id });
          } else {
            await bot.editMessageText("✅ No users are currently banned.", { chat_id: chatId, message_id: sentMessageId });
            return setTimeout(() => bot.deleteMessage(chatId, sentMessageId).catch(() => {}), PAGINATION_TIMEOUT);
          }
        }

        let txt = `<b>Banned Users</b> (Page ${pageNum + 1}/${totalPages})\n\n`;
        txt += paged.map((u, i) => (
          `<b>${i + 1 + pageNum * PAGE_SIZE}.</b> ${(u.username ? `@${u.username}` : u.firstName || u.telegramId)} | <code>${u.telegramId}</code>\n<b>Reason:</b> ${u.banReason || "No reason"}`
        )).join("\n\n");

        const buttons = [];
        if (pageNum > 0) buttons.push({ text: "⬅️ Previous", callback_data: `banlist_prev_${pageNum - 1}` });
        if (pageNum < totalPages - 1) buttons.push({ text: "Next ➡️", callback_data: `banlist_next_${pageNum + 1}` });

        const keyboard = { inline_keyboard: buttons.length ? [buttons] : [] };

        if (!sentMessageId) {
          const sent = await bot.sendMessage(chatId, txt, {
            reply_to_message_id: msg.message_id,
            parse_mode: "HTML",
            reply_markup: keyboard
          });
          setTimeout(() => bot.deleteMessage(chatId, sent.message_id).catch(() => {}), PAGINATION_TIMEOUT);
          banListHandlers[sent.message_id] = { page: pageNum, chatId };
        } else {
          await bot.editMessageText(txt, {
            chat_id: chatId,
            message_id: sentMessageId,
            parse_mode: "HTML",
            reply_markup: keyboard
          });
          setTimeout(() => bot.deleteMessage(chatId, sentMessageId).catch(() => {}), PAGINATION_TIMEOUT);
          banListHandlers[sentMessageId] = { page: pageNum, chatId };
        }
      };

    
      if (!global.banListHandlers) global.banListHandlers = {};
      const banListHandlers = global.banListHandlers;

    
      if (!bot._banListCbHandler) {
        bot.on("callback_query", async cb => {
          try {
            const data = cb.data || "";
            if (!/^banlist_(prev|next)_(\d+)$/.test(data)) return;
            const [, dir, pageNum] = data.match(/^banlist_(prev|next)_(\d+)$/);
            const msgId = cb.message.message_id;
            if (!banListHandlers[msgId]) return bot.answerCallbackQuery(cb.id); 

            await showBanList(parseInt(pageNum), msgId);
            bot.answerCallbackQuery(cb.id);
          } catch (e) {}
        });
        bot._banListCbHandler = true;
      }

      return showBanList(page);
    }


    let removeBan = false;
    if (argArr[0].toLowerCase() === "remove") {
      removeBan = true;
      argArr.shift();
    }

    let targetId = null;
    let banReason = "";


    if (msg.reply_to_message) {
      targetId = msg.reply_to_message.from.id.toString();
    } else if (argArr[0] && argArr[0].startsWith("@")) {
      const username = argArr[0].replace(/^@/, "");
      const user = await User.findOne({ username: username });
      if (!user) {
        return bot.sendMessage(chatId, "❗ User not found in database.", { reply_to_message_id: msg.message_id });
      }
      targetId = user.telegramId;
    } else if (argArr[0] && /^\d+$/.test(argArr[0])) {
      targetId = argArr[0];
    } else {
      return bot.sendMessage(chatId, "❗ Invalid user. Use @username, userId, or reply.", {
        reply_to_message_id: msg.message_id
      });
    }

    banReason = argArr.slice(1).join(" ");
    if (!removeBan && !banReason) {
      return bot.sendMessage(chatId, "❗ Please provide a reason for banning.", { reply_to_message_id: msg.message_id });
    }

    let user = await User.findOne({ telegramId: targetId });
    if (!user) {
      return bot.sendMessage(chatId, "❗ User not found in database.", { reply_to_message_id: msg.message_id });
    }
    if (removeBan) {
      user.ban = undefined;
      user.banReason = undefined;
      await user.save();
      return bot.sendMessage(chatId, `✅ User <b>${user.username || user.telegramId}</b> has been unbanned.`, {
        reply_to_message_id: msg.message_id,
        parse_mode: "HTML"
      });
    } else {
      user.ban = true;
      user.banReason = banReason;
      await user.save();

   
      const unbanKeyboard = {
        inline_keyboard: [
          [
            { text: "Unban", callback_data: `ban_unban_${user.telegramId}` }
          ]
        ]
      };

     
      if (!bot._banUnbanCbHandler) {
        bot.on("callback_query", async cb => {
          try {
            const data = cb.data || "";
            if (!/^ban_unban_(\d+)$/.test(data)) return;
            const [, unbanUserId] = data.match(/^ban_unban_(\d+)$/);

            if (!isOwner && !isAdmin && cb.from.id.toString() !== userId) {
              return bot.answerCallbackQuery(cb.id, { text: "Only admins/owner can unban.", show_alert: true });
            }

            const unbanUser = await User.findOne({ telegramId: unbanUserId });
            if (!unbanUser) return bot.answerCallbackQuery(cb.id, { text: "User not found." });
            unbanUser.ban = undefined;
            unbanUser.banReason = undefined;
            await unbanUser.save();

            await bot.editMessageText(`✅ User <b>${unbanUser.username || unbanUser.telegramId}</b> has been unbanned.`, {
              chat_id: cb.message.chat.id,
              message_id: cb.message.message_id,
              parse_mode: "HTML"
            });
            bot.answerCallbackQuery(cb.id, { text: "User unbanned!" });
          } catch (e) { }
        });
        bot._banUnbanCbHandler = true;
      }

      return bot.sendMessage(chatId, `🚫 User <b>${user.username || user.telegramId}</b> has been banned.\nReason: <b>${banReason}</b>`, {
        reply_to_message_id: msg.message_id,
        parse_mode: "HTML",
        reply_markup: unbanKeyboard
      });
    }
  }
};