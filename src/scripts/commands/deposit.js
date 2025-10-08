const User = require("../../models/User");

module.exports = {
  name: "deposit",
  aliases: [],
  author: "Hridoy",
  countDown: 3,
  role: 0,
  description: "Deposit coins from your wallet to your bank.",
  category: "Economy",
  usePrefix: true,
  usage: "{pn}deposit <amount>",
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
      return bot.sendMessage(chatId, "❗ Please specify a valid amount to deposit.\nUsage: <code>deposit 100</code>", {
        reply_to_message_id: msg.message_id,
        parse_mode: "HTML"
      });
    }

    const amount = parseInt(args.trim());
    if (user.wallet < amount) {
      return bot.sendMessage(chatId, `❗ You do not have enough coins in your wallet to deposit <b>${amount}</b>.`, {
        reply_to_message_id: msg.message_id,
        parse_mode: "HTML"
      });
    }

    user.wallet -= amount;
    user.bank += amount;
    await user.save();

    return bot.sendMessage(chatId,
      `🏦 You deposited <b>${amount}</b> coins to your bank!\n\n` +
      `💳 <b>Wallet:</b> <code>${user.wallet}</code>\n🏦 <b>Bank:</b> <code>${user.bank}</code>`,
      {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id
      }
    );
  }
};