const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const Logger = require("../../utils/logger");
const settings = require("../../config/settings.json");

const NEXALO_API_KEY = "MAINPOINT"; 
const TRAIN_API_URL = "https://sim.api.nexalo.xyz/v1/train";
const IMGBB_API_KEY = "62beb0e49b963c5b3ac4a312264b046a";

module.exports = {
  name: "train",
  aliases: [],
  author: "Hridoy",
  countDown: 1,
  role: 0, 
  description: "Teach the bot new Q&A or image using Nexalo AI.",
  category: "Fun",
  usePrefix: true,
  usage: "{pn}train <question> | <answer>   or reply image with {pn}train <question>",
  async execute(bot, msg, args, userPrefs = {}, config = {}) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const isReplyWithPhoto = !!(msg.reply_to_message && msg.reply_to_message.photo);


    const admins = (config.admins || settings.admins || []).map(String);
    if (!admins.includes(String(userId))) {
      return bot.sendMessage(chatId, "❌ Only admins can use this command!", { reply_to_message_id: msg.message_id });
    }


    const language = (settings.botLanguage || "en").toLowerCase();

    if (isReplyWithPhoto) {
 
      const question = (args || "").trim();
      if (!question) {
        return bot.sendMessage(chatId, "❌ Please provide a question when replying to an image.\nExample: !train What is this?", { reply_to_message_id: msg.message_id });
      }

      const replyPhoto = msg.reply_to_message.photo;
      const fileId = replyPhoto[replyPhoto.length - 1].file_id;

      try {

        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
        
 
        const imageResponse = await axios.get(fileUrl, { 
          responseType: "arraybuffer",
          timeout: 30000 
        });
        const imageBuffer = Buffer.from(imageResponse.data, "binary");

    
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('image', imageBuffer.toString('base64'));
        formData.append('key', IMGBB_API_KEY);

        const imgbbResponse = await axios.post(
          'https://api.imgbb.com/1/upload',
          formData,
          {
            headers: {
              ...formData.getHeaders(),
            },
            timeout: 30000
          }
        );

        if (!imgbbResponse.data || !imgbbResponse.data.data || !imgbbResponse.data.data.url) {
          throw new Error('Failed to upload image to imgbb');
        }

        const image_url = imgbbResponse.data.data.url;
        console.log('Image uploaded successfully:', image_url);


        const payload = {
          api: NEXALO_API_KEY,
          question: question,
          answer: question,
          sentiment: "neutral",
          language: language,
          category: "general",
          response: `This is an image about: ${question}`, 
          user_api: NEXALO_API_KEY,
          response_type: "image",
          image_url: image_url,
          type: "good"
        };

        console.log('Sending payload to Nexalo:', JSON.stringify(payload, null, 2));

        Logger.info({ username: msg.from.username, uid: msg.from.id, message: msg.text, type: "train", chatType: msg.chat.type, payload });

        const response = await axios.post(TRAIN_API_URL, payload, { 
          headers: { 
            "Content-Type": "application/json",
            "User-Agent": "TelegramBot/1.0"
          },
          timeout: 30000
        });
        
        const result = response.data;
        console.log('Nexalo response:', JSON.stringify(result, null, 2));

        if (result.status_code === 201 && result.status === "Created" && result.data) {
          Logger.info({ ...payload, content: `Trained: ${result.data.message} (ID: ${result.data.id})` });
          await bot.sendMessage(
            chatId,
            `✅ Successfully trained with image!\nQuestion: ${question}\nImage: ${image_url}\nID: ${result.data.id}\nAPI Calls: ${result.data.api_calls}`,
            { reply_to_message_id: msg.message_id }
          );
        } else {
          Logger.error({ ...payload, error: `API error: ${result.message || "Unknown error"}` });
          await bot.sendMessage(chatId, `❌ Failed to train: ${result.message || "Unknown error"}`, { reply_to_message_id: msg.message_id });
        }
      } catch (error) {
        console.error('Full error details:', error);
        
      
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
          console.error('Response headers:', error.response.headers);
        }
        
        Logger.error({ error: error.message || error, stack: error.stack });
        
        let errorMessage = "Error while training with image";
        if (error.response && error.response.data) {
          errorMessage += `: ${JSON.stringify(error.response.data)}`;
        } else {
          errorMessage += `: ${error.message}`;
        }
        
        await bot.sendMessage(chatId, `❌ ${errorMessage}`, { reply_to_message_id: msg.message_id });
      }
      return;
    }


    const text = Array.isArray(args) ? args.join(" ") : (args || "");
    const [question, answer] = text.split('|').map(part => (part || "").trim());

    if (!question || !answer) {
      return bot.sendMessage(
        chatId,
        "❌ Please provide both question and answer separated by '|'\nExample: !train How are you? | I'm great!",
        { reply_to_message_id: msg.message_id }
      );
    }

    try {
      const payload = {
        api: NEXALO_API_KEY,
        question: question,
        answer: answer,
        language: language,
        sentiment: "neutral",
        category: "general",
        response_type: "text",
        image_url: "", 
        type: "good"
      };

      Logger.info({ username: msg.from.username, uid: msg.from.id, message: msg.text, type: "train", chatType: msg.chat.type, payload });

      const response = await axios.post(TRAIN_API_URL, payload, { 
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "TelegramBot/1.0"
        },
        timeout: 30000
      });
      
      const result = response.data;

      if (result.status_code === 201 && result.status === "Created" && result.data) {
        Logger.info({ ...payload, content: `Trained: ${result.data.message} (ID: ${result.data.id})` });
        await bot.sendMessage(
          chatId,
          `✅ Successfully taught!\nQuestion: ${question}\nAnswer: ${answer}\nID: ${result.data.id}\nAPI Calls: ${result.data.api_calls}`,
          { reply_to_message_id: msg.message_id }
        );
      } else {
        Logger.error({ ...payload, error: `API error: ${result.message || "Unknown error"}` });
        await bot.sendMessage(chatId, `❌ Failed to teach: ${result.message || "Unknown error"}`, { reply_to_message_id: msg.message_id });
      }
    } catch (error) {
      Logger.error({ error: error.message || error });
      await bot.sendMessage(chatId, `❌ Error while teaching: ${error.message}`, { reply_to_message_id: msg.message_id });
    }
  }
};