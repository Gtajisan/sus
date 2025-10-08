const User = require("../../models/User");

const MAX_LOAN_AMOUNT = 10000; 

module.exports = {
  name: "bank",
  aliases: [],
  author: "Hridoy",
  countDown: 1,
  role: 0,
  description: "Bank commands: loan, clear, due, top.",
  category: "Economy",
  usePrefix: true,
  usage: "{pn}bank <loan|clear|due|top> [amount]",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userMention = msg.from.username ? `@${msg.from.username}` : (msg.from.first_name || "User");

    const [subCmdRaw, ...restArgs] = (args || "").trim().split(/\s+/);
    const subCmd = (subCmdRaw || "").toLowerCase();


    let user = await User.findOne({ telegramId: userId });
    if (!user) {
      user = new User({
        telegramId: userId,
        wallet: 0,
        bank: 0,
        loan: 0,
        username: msg.from.username,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name,
      });
      await user.save();
    }

  
    if (subCmd === "loan") {
      const amountArg = restArgs[0];
      const amount = parseFloat(amountArg);

      if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, "❌ Please enter a valid amount to loan.\nExample: <code>!bank loan 1000</code>", {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id
        });
      }
      if (amount > MAX_LOAN_AMOUNT) {
        return bot.sendMessage(chatId, `❌ You can only get a loan up to <b>$${MAX_LOAN_AMOUNT}</b> at once.`, {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id
        });
      }
      if (user.loan > 0) {
        return bot.sendMessage(chatId, `❌ You already have an active loan of <b>$${user.loan}</b>.\nPlease clear it before taking a new one.`, {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id
        });
      }

      user.loan = amount;
      user.wallet += amount; // Give loan as cash
      await user.save();
      return bot.sendMessage(chatId, `✅ <b>Loan approved!</b>\nYou received <b>$${amount}</b> in your wallet.\nRemember to clear your loan!`, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id
      });
    }


    if (subCmd === "clear") {
      if (user.loan <= 0) {
        return bot.sendMessage(chatId, "❌ You have no active loan to clear.", {
          reply_to_message_id: msg.message_id
        });
      }
      if (user.wallet < user.loan) {
        return bot.sendMessage(chatId, `❌ You need <b>$${user.loan}</b> in your wallet to clear your loan.\nCurrent wallet: <b>$${user.wallet}</b>`, {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id
        });
      }
      user.wallet -= user.loan;
      const clearedAmount = user.loan;
      user.loan = 0;
      await user.save();
      return bot.sendMessage(chatId, `✅ <b>Loan Cleared!</b>\nYou paid back <b>$${clearedAmount}</b> from your wallet.`, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id
      });
    }

    if (subCmd === "due") {
      if (user.loan > 0) {
        return bot.sendMessage(
          chatId,
          `💳 <b>Loan Due:</b> <code>$${user.loan}</code>\nYou must clear your loan before applying for a new one.`,
          { parse_mode: "HTML", reply_to_message_id: msg.message_id }
        );
      } else {
        return bot.sendMessage(
          chatId,
          "✅ You have no outstanding loan. You can apply for a loan using <code>!bank loan amount</code>.",
          { parse_mode: "HTML", reply_to_message_id: msg.message_id }
        );
      }
    }


    if (subCmd === "top") {
 
      const topUsers = await User.find().sort({ bank: -1 }).limit(10);
      if (!topUsers.length) {
        return bot.sendMessage(chatId, "No users found!", { reply_to_message_id: msg.message_id });
      }
      let text = `🏦 <b>Bank Top 10</b>\n\n`;
      for (let i = 0; i < topUsers.length; i++) {
        const u = topUsers[i];
        const uname = u.username ? `@${u.username}` : (u.firstName || "User");
        text += `<b>#${i + 1}.</b> ${uname} — <b>Bank:</b> $${u.bank}\n`;
      }
      return bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id
      });
    }


    if (!subCmd) {
      return bot.sendMessage(chatId,
        `🏦 <b>Bank Commands</b>\n\n` +
        `<b>Loan:</b> <code>!bank loan amount</code>\n` +
        `&nbsp;&nbsp;Get a loan from the bank (max $${MAX_LOAN_AMOUNT}, only one loan at a time).\n\n` +
        `<b>Due:</b> <code>!bank due</code>\n` +
        `&nbsp;&nbsp;Check your current outstanding loan/due amount.\n\n` +
        `<b>Clear:</b> <code>!bank clear</code>\n` +
        `&nbsp;&nbsp;Repay your current loan using wallet balance.\n\n` +
        `<b>Top:</b> <code>!bank top</code>\n` +
        `&nbsp;&nbsp;View the top 10 richest bank users.\n`,
        { parse_mode: "HTML", reply_to_message_id: msg.message_id }
      );
    }


    return bot.sendMessage(chatId,
      "❌ Unknown bank command. Use <code>!bank</code> to see available commands.",
      { parse_mode: "HTML", reply_to_message_id: msg.message_id }
    );
  }
};