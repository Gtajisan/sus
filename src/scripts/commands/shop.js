const fs = require("fs").promises;
const path = require("path");
const User = require("../../models/User");

const SHOP_PATH = path.join(__dirname, "../../assets/shop.json");
const menu_banner_url = "https://i.ibb.co/BHQymWhC/standard-3.gif";
const shopSessions = {};

async function getShopData() {
  const data = await fs.readFile(SHOP_PATH, "utf8");
  return JSON.parse(data).cards;
}

function shopMenuText(items, page, maxPage, totalCards, startIdx) {
  let txt = `🛒 <b>SHOP</b> (Page ${page}/${maxPage})\n`;
  items.forEach((item, i) => {
    txt += `\n<b>#${startIdx + i + 1}. ${item.name}</b>\n💵 <b>Price:</b> $${item.price}\n`;
  });
  txt += `\nShowing <b>${startIdx + 1}-${startIdx + items.length}</b> of <b>${totalCards}</b> cards.`;
  txt += `\nSelect an item for more details.`;
  return txt;
}

module.exports = {
  name: "shop",
  aliases: [],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Browse shop items and buy cards. Use '{pn}shop top' for leaderboard.",
  category: "Economy",
  usePrefix: true,
  usage: "{pn}shop [top]",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const arg = (args || "").trim().toLowerCase();


    if (arg === "top") {

      const topUsers = await User.aggregate([
        { $addFields: { totalCards: { $sum: "$inventory.amount" } } },
        { $sort: { totalCards: -1 } },
        { $limit: 10 }
      ]);
      let text = `🏆 <b>Top 10 Card Owners</b>\n\n`;
      if (!topUsers.length) text += "No users found!";
      else {
        for (let i = 0; i < topUsers.length; i++) {
          const u = topUsers[i];
          const uname = u.username ? `@${u.username}` : (u.firstName || "User");
          text += `<b>#${i + 1}.</b> ${uname} — <b>Total Cards:</b> ${u.totalCards || 0}\n`;
        }
      }
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id
      });
    }

  
    const items = await getShopData();
    const pageSize = 5;
    const totalCards = items.length;
    const maxPage = Math.ceil(totalCards / pageSize);
    const page = 1;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    const text = shopMenuText(pageItems, page, maxPage, totalCards, start);

  
    let buttonsRow = pageItems.map((item, i) => ({
      text: `${start + i + 1}`,
      callback_data: `shop_details_${userId}_TEMPMSGID_${start + i}_${page}`
    }));

    let navRow = [];
    if (page > 1) navRow.push({ text: "⬅️ Previous", callback_data: `shop_page_${userId}_TEMPMSGID_${page - 1}` });
    if (page < maxPage) navRow.push({ text: "Next ➡️", callback_data: `shop_page_${userId}_TEMPMSGID_${page + 1}` });

    const markup = {
      inline_keyboard: [buttonsRow, ...(navRow.length ? [navRow] : [])]
    };

    const sentMsg = await bot.sendPhoto(chatId, menu_banner_url, {
      caption: text,
      parse_mode: "HTML",
      reply_markup: markup,
      reply_to_message_id: msg.message_id
    });
    const messageId = sentMsg.message_id;

    const fixedKeyboard = {
      inline_keyboard: markup.inline_keyboard.map(row =>
        row.map(btn =>
          ({ ...btn, callback_data: btn.callback_data.replace("TEMPMSGID", messageId) })
        )
      )
    };
    await bot.editMessageReplyMarkup(fixedKeyboard, { chat_id: chatId, message_id: messageId });

    const sessionKey = `${chatId}_${userId}_${messageId}`;
    shopSessions[sessionKey] = { items, page, pageSize, maxPage, totalCards };

    if (!bot._shopHandlerAdded) {
      bot.on("callback_query", async callback => {
        const data = callback.data || "";
        if (!/^shop_(details|page|buy)_(\d+)_(\d+)_(\d+)(?:_(\d+))?$/.test(data)) return;
        const [ , action, callbackUserId, msgId, idxOrPage, pageMaybe ] = data.match(/^shop_(details|page|buy)_(\d+)_(\d+)_(\d+)(?:_(\d+))?$/);
        const chatId_ = callback.message.chat.id;
        if (parseInt(callbackUserId) !== callback.from.id) {
          return bot.answerCallbackQuery(callback.id, { text: "You can't use this menu!", show_alert: true });
        }

        const sessionKey = `${chatId_}_${callbackUserId}_${msgId}`;
        let session = shopSessions[sessionKey];
        if (!session) {
          const items = await getShopData();
          session = { items, page: 1, pageSize: 5, maxPage: Math.ceil(items.length / 5), totalCards: items.length };
        }
        const { items, pageSize, totalCards } = session;

        if (action === "page") {
          const page = parseInt(idxOrPage);
          const maxPage = Math.ceil(items.length / pageSize);
          const start = (page - 1) * pageSize;
          const pageItems = items.slice(start, start + pageSize);
          const text = shopMenuText(pageItems, page, maxPage, totalCards, start);

          let buttonsRow = pageItems.map((item, i) => ({
            text: `${start + i + 1}`,
            callback_data: `shop_details_${callbackUserId}_${msgId}_${start + i}_${page}`
          }));
          let navRow = [];
          if (page > 1) navRow.push({ text: "⬅️ Previous", callback_data: `shop_page_${callbackUserId}_${msgId}_${page - 1}` });
          if (page < maxPage) navRow.push({ text: "Next ➡️", callback_data: `shop_page_${callbackUserId}_${msgId}_${page + 1}` });

          const markup = { inline_keyboard: [buttonsRow, ...(navRow.length ? [navRow] : [])] };
          await bot.editMessageMedia({
            type: "photo",
            media: menu_banner_url,
            caption: text,
            parse_mode: "HTML"
          }, {
            chat_id: chatId_,
            message_id: Number(msgId),
            reply_markup: markup
          });
          session.page = page;
          return bot.answerCallbackQuery(callback.id);
        }

        if (action === "details") {
          const itemIdx = parseInt(idxOrPage);
          const page = parseInt(pageMaybe) || 1;
          const item = items[itemIdx];

          let user = await User.findOne({ telegramId: callbackUserId });
          if (!user) {
            user = new User({
              telegramId: callbackUserId,
              wallet: 0,
              bank: 0,
              loan: 0,
              inventory: []
            });
            await user.save();
          }
          user.inventory = user.inventory || [];
          const invIndex = user.inventory.findIndex(it => it.itemId === item.name);
          const hasItem = invIndex !== -1;
          const ownedAmount = hasItem ? user.inventory[invIndex].amount : 0;

          let text = `🃏 <b>${item.name}</b>\n\n${item.description}\n\n💵 <b>Price:</b> $${item.price}\n`;
          if (hasItem) text += `\n<b>You own:</b> ${ownedAmount}`;

          let buttons = [];
          buttons.push([
            { text: `Buy ($${item.price})`, callback_data: `shop_buy_${callbackUserId}_${msgId}_${itemIdx}_${page}` }
          ]);
          buttons.push([{ text: "⬅️ Back", callback_data: `shop_page_${callbackUserId}_${msgId}_${page}` }]);

          await bot.editMessageMedia({
            type: "photo",
            media: item.image_url,
            caption: text,
            parse_mode: "HTML"
          }, {
            chat_id: chatId_,
            message_id: Number(msgId),
            reply_markup: { inline_keyboard: buttons }
          });
          return bot.answerCallbackQuery(callback.id);
        }

        if (action === "buy") {
          const itemIdx = parseInt(idxOrPage);
          const page = parseInt(pageMaybe) || 1;
          const item = items[itemIdx];

          let user = await User.findOne({ telegramId: callbackUserId });
          if (!user) {
            user = new User({
              telegramId: callbackUserId,
              wallet: 0,
              bank: 0,
              loan: 0,
              inventory: []
            });
          }
          user.inventory = user.inventory || [];
          const invIndex = user.inventory.findIndex(it => it.itemId === item.name);

          if ((user.wallet || 0) < item.price) {
            return bot.answerCallbackQuery(callback.id, { text: "Not enough balance!", show_alert: true });
          }

          user.wallet -= item.price;
          if (invIndex !== -1) {
            user.inventory[invIndex].amount += 1;
          } else {
            user.inventory.push({ itemId: item.name, amount: 1 });
          }
          await user.save();

          let text = `✅ <b>Purchased:</b> ${item.name}\n💵 <b>Price:</b> $${item.price}\n\n${item.description}\n\n<b>You now own:</b> ${invIndex !== -1 ? user.inventory[invIndex].amount : 1}`;
          await bot.editMessageMedia({
            type: "photo",
            media: item.image_url,
            caption: text,
            parse_mode: "HTML"
          }, {
            chat_id: chatId_,
            message_id: Number(msgId),
            reply_markup: {
              inline_keyboard: [
                [{ text: "⬅️ Back", callback_data: `shop_page_${callbackUserId}_${msgId}_${page}` }]
              ]
            }
          });
          return bot.answerCallbackQuery(callback.id, { text: "Item purchased!", show_alert: true });
        }
      });
      bot._shopHandlerAdded = true;
    }
  }
};