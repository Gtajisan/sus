const axios = require('axios');
const he = require('he'); 
const User = require('../../models/User');

module.exports = {
  name: "quiz",
  aliases: ["truefalse", "tf"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Answer a True/False quiz question! Earn coins for correct answers.",
  category: "Fun",
  usePrefix: true,
  usage: "{pn}",
  execute: async (bot, msg, args, client) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageId = msg.message_id;
    client = client || bot;
    const quizKey = `${chatId}_${userId}_quiz`;

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

      const res = await axios.get("https://sus-apis.onrender.com/api/quiz?amount=1&difficulty=hard&type=boolean");
      const question = res.data?.data?.questions?.[0];
      if (!question) throw new Error("No question found");

      const decodedQ = he.decode(question.question);
      const correctAnswer = question.correctAnswer.trim().toLowerCase();  

      const text = `
🧠 *CATEGORY:* ${question.category}
🎯 *DIFFICULTY:* ${question.difficulty.toUpperCase()}

❓ *QUESTION:* ${decodedQ}
👉 Reply with *true* or *false*
⏱️ You have 30 seconds!
      `;

      const sentMsg = await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_to_message_id: messageId
      });

      if (!bot._activeTFQuizzes) bot._activeTFQuizzes = new Map();
      bot._activeTFQuizzes.set(quizKey, {
        correctAnswer,
        msgId: sentMsg.message_id,
      });

      const onReply = async (reply) => {
        if (
          reply.chat.id === chatId &&
          reply.from.id.toString() === userId &&
          reply.reply_to_message?.message_id === sentMsg.message_id &&
          bot._activeTFQuizzes.has(quizKey)
        ) {
          const quiz = bot._activeTFQuizzes.get(quizKey);
          const guess = reply.text.trim().toLowerCase();

          if (!["true", "false"].includes(guess)) {
            return bot.sendMessage(chatId, `❌ Only reply with *true* or *false*, bro.`, {
              parse_mode: "Markdown",
              reply_to_message_id: reply.message_id
            });
          }

          const isCorrect = guess === quiz.correctAnswer;

          if (isCorrect) {
 
            const earned = Math.floor(Math.random() * 51) + 50;
            let awardUser = await User.findOne({ telegramId: userId });
            if (!awardUser) {
              awardUser = user;
            }
            awardUser.wallet = (awardUser.wallet || 0) + earned;
            await awardUser.save();

            await bot.sendMessage(chatId, 
              `✅ *Correct!* You're a brainiac bro!\n\n💰 You earned *${earned}* coins!\n\n💳 *Wallet:* \`${awardUser.wallet}\``, {
              parse_mode: "Markdown",
              reply_to_message_id: reply.message_id
            });
          } else {
            await bot.sendMessage(chatId, 
              `❌ *Wrong!* Correct answer was: *${quiz.correctAnswer}*`, {
              parse_mode: "Markdown",
              reply_to_message_id: reply.message_id
            });
          }

          bot._activeTFQuizzes.delete(quizKey);
          bot.off("message", onReply);
        }
      };

      bot.on("message", onReply);

      setTimeout(async () => {
        if (bot._activeTFQuizzes?.has(quizKey)) {
          const quiz = bot._activeTFQuizzes.get(quizKey);
          await bot.editMessageText(`
⏰ *TIME'S UP!*
Correct answer: *${quiz.correctAnswer}*`, {
            chat_id: chatId,
            message_id: quiz.msgId,
            parse_mode: "Markdown"
          });
          bot._activeTFQuizzes.delete(quizKey);
          bot.off("message", onReply);
        }
      }, 30000);

    } catch (err) {
      console.error("Quiz command error:", err.message);
      await bot.sendMessage(chatId, `❌ Error happened bro. Try again later.`, { reply_to_message_id: messageId });
    }
  }
};