const User = require("../../models/User");
const fs = require("fs").promises;
const path = require("path");

const SHOP_PATH = path.join(__dirname, "../../assets/shop.json");
const inventory_banner_url = "https://i.ibb.co/YT4xtHGF/standard-4.gif"; 

async function getShopData() {
  const data = await fs.readFile(SHOP_PATH, "utf8");
  return JSON.parse(data).cards;
}

function inventoryMenuText(username, items, page, maxPage) {
  let txt = `🎒 <b>${username}'s Inventory</b> (Page ${page}/${maxPage})\n`;
  if (items.length === 0) {
    txt += "\n<i>No items found.</i>";
  } else {
    items.forEach((item, i) => {
      txt += `\n<b>#${i + 1}. ${item.itemId}</b> — <b>Amount:</b> ${item.amount}`;
    });
  }
  txt += `\n\nSelect an item to view details.`;
  return txt;
}

module.exports = {
  name: "inventory",
  aliases: ["inv"],
  author: "Hridoy",
  countDown: 0,
  role: 0,
  description: "View your or another user's inventory.",
  category: "Economy",
  usePrefix: true,
  usage: "{pn}inventory [@user/reply]",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    let userId = msg.from.id;
    let username = msg.from.first_name || msg.from.username || "User";


    if (msg.reply_to_message) {
      userId = msg.reply_to_message.from.id;
      username = msg.reply_to_message.from.first_name || msg.reply_to_message.from.username || "User";
    } else if (args && args.trim().length > 0 && args.trim().match(/^@?[\w\d_]+$/)) {
    
      const arg = args.trim().replace(/^@/, "");
      const otherUser = await User.findOne({ username: arg });
      if (otherUser) {
        userId = otherUser.telegramId;
        username = otherUser.firstName || otherUser.username || "User";
      }
    }

    const user = await User.findOne({ telegramId: userId });
    const inventory = user?.inventory || [];
    if (!user || inventory.length === 0) {
      return bot.sendPhoto(chatId, inventory_banner_url, {
        caption: `🎒 <b>${username}'s Inventory</b>\n\n<i>No items found.</i>`,
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id
      });
    }

    const pageSize = 5;
    const maxPage = Math.ceil(inventory.length / pageSize);
    const page = 1;

    const showInventoryPage = async (pageNum, messageId = undefined) => {
      const start = (pageNum - 1) * pageSize;
      const pageItems = inventory.slice(start, start + pageSize);

      const text = inventoryMenuText(username, pageItems, pageNum, maxPage);


      let buttonsRow = pageItems.map((item, i) => ({
        text: `View #${start + i + 1}`,
        callback_data: `inv_view_${userId}_TEMPMSGID_${start + i}_${pageNum}`
      }));

      let navRow = [];
      if (pageNum > 1) navRow.push({ text: "⬅️ Previous", callback_data: `inv_page_${userId}_TEMPMSGID_${pageNum - 1}` });
      if (pageNum < maxPage) navRow.push({ text: "Next ➡️", callback_data: `inv_page_${userId}_TEMPMSGID_${pageNum + 1}` });

      const markup = {
        inline_keyboard: [buttonsRow, ...(navRow.length ? [navRow] : [])]
      };

      if (!messageId) {
        const sentMsg = await bot.sendPhoto(chatId, inventory_banner_url, {
          caption: text,
          parse_mode: "HTML",
          reply_markup: markup,
          reply_to_message_id: msg.message_id
        });
        messageId = sentMsg.message_id;
  
        const fixedKeyboard = {
          inline_keyboard: markup.inline_keyboard.map(row =>
            row.map(btn =>
              ({ ...btn, callback_data: btn.callback_data.replace("TEMPMSGID", messageId) })
            )
          )
        };
        await bot.editMessageReplyMarkup(fixedKeyboard, { chat_id: chatId, message_id: messageId });
      } else {

        await bot.editMessageMedia({
          type: "photo",
          media: inventory_banner_url,
          caption: text,
          parse_mode: "HTML"
        }, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [buttonsRow, ...(navRow.length ? [navRow] : [])]
          }
        });
      }
    };

    await showInventoryPage(page);

    if (!bot._inventoryHandlerAdded) {
      bot.on("callback_query", async cb => {
        const data = cb.data || "";

        if (!/^inv_(view|page)_(\d+)_(\d+)_(\d+)(?:_(\d+))?$/.test(data)) return;
        const [ , action, cbUserId, msgId, idxOrPage, pageMaybe ] = data.match(/^inv_(view|page)_(\d+)_(\d+)_(\d+)(?:_(\d+))?$/);
        const chatId_ = cb.message.chat.id;

   

        const user = await User.findOne({ telegramId: cbUserId });
        const inventory = user?.inventory || [];
        const username = user?.firstName || user?.username || "User";
        const pageSize = 5;
        const maxPage = Math.ceil(inventory.length / pageSize);

        if (action === "page") {
          const page = parseInt(idxOrPage);
          const start = (page - 1) * pageSize;
          const pageItems = inventory.slice(start, start + pageSize);
          const text = inventoryMenuText(username, pageItems, page, maxPage);

          let buttonsRow = pageItems.map((item, i) => ({
            text: `View #${start + i + 1}`,
            callback_data: `inv_view_${cbUserId}_${msgId}_${start + i}_${page}`
          }));

          let navRow = [];
          if (page > 1) navRow.push({ text: "⬅️ Previous", callback_data: `inv_page_${cbUserId}_${msgId}_${page - 1}` });
          if (page < maxPage) navRow.push({ text: "Next ➡️", callback_data: `inv_page_${cbUserId}_${msgId}_${page + 1}` });

          await bot.editMessageMedia({
            type: "photo",
            media: inventory_banner_url,
            caption: text,
            parse_mode: "HTML"
          }, {
            chat_id: chatId_,
            message_id: Number(msgId),
            reply_markup: {
              inline_keyboard: [buttonsRow, ...(navRow.length ? [navRow] : [])]
            }
          });
          return bot.answerCallbackQuery(cb.id);
        }

        if (action === "view") {
          const itemIdx = parseInt(idxOrPage);
          const page = parseInt(pageMaybe) || 1;
          const item = inventory[itemIdx];
          if (!item) return bot.answerCallbackQuery(cb.id, { text: "Item not found!", show_alert: true });

  
          const shopItems = await getShopData();
          const shopItem = shopItems.find(it => it.name === item.itemId);

          let text = `🃏 <b>${item.itemId}</b>\n\n`;
          text += shopItem?.description
            ? shopItem.description + "\n\n"
            : "<i>No description found.</i>\n\n";
          text += `💵 <b>Owned:</b> ${item.amount}`;
          if (shopItem?.price) text += `\n💲 <b>Shop Price:</b> $${shopItem.price}`;

          await bot.editMessageMedia({
            type: "photo",
            media: shopItem?.image_url || inventory_banner_url,
            caption: text,
            parse_mode: "HTML"
          }, {
            chat_id: chatId_,
            message_id: Number(msgId),
            reply_markup: {
              inline_keyboard: [
                [{ text: "⬅️ Back", callback_data: `inv_page_${cbUserId}_${msgId}_${page}` }]
              ]
            }
          });
          return bot.answerCallbackQuery(cb.id);
        }
      });
      bot._inventoryHandlerAdded = true;
    }
  }
};