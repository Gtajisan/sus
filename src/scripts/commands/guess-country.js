const axios = require('axios');
const User = require('../../models/User');

module.exports = {
  name: "guess-country",
  aliases: ["country-quiz"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Guess the country based on a clue!",
  category: "Fun",
  usePrefix: true,
  usage: "{pn}",
  execute: async (bot, msg, args, client) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageId = msg.message_id;
    client = client || bot;
    const quizKey = `${chatId}_${userId}`;

    try {
   
      let user = await User.findOne({ telegramId: userId });
      if (!user) {
        user = new User({
          telegramId: userId,
          username: msg.from.username,
          firstName: msg.from.first_name,
          lastName: msg.from.last_name,
        });
      }
      await user.updateOne({ lastInteraction: new Date(), $inc: { commandCount: 1 } });
      await user.save();

    
      const res = await axios.get("https://sus-apis.onrender.com/api/guess-country");
      if (!res.data.success) throw new Error("Failed to fetch quiz");

      const { clue, options, answer } = res.data;

      const quizText = `
╔════════════════════════════╗
║      🌍 GUESS COUNTRY      ║
╚════════════════════════════╝

📜 Clue: ${clue}
📌 Reply with a number:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

⚡ You have 60 seconds!
      `;

      const sentMsg = await bot.sendMessage(chatId, quizText, { reply_to_message_id: messageId });

 
      if (!bot._activeQuizzes) bot._activeQuizzes = new Map();
      bot._activeQuizzes.set(quizKey, {
        answer: answer.name,
        flag: answer.flag_url,
        options,
        msgId: sentMsg.message_id,
        clue,
      });

  
      const onReply = async (reply) => {
        if (
          reply.chat.id === chatId &&
          reply.from.id.toString() === userId &&
          reply.reply_to_message?.message_id === sentMsg.message_id &&
          bot._activeQuizzes.has(quizKey)
        ) {
          const quiz = bot._activeQuizzes.get(quizKey);
          const choice = parseInt(reply.text.trim());

          if (isNaN(choice) || choice < 1 || choice > quiz.options.length) {
            return bot.sendMessage(chatId, `❌ Bro, reply with a number from 1 to ${quiz.options.length}.`, {
              reply_to_message_id: reply.message_id,
            });
          }

          const selected = quiz.options[choice - 1];
          if (selected === quiz.answer) {
            await bot.sendMessage(chatId, `✅ Congrats bro! You guessed: ${quiz.answer}`, {
              reply_to_message_id: reply.message_id,
            });
          } else {
            await bot.sendMessage(chatId, `❌ Wrong guess!\nYou said: ${selected}\n✅ Correct: ${quiz.answer}`, {
              reply_to_message_id: reply.message_id,
            });
          }

          await bot.sendPhoto(chatId, quiz.flag, { caption: `🏳️ Flag of ${quiz.answer}` });
          bot._activeQuizzes.delete(quizKey);
          bot.off('message', onReply);
        }
      };

      bot.on('message', onReply);

      setTimeout(async () => {
        if (bot._activeQuizzes?.has(quizKey)) {
          const quiz = bot._activeQuizzes.get(quizKey);
          await bot.editMessageText(`
⏰ TIME'S UP!

📜 Clue: ${quiz.clue}
✅ Answer: ${quiz.answer}
          `, {
            chat_id: chatId,
            message_id: quiz.msgId,
          });
          await bot.sendPhoto(chatId, quiz.flag, { caption: `🏳️ Flag of ${quiz.answer}` });
          bot._activeQuizzes.delete(quizKey);
          bot.off('message', onReply);
        }
      }, 60000);

    } catch (err) {
      console.error("Guess-country error:", err.message);
      await bot.sendMessage(chatId, `❌ Error occurred. Try again later!`, { reply_to_message_id: messageId });
    }
  },
};
