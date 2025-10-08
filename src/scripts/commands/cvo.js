const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const User = require('../../models/User');

module.exports = {
  name: "cvo",
  aliases: ["cry-vs-ok", "cryingok"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Generates Crying vs Okay Emoji meme from two texts.",
  category: "Fun",
  usePrefix: true,
  usage: "{pn}cvo text1 | text2",
  execute: async (bot, msg, rawArgs) => {
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

      // Combine full message text and remove command part
      const fullText = msg.text || msg.caption || "";
      const commandPart = msg.text.split(" ")[0];
      const args = fullText.slice(commandPart.length).trim();

      if (!args.includes('|')) {
        const errorMsg = `
╔════════════════════════════╗
║         ❌ ERROR         ║
╚════════════════════════════╝

📛 You need to provide *two* texts separated by \`|\`
⚡ Example: .cvo I have 58 repos | Bro has only 3
        `;
        await bot.sendMessage(chatId, errorMsg, {
          reply_to_message_id: messageId,
          parse_mode: "Markdown"
        });
        return;
      }

      const [text1, text2] = args.split('|').map(t => t.trim());
      if (!text1 || !text2) {
        await bot.sendMessage(chatId, "Bro... both text1 and text2 are needed. Try again like `.cvo this | that`", {
          reply_to_message_id: messageId
        });
        return;
      }

      const apiUrl = `https://sus-apis.onrender.com/api/crying-vs-okay-emoji?text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`;
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      const tempFilePath = path.join(tempDir, `${userId}_${Date.now()}.png`);

      try {
        await fs.mkdir(tempDir, { recursive: true });
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        if (response.status !== 200) throw new Error("Couldn't fetch meme image");

        await fs.writeFile(tempFilePath, Buffer.from(response.data));

        const caption = `😭 vs 🙂\n\n*${text1}* vs *${text2}*`;
        await bot.sendPhoto(chatId, tempFilePath, {
          caption,
          parse_mode: "Markdown",
          reply_to_message_id: messageId
        });

        await fs.unlink(tempFilePath).catch(err => console.error("File cleanup fail:", err.message));
      } catch (err) {
        console.error('CVO meme error:', err.message);
        await bot.sendMessage(chatId, `💀 Failed to generate the meme.\nReason: ${err.message}`, {
          reply_to_message_id: messageId
        });
      }
    } catch (err) {
      console.error("CVO command fail:", err.message);
      await bot.sendMessage(chatId, "Something went wrong bro 💔. Try again.", {
        reply_to_message_id: messageId
      });
    }
  }
};
