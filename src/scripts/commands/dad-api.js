const axios = require('axios');
const User = require('../../models/User');

module.exports = {
  name: "dad-joke",
  aliases: ["dad", "joke", "pun"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Sends a random dad joke that'll make you groan 😅",
  category: "Fun",
  usePrefix: true,
  usage: "{pn}dad-joke",
  execute: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageId = msg.message_id;

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

      const response = await axios.get('https://sus-apis.onrender.com/api/dad-joke');
      if (!response.data.success || !response.data.data?.joke) {
        throw new Error("No joke found 😭");
      }

      const joke = response.data.data.joke;

      await bot.sendMessage(chatId, `👨‍🦳 Dad joke for ya:\n\n*${joke}*`, {
        parse_mode: "Markdown",
        reply_to_message_id: messageId
      });

    } catch (err) {
      console.error("Dad joke fail:", err.message);
      await bot.sendMessage(chatId, `💀 Couldn't get a joke.\nReason: ${err.message}`, {
        reply_to_message_id: messageId
      });
    }
  }
};
