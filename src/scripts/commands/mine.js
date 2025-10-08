const User = require("../../models/User");

module.exports = {
  name: "mine",
  aliases: [],
  author: "Hridoy",
  countDown: 5,
  role: 0,
  description: "Mine for treasure! Press the button and see if you get lucky.",
  category: "Game",
  usePrefix: true,
  usage: "{pn}mine",
  async execute(bot, msg) {
    const userId = msg.from.id.toString();

   
    await bot.sendMessage(msg.chat.id, "⛏️ <b>Mining Game</b>\nPress the button to mine for treasure!", {
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⛏️ Mine!", callback_data: `minegame_${userId}_${Date.now()}` }
          ]
        ]
      }
    });
  },

 
  async onCallbackQuery(bot, query) {
    if (!query.data.startsWith("minegame_")) return;

    const [_, userId, ts] = query.data.split("_");
    const callbackUserId = query.from.id.toString();

 
    if (callbackUserId !== userId) {
      return bot.answerCallbackQuery(query.id, { text: "This isn’t your mining game!", show_alert: true });
    }

    const user = await User.findOne({ telegramId: callbackUserId });
    if (!user) {
      return bot.answerCallbackQuery(query.id, { text: "User not found.", show_alert: true });
    }

  
    const roll = Math.random();
    let resultMsg, earned = 0;

    if (roll < 0.5) {
      resultMsg = "🪨 You found rocks... try again next time!";
    } else if (roll < 0.8) {
      earned = Math.floor(Math.random() * 31) + 20; 
      user.wallet += earned;
      await user.save();
      resultMsg = `💎 You mined <b>${earned}</b> coins!`;
    } else if (roll < 0.95) {
      earned = Math.floor(Math.random() * 51) + 50; 
      user.wallet += earned;
      await user.save();
      resultMsg = `🪙 Lucky! You hit a motherlode: <b>${earned}</b> coins!`;
    } else {
      resultMsg = "💥 Oh no! Your pickaxe broke. Better luck next time!";
    }

    await bot.editMessageText(
      `<b>⛏️ Mining Result</b>\n${resultMsg}`,
      {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: "HTML"
      }
    );
    await bot.answerCallbackQuery(query.id, { text: "Mining complete!" });
  }
};