const axios = require("axios");

const pinterestSessions = {};

module.exports = {
  name: "pinterest",
  aliases: ["pin"],
  author: "Hridoy",
  countDown: 0,
  role: 0,
  description: "Search Pinterest images and navigate them with Next/Previous/Delete buttons.",
  category: "Utility",
  usePrefix: true,
  usage: "{pn}pinterest <query>",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const query = args ? args.trim() : "";

    if (!query) {
      return bot.sendMessage(chatId, "❗ Please provide a search term, e.g. <code>qpin cat girl</code>", {
        reply_to_message_id: msg.message_id,
        parse_mode: "HTML"
      });
    }

    
    let images = [];
    try {
      const result = await axios.get(`https://nexalo-api.vercel.app/api/pinterest?text=${encodeURIComponent(query)}`);
      if (result.data && Array.isArray(result.data.response) && result.data.response.length > 0) {
        images = result.data.response;
      }
    } catch (e) {
      return bot.sendMessage(chatId, "❌ Pinterest API error.", {
        reply_to_message_id: msg.message_id
      });
    }

    if (!images.length) {
      return bot.sendMessage(chatId, "❌ No images found for this query.", {
        reply_to_message_id: msg.message_id
      });
    }

  
    const sendImage = async (index, messageId, sessionKey) => {
      const url = images[index];
      const keyboard = {
        inline_keyboard: [[
          { text: "⬅️ Previous", callback_data: `pin_prev_${userId}_${messageId}` },
          { text: "🗑 Delete", callback_data: `pin_del_${userId}_${messageId}` },
          { text: "Next ➡️", callback_data: `pin_next_${userId}_${messageId}` }
        ]]
      };
      const caption = `<b>Pinterest Result</b>\nQuery: <code>${query}</code>\nImage ${index + 1} of ${images.length}`;
      await bot.editMessageMedia(
        { type: "photo", media: url, caption, parse_mode: "HTML" },
        { chat_id: chatId, message_id: messageId, reply_markup: keyboard }
      );

      if (sessionKey) pinterestSessions[sessionKey].index = index;
    };

  
    const url = images[0];
    const keyboard = {
      inline_keyboard: [[
        { text: "⬅️ Previous", callback_data: "wait" },
        { text: "🗑 Delete", callback_data: "wait" },
        { text: "Next ➡️", callback_data: "wait" }
      ]]
    };
    const caption = `<b>Pinterest Result</b>\nQuery: <code>${query}</code>\nImage 1 of ${images.length}`;
    const sentMsg = await bot.sendPhoto(chatId, url, {
      caption,
      parse_mode: "HTML",
      reply_markup: keyboard,
      reply_to_message_id: msg.message_id
    });
    const messageId = sentMsg.message_id;

 
    const realKeyboard = {
      inline_keyboard: [[
        { text: "⬅️ Previous", callback_data: `pin_prev_${userId}_${messageId}` },
        { text: "🗑 Delete", callback_data: `pin_del_${userId}_${messageId}` },
        { text: "Next ➡️", callback_data: `pin_next_${userId}_${messageId}` }
      ]]
    };
    await bot.editMessageReplyMarkup(realKeyboard, { chat_id: chatId, message_id: messageId });


    const sessionKey = `${chatId}_${userId}_${messageId}`;
    pinterestSessions[sessionKey] = { images, query, index: 0 };


    if (!bot._pinterestHandlerAdded) {
      bot.on("callback_query", async callback => {
        const data = callback.data || "";
        if (!/^pin_(prev|next|del)_(\d+)_(\d+)$/.test(data)) return;
        const [, action, callbackUserId, msgId] = data.match(/^pin_(prev|next|del)_(\d+)_(\d+)$/);
        const chatId_ = callback.message.chat.id;

    
        if (parseInt(callbackUserId) !== callback.from.id) {
          return bot.answerCallbackQuery(callback.id, { text: "You can't control this session!", show_alert: true });
        }

 
        const sessionKey = `${chatId_}_${callbackUserId}_${msgId}`;
        const session = pinterestSessions[sessionKey];
        if (!session) {
          return bot.answerCallbackQuery(callback.id, { text: "Session expired. Please search again.", show_alert: true });
        }
        const { images, query } = session;
        let index = session.index;

        if (action === "next") {
          index = (index + 1) % images.length;
          session.index = index;
          const url = images[index];
          const keyboard = {
            inline_keyboard: [[
              { text: "⬅️ Previous", callback_data: `pin_prev_${callbackUserId}_${msgId}` },
              { text: "🗑 Delete", callback_data: `pin_del_${callbackUserId}_${msgId}` },
              { text: "Next ➡️", callback_data: `pin_next_${callbackUserId}_${msgId}` }
            ]]
          };
          const caption = `<b>Pinterest Result</b>\nQuery: <code>${query}</code>\nImage ${index + 1} of ${images.length}`;
          await bot.editMessageMedia(
            { type: "photo", media: url, caption, parse_mode: "HTML" },
            { chat_id: chatId_, message_id: Number(msgId), reply_markup: keyboard }
          );
        } else if (action === "prev") {
          index = (index - 1 + images.length) % images.length;
          session.index = index;
          const url = images[index];
          const keyboard = {
            inline_keyboard: [[
              { text: "⬅️ Previous", callback_data: `pin_prev_${callbackUserId}_${msgId}` },
              { text: "🗑 Delete", callback_data: `pin_del_${callbackUserId}_${msgId}` },
              { text: "Next ➡️", callback_data: `pin_next_${callbackUserId}_${msgId}` }
            ]]
          };
          const caption = `<b>Pinterest Result</b>\nQuery: <code>${query}</code>\nImage ${index + 1} of ${images.length}`;
          await bot.editMessageMedia(
            { type: "photo", media: url, caption, parse_mode: "HTML" },
            { chat_id: chatId_, message_id: Number(msgId), reply_markup: keyboard }
          );
        } else if (action === "del") {
          try {
            await bot.deleteMessage(chatId_, Number(msgId));
            delete pinterestSessions[sessionKey];
          } catch {}
        }
        bot.answerCallbackQuery(callback.id);
      });
      bot._pinterestHandlerAdded = true;
    }
  }
};