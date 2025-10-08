const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const util = require('util');
const streamPipeline = util.promisify(pipeline);

const YT_API_1 = "https://sus-apis.onrender.com/api/ytdlv3?url={url}&format=mp4";
const YT_API_2 = "https://nexalo-api.vercel.app/api/ytdl-v4?url={url}&format=mp4";

function matchPlatform(url) {
  if (/instagram\.com\/reel\//.test(url)) return 'instagram';
  if (/facebook\.com\/share\//.test(url)) return 'facebook';
  if (/tiktok\.com\//.test(url)) return 'tiktok';
  if (/twitter\.com\/[^\/]+\/status\/\d+/.test(url)) return 'twitter';
  if (/youtu\.be\/|youtube\.com\/watch\?v=/.test(url)) return 'youtube';
  return null;
}

async function downloadAndSend(bot, chatId, videoUrl, filename, statusMsgId) {
  const tmpPath = path.join(__dirname, '..', '..', 'tmp', filename);
  try {
    await bot.editMessageText(
      "⏬ <b>Stage 2:</b> Downloading video from server, please wait...",
      { chat_id: chatId, message_id: statusMsgId, parse_mode: "HTML" }
    );

    const response = await axios.get(videoUrl, { responseType: 'stream' });
    await streamPipeline(response.data, fs.createWriteStream(tmpPath));
    await bot.editMessageText(
      "📤 <b>Stage 3:</b> Sending video to Telegram...",
      { chat_id: chatId, message_id: statusMsgId, parse_mode: "HTML" }
    );
    await bot.sendVideo(chatId, tmpPath, { caption: "Here is your video! 🎬" });
    fs.unlink(tmpPath, () => {});
  
    await bot.deleteMessage(chatId, statusMsgId);
    return { success: true };
  } catch (err) {

    fs.unlink(tmpPath, () => {});
  
    if (err.response && err.response.statusCode === 413) {
      return { success: false, reason: 'Telegram does not allow sending files larger than 50MB for bots.', code: 413 };
    }
  
    return { success: false, reason: err.message || 'Unknown error occurred', code: err.code };
  }
}

module.exports = {
  name: "mediaDownloader",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!msg.text) return;

  
    const urlMatch = msg.text.match(/(https?:\/\/[^\s]+)/);
    if (!urlMatch) return;
    const url = urlMatch[1];
    const platform = matchPlatform(url);
    if (!platform) return;

 
    const statusMessage = await bot.sendMessage(
      chatId,
      "🔗 <b>Stage 1:</b> Requesting download link from server...\n\n" +
      "<b>Status flow:</b>\n" +
      "1️⃣ Requesting download URL...\n" +
      "2️⃣ Downloading video...\n" +
      "3️⃣ Sending video to you!\n",
      { parse_mode: "HTML" }
    );
    let statusMsgId = statusMessage.message_id;

    let videoUrl, filename, apiResp;
    try {
      let apiUrl;

      if (platform === "instagram") {
        apiUrl = `https://speedydl.hridoy.top/api/instagram?url=${encodeURIComponent(url)}`;
        apiResp = (await axios.get(apiUrl)).data;
        console.log('Instagram API:', apiResp);
        videoUrl = Array.isArray(apiResp.video) ? apiResp.video[0] : null;
        filename = 'instagram_video.mp4';
      } else if (platform === "facebook") {
        apiUrl = `https://speedydl.hridoy.top/api/facebook?url=${encodeURIComponent(url)}`;
        apiResp = (await axios.get(apiUrl)).data;
        console.log('Facebook API:', apiResp);
        videoUrl = apiResp.hd || apiResp.sd;
        filename = 'facebook_video.mp4';
      } else if (platform === "tiktok") {
        apiUrl = `https://speedydl.hridoy.top/api/tiktok?url=${encodeURIComponent(url)}`;
        apiResp = (await axios.get(apiUrl)).data;
        console.log('TikTok API:', apiResp);
        videoUrl = apiResp.video;
        filename = 'tiktok_video.mp4';
      } else if (platform === "twitter") {
        apiUrl = `https://speedydl.hridoy.top/api/twitter?url=${encodeURIComponent(url)}`;
        apiResp = (await axios.get(apiUrl)).data;
        console.log('Twitter API:', apiResp);
        if (Array.isArray(apiResp.videos) && apiResp.videos.length > 0) {
 
          videoUrl = apiResp.videos[0].url;
        }
        filename = 'twitter_video.mp4';
      } else if (platform === "youtube") {
  
        let ytApi1 = YT_API_1.replace('{url}', encodeURIComponent(url));
        apiResp = (await axios.get(ytApi1)).data;
        console.log('YouTube API 1:', apiResp);
        if (apiResp.success && apiResp.data && apiResp.data.downloadUrl) {
          videoUrl = apiResp.data.downloadUrl;
        } else {
     
          let ytApi2 = YT_API_2.replace('{url}', encodeURIComponent(url));
          apiResp = (await axios.get(ytApi2)).data;
          console.log('YouTube API 2:', apiResp);
          videoUrl = apiResp.downloadUrl;
        }
        filename = 'youtube_video.mp4';
      }

      if (!videoUrl) {
        await bot.editMessageText(
          '⚠️ No downloadable video found for your link.',
          { chat_id: chatId, message_id: statusMsgId }
        );
        return;
      }

      await bot.editMessageText(
        "✅ <b>Stage 1 Complete:</b> Download URL found!\n\n⏬ <b>Stage 2:</b> Downloading video...",
        { chat_id: chatId, message_id: statusMsgId, parse_mode: "HTML" }
      );


      const sendResult = await downloadAndSend(bot, chatId, videoUrl, filename, statusMsgId);

      if (!sendResult.success) {
     
        let reasonText = sendResult.code === 413
          ? "❌ <b>Failed:</b> Video file is too large for Telegram bots to send (over 50MB)."
          : `❌ <b>Failed:</b> ${sendResult.reason}`;
        await bot.editMessageText(
          `${reasonText}\n\nYou can still download the video directly from the server using the button below.`,
          {
            chat_id: chatId,
            message_id: statusMsgId,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "⬇️ Download Video",
                    url: videoUrl
                  }
                ]
              ]
            }
          }
        );
      }

    } catch (error) {
      await bot.editMessageText(
        '❌ Failed to fetch video URL. Please try again later.',
        { chat_id: chatId, message_id: statusMsgId }
      );
      console.error('API request error:', error?.response?.data || error.message);
    }
  }
};