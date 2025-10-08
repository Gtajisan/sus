const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const User = require('../../models/User');

module.exports = {
  name: "dhb",
  aliases: ["drake", "drake-meme"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Generates the Drake Hotline Bling meme with two texts.",
  category: "Fun",
  usePrefix: true,
  usage: "{pn}dhb text1 | text2",
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

      const fullText = msg.text || msg.caption || "";
      const commandPart = msg.text.split(" ")[0];
      const args = fullText.slice(commandPart.length).trim();

      if (!args.includes('|')) {
        const errorMsg = `
╔════════════════════════════╗
║         ❌ ERROR         ║
╚════════════════════════════╝

📛 You need to provide *two* texts separated by \`|\`
⚡ Example: .dhb Writing code by hand | Using AI to write code
        `;
        await bot.sendMessage(chatId, errorMsg, {
          reply_to_message_id: messageId,
          parse_mode: "Markdown"
        });
        return;
      }

      const [text1, text2] = args.split('|').map(t => t.trim());
      if (!text1 || !text2) {
        await bot.sendMessage(chatId, "Bro... both text1 and text2 are needed. Try like `.dhb this | that`", {
          reply_to_message_id: messageId
        });
        return;
      }

      const apiUrl = `https://sus-apis.onrender.com/api/drake-hotline-bling?text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`;
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      const tempFilePath = path.join(tempDir, `${userId}_${Date.now()}.png`);

      try {
        await fs.mkdir(tempDir, { recursive: true });
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        if (response.status !== 200) throw new Error("Couldn't fetch Drake meme");

        await fs.writeFile(tempFilePath, Buffer.from(response.data));

        const caption = `Drake be like:\n\n❌ ${text1}\n✅ ${text2}`;
        await bot.sendPhoto(chatId, tempFilePath, {
          caption,
          parse_mode: "Markdown",
          reply_to_message_id: messageId
        });

        await fs.unlink(tempFilePath).catch(err => console.error("File cleanup error:", err.message));
      } catch (err) {
        console.error("Drake meme error:", err.message);
        await bot.sendMessage(chatId, `💀 Failed to generate the meme.\nReason: ${err.message}`, {
          reply_to_message_id: messageId
        });
      }
    } catch (err) {
      console.error("DHB command fail:", err.message);
      await bot.sendMessage(chatId, "Bro the command tripped. Try again later 💔", {
        reply_to_message_id: messageId
      });
    }
  }
};
