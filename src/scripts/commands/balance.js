const User = require("../../models/User");

module.exports = {
  name: "balance",
  aliases: ["bal"],
  author: "Hridoy",
  countDown: 5,
  role: 0,
  description: "Show your wallet, bank, and total balance. Use on reply or with @username/userId to check others.",
  category: "Economy",
  usePrefix: true,
  usage: "{pn}balance [@username|userId] or reply to a user's message",

  async execute(bot, msg, args) {
    let targetId = null;
    let targetUser = null;

 
    if (msg.reply_to_message) {
      targetId = msg.reply_to_message.from.id.toString();
    }
 
    else if (args) {
      args = args.trim();
      if (args.startsWith("@")) {
        const username = args.replace(/^@/, "");
        targetUser = await User.findOne({ username });
        if (!targetUser) {
          return bot.sendMessage(msg.chat.id, "❗ User not found in database.", { reply_to_message_id: msg.message_id });
        }
        targetId = targetUser.telegramId;
      } else if (/^\d+$/.test(args)) {
        targetId = args;
      }
    }
 
    if (!targetId) targetId = msg.from.id.toString();

    if (!targetUser) {
      targetUser = await User.findOne({ telegramId: targetId });
    }
    if (!targetUser) {
      return bot.sendMessage(msg.chat.id, "❗ User data not found.", { reply_to_message_id: msg.message_id });
    }

    const name =
      targetUser.username
        ? `@${targetUser.username}`
        : targetUser.firstName
        ? targetUser.firstName
        : targetUser.telegramId;

    const wallet = targetUser.wallet || 0;
    const bank = targetUser.bank || 0;
    const total = wallet + bank;

    const text = `
<b>💳 Balance for ${name}</b>
━━━━━━━━━━━━━━
<b>Wallet:</b> <code>${wallet.toLocaleString()}</code>
<b>Bank:</b> <code>${bank.toLocaleString()}</code>
<b>Total:</b> <code>${total.toLocaleString()}</code>
━━━━━━━━━━━━━━
`.trim();

    await bot.sendMessage(msg.chat.id, text, {
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id,
    });
  },
};