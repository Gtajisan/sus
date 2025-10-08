const axios = require("axios");
const { createCanvas } = require("canvas");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

module.exports = {
  name: "color",
  description: "Get a random color and preview it on canvas",
  category: "Utility",
  usePrefix: true,
  async execute(bot, msg) {
    try {
      const res = await axios.get("https://sus-apis.onrender.com/api/random-color?format=hex");
      const colorCode = res.data?.data?.color || "#000000";

      const width = 512;
      const height = 256;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = colorCode;
      ctx.fillRect(0, 0, width, height);

      ctx.font = "bold 40px Sans";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(colorCode, width / 2, height / 2);

      const filePath = path.join(__dirname, "color_preview.png");
      const out = fs.createWriteStream(filePath);
      const stream = canvas.createPNGStream();
      stream.pipe(out);

      await new Promise((resolve, reject) => {
        out.on("finish", resolve);
        out.on("error", reject);
      });

      await bot.sendPhoto(msg.chat.id, filePath, {
        caption: `Here's your random color 🎨`,
        reply_to_message_id: msg.message_id
      });

      await fsp.unlink(filePath);
    } catch (err) {
      console.error("❌ Error in color command:", err.message);
      await bot.sendMessage(msg.chat.id, "Bhai, kichu ekta gula gese... Try again later.", {
        reply_to_message_id: msg.message_id
      });
    }
  }
};
