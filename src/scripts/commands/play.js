const axios = require('axios');
const User = require('../../models/User');

const YTSEARCH_API_URL = 'https://nexalo-api.vercel.app/api/ytsearch';
const YTDL_API_URL_PRIMARY = 'https://sus-apis.onrender.com/api/ytdlv3';
const YTDL_API_URL_FALLBACK = 'https://nexalo-api.vercel.app/api/ytdl-v4';


const IMAGES = [
  'https://i.ibb.co/jZjDNcNr/2151002535.jpg',
  'https://i.ibb.co/gM1BMnnH/2151002609.jpg',
  'https://i.ibb.co/Mk0dnktq/2151645896.jpg',
  'https://i.ibb.co/k21pW1TF/2151995300.jpg',
  'https://i.ibb.co/hJyV5B46/2151995301.jpg',
  'https://i.ibb.co/JR57bL4T/2151995303.jpg',
  'https://i.ibb.co/GfM3wjVd/2151995312.jpg'
];


const progressFrames = [
  "⏳ Requesting download link...",
  "⏳ Requesting download link..",
  "⏳ Requesting download link.",
  "⏳ Requesting download link..",
  "⏳ Requesting download link..."
];

module.exports = {
  name: "play",
  aliases: [],
  author: "Hridoy",
  countDown: 3,
  role: 0,
  description: "Search YouTube and play music by name with interactive buttons 🎵",
  category: "Music",
  usePrefix: true,
  usage: "{pn}play <music name>",
  execute: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageId = msg.message_id;

    const text = msg.text || '';
    const args = text.split(' ').slice(1);
    const query = args.join(' ').trim();

    async function getOrCreateUser(msg) {
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
      return user;
    }

    try {
      await getOrCreateUser(msg);

      if (!query) {
        return bot.sendMessage(chatId, "❌ Please provide a music name. Example: play Starboy", {
          reply_to_message_id: messageId
        });
      }

   
      console.log(`[play] Searching for:`, query);

   
      const ytRes = await axios.get(`${YTSEARCH_API_URL}?query=${encodeURIComponent(query)}`);
      console.log(`[play] YouTube Search Response:`, ytRes.data);

      if (!ytRes.data || ytRes.data.code !== 200 || !Array.isArray(ytRes.data.data) || ytRes.data.data.length === 0) {
        return bot.sendMessage(chatId, "❌ No results found for your music name.", {
          reply_to_message_id: messageId
        });
      }


      const top5 = ytRes.data.data.slice(0, 5);
      let listText = `🎵 *Select a song to play:*\n`;
    
      const btnRows = [];
      for (let i = 0; i < top5.length; i += 2) {
        const row = [];
        if (top5[i])
          row.push({
            text: `▶️ Play #${i + 1}`,
            callback_data: `play_music_${top5[i].videoId}`
          });
        if (top5[i + 1])
          row.push({
            text: `▶️ Play #${i + 2}`,
            callback_data: `play_music_${top5[i + 1].videoId}`
          });
        btnRows.push(row);
      }
      top5.forEach((v, i) => {
        listText += `\n${i + 1}. ${v.title} [${v.duration}]`;
      });

  
      const previewImage = IMAGES[Math.floor(Math.random() * IMAGES.length)];

 
      const listMsg = await bot.sendPhoto(chatId, previewImage, {
        caption: listText,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: btnRows
        },
        reply_to_message_id: messageId
      });

  
      console.log(`[play] Sent selection list message. ID: ${listMsg.message_id}`);
      top5.forEach((v, i) => {
        console.log(`[play] Button #${i+1}: ${v.title} (${v.videoId})`);
      });
    } catch (err) {
      console.error('[play] Play command error:', err.message);
      await bot.sendMessage(chatId, `❌ Error searching for music.\nReason: ${err.message}`, {
        reply_to_message_id: messageId
      });
    }
  },


  onCallbackQuery: async (bot, query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const userId = query.from.id.toString();
    const data = query.data;

    console.log(`[play] CallbackQuery data received:`, data);

    if (!data.startsWith('play_music_')) return;
    const videoId = data.replace('play_music_', '');
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let progressMsgId = null;
    let listMsgId = messageId;

    try {
   
      console.log(`[play] Button selected. VideoId: ${videoId}, VideoUrl: ${videoUrl}`);
      const progressMsg = await bot.sendMessage(chatId, progressFrames[0], {
        reply_to_message_id: messageId
      });
      progressMsgId = progressMsg.message_id;
      console.log(`[play] Progress message ID: ${progressMsgId}`);

      
      let frame = 1;
      let animating = true;
      const animate = async () => {
        if (!animating || frame >= progressFrames.length) return;
        await bot.editMessageText(progressFrames[frame], { chat_id: chatId, message_id: progressMsgId });
        frame++;
        setTimeout(animate, 500);
      };
      setTimeout(animate, 500);

  
      let ytdlRes, downloadUrl, title;
      try {
        await new Promise(r => setTimeout(r, 2200)); 
        await bot.editMessageText("✅ Request success!\n⏬ Downloading audio...", { chat_id: chatId, message_id: progressMsgId });
        console.log(`[play] Requesting primary API: ${YTDL_API_URL_PRIMARY}?url=${encodeURIComponent(videoUrl)}&format=mp3`);

        ytdlRes = await axios.get(`${YTDL_API_URL_PRIMARY}?url=${encodeURIComponent(videoUrl)}&format=mp3`, { timeout: 12000 });

        console.log(`[play] Primary API response:`, ytdlRes.data);

        if (ytdlRes.data && ytdlRes.data.success && ytdlRes.data.data && ytdlRes.data.data.downloadUrl) {
          downloadUrl = ytdlRes.data.data.downloadUrl;
          title = ytdlRes.data.data.title || "Unknown Title";
        } else {
          throw new Error("Primary API did not return a valid MP3 URL");
        }
      } catch (err) {
      
        await bot.editMessageText("⚠️ Primary API failed! Trying fallback...\n⏬ Downloading audio...", { chat_id: chatId, message_id: progressMsgId });
        console.log(`[play] Primary API failed: ${err.message}`);
        console.log(`[play] Requesting fallback API: ${YTDL_API_URL_FALLBACK}?url=${encodeURIComponent(videoUrl)}&format=mp3`);

        ytdlRes = await axios.get(`${YTDL_API_URL_FALLBACK}?url=${encodeURIComponent(videoUrl)}&format=mp3`, { timeout: 20000 });
        console.log(`[play] Fallback API response:`, ytdlRes.data);

        if (ytdlRes.data && ytdlRes.data.success && ytdlRes.data.downloadUrl) {
          downloadUrl = ytdlRes.data.downloadUrl;
          title = ytdlRes.data.title || "Unknown Title";
        } else {
          throw new Error("Fallback API did not return a valid MP3 URL");
        }
      }

 
      await bot.editMessageText("📥 Downloading audio file...", { chat_id: chatId, message_id: progressMsgId });
      console.log(`[play] Downloading MP3 from: ${downloadUrl}`);
      let mp3Response;
      try {
        mp3Response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 25000 });
        console.log(`[play] MP3 download success. Size: ${mp3Response.data.length} bytes`);
      } catch (err) {
        await bot.editMessageText(`❌ Download failed: ${err.message}`, { chat_id: chatId, message_id: progressMsgId });
        console.log(`[play] MP3 download failed: ${err.message}`);
        animating = false;
        throw err;
      }
      const buffer = Buffer.from(mp3Response.data);


      await bot.editMessageText("📤 Sending file...", { chat_id: chatId, message_id: progressMsgId });
      await bot.sendAudio(chatId, buffer, {
        caption: `🎧 *${title}*`,
        parse_mode: "Markdown",
        reply_to_message_id: messageId
      });
      console.log(`[play] Audio sent to chatId: ${chatId}`);

  
      animating = false;
      await bot.deleteMessage(chatId, progressMsgId).catch(()=>{});
      await bot.deleteMessage(chatId, listMsgId).catch(()=>{});
      console.log(`[play] Progress and list messages deleted.`);
    } catch (err) {
      console.error('[play] Play callback error:', err.message);
      if (progressMsgId) {
        await bot.editMessageText(`❌ Failed to play music.\nReason: ${err.message}`, { chat_id: chatId, message_id: progressMsgId }).catch(()=>{});
      } else {
        await bot.sendMessage(chatId, `❌ Failed to play music.\nReason: ${err.message}`, {
          reply_to_message_id: messageId
        });
      }
    }
  }
};