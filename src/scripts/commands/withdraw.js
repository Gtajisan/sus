const User = require("../../models/User");

module.exports = {
  name: "withdraw",
  aliases: ["wd"],
  author: "Hridoy",
  countDown: 3,
  role: 0,
  description: "Withdraw coins from your bank to your wallet.",
  category: "Economy",
  usePrefix: true,
  usage: "{pn}withdraw <amount>",
  async execute(bot, msg, args) {
    const userId = msg.from.id.toString();
    const chatId = msg.chat.id;

    let user = await User.findOne({ telegramId: userId });
    if (!user) {
      user = new User({
        telegramId: userId,
        username: msg.from.username,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name,
      });
      await user.save();
    }

    if (!args || isNaN(args.trim()) || parseInt(args.trim()) <= 0) {
      return bot.sendMessage(chatId, "❗ Please specify a valid amount to withdraw.\nUsage: <code>withdraw 100</code>", {
        reply_to_message_id: msg.message_id,
        parse_mode: "HTML"
      });
    }

    const amount = parseInt(args.trim());
    if (user.bank < amount) {
      return bot.sendMessage(chatId, `❗ You do not have enough coins in your bank to withdraw <b>${amount}</b>.`, {
        reply_to_message_id: msg.message_id,
        parse_mode: "HTML"
      });
    }

    user.bank -= amount;
    user.wallet += amount;
    await user.save();

    return bot.sendMessage(chatId,
      `💸 You withdrew <b>${amount}</b> coins from your bank!\n\n` +
      `💳 <b>Wallet:</b> <code>${user.wallet}</code>\n🏦 <b>Bank:</b> <code>${user.bank}</code>`,
      {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id
      }
    );
  }
};