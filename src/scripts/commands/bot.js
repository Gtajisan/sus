const axios = require("axios");
const Logger = require("../../utils/logger");
const settings = require("../../config/settings.json");

module.exports = {
  name: "sus",
  aliases: [],
  author: "Hridoy",
  countDown: 1,
  role: 0,
  description: "Chat with the bot using Nexalo Bot",
  category: "Fun",
  usePrefix: false,
  usage: "{pn} <message>",
  async execute(bot, msg, args, userPrefs = {}) {
    const chatId = msg.chat.id;
    const prompt = Array.isArray(args) ? args.join(" ").trim() : (args || "").trim();

    if (!prompt) {
      return bot.sendMessage(
        chatId,
        "❌ Please provide a message for the bot.\nExample: <code>!bot hi</code>",
        { parse_mode: "HTML", reply_to_message_id: msg.message_id }
      );
    }

  
    const language = (settings.botLanguage || "en").toLowerCase();

    const payload = {
      api: "MAINPOINT",
      question: prompt,
      language: language
    };

    const logData = {
      username: msg.from.username || "Unknown",
      uid: msg.from.id,
      message: msg.text,
      type: "bot",
      chatType: msg.chat.type,
      prompt
    };

    try {
      const response = await axios.post(
        "https://sim.api.nexalo.xyz/v1/chat",
        payload,
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
      const result = response.data;

      if (result.status_code === 200 && result.status === 'OK' && result.data) {
        const { answer, response_type, image_url } = result.data;

        if (response_type === 'image' && image_url) {
          Logger.info({ ...logData, content: `Image URL: ${image_url}` });
          await bot.sendPhoto(chatId, image_url, {
            reply_to_message_id: msg.message_id,
            caption: answer || undefined
          });
        } else {
          Logger.info({ ...logData, content: answer });
          await bot.sendMessage(chatId, answer, {
            reply_to_message_id: msg.message_id
          });
        }
      } else {
        Logger.error({ ...logData, error: `API error: ${result.message || 'Unknown error'}` });
        await bot.sendMessage(
          chatId,
          `Sorry, I couldn’t get a response: ${result.message || 'Unknown error'}`,
          { parse_mode: "HTML", reply_to_message_id: msg.message_id }
        );
      }
    } catch (error) {
      let errorDetails = "";
      if (error.response) {
        errorDetails += `Status: ${error.response.status}\n`;
        errorDetails += `Response: ${JSON.stringify(error.response.data, null, 2)}\n`;
      } else if (error.request) {
        errorDetails += `No response received from the API.\n`;
      } else {
        errorDetails += `Error: ${error.message}\n`;
      }
      errorDetails += `\nPayload: ${JSON.stringify(payload, null, 2)}`;

      Logger.error({ ...logData, error: errorDetails });
      await bot.sendMessage(
        chatId,
        `Oops! Something went wrong:\n<pre>${errorDetails}</pre>`,
        { parse_mode: "HTML", reply_to_message_id: msg.message_id }
      );
    }
  }
};