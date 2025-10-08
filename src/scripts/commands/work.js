const User = require("../../models/User");

module.exports = {
  name: "work",
  aliases: [],
  author: "Hridoy",
  countDown: 3,
  role: 0,
  description: "Work once every 24 hours to earn random coins (50-100).",
  category: "Economy",
  usePrefix: true,
  usage: "{pn}work",
  async execute(bot, msg) {
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

 
    const now = Date.now();
    const lastWork = user.lastDailyWork ? new Date(user.lastDailyWork).getTime() : 0;
    const cooldown = 24 * 60 * 60 * 1000; 

    if (now - lastWork < cooldown) {
      const remaining = cooldown - (now - lastWork);
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      const secs = Math.floor((remaining % (60 * 1000)) / 1000);
      return bot.sendMessage(chatId,
        `⏳ You need to wait ${hours}h ${mins}m ${secs}s before you can work again.`,
        { reply_to_message_id: msg.message_id }
      );
    }


    const earned = Math.floor(Math.random() * 51) + 50;
    user.wallet += earned;
    user.lastDailyWork = new Date();
    await user.save();

    bot.sendMessage(chatId,
      `💼 You worked hard and earned <b>${earned}</b> coins!\n\n` +
      `💳 <b>Wallet:</b> <code>${user.wallet}</code>`,
      { parse_mode: "HTML", reply_to_message_id: msg.message_id }
    );
  }
};