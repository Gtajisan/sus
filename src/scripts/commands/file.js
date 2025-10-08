const fs = require('fs');
const path = require('path');
const settings = require('../../config/settings.json');

module.exports = {
  name: "file",
  aliases: [],
  author: "Hridoy",
  countDown: 0,
  role: 1, 
  description: "Send a command file or its code. Usage: {pn}file <command> [code]",
  category: "System",
  usePrefix: true,
  usage: "{pn}file <command name> [code]",
  async execute(bot, msg, args) {
    const userId = msg.from.id.toString();

    if (
      settings.ownerUid !== userId &&
      !(Array.isArray(settings.admins) && settings.admins.includes(userId))
    ) {
      return bot.sendMessage(
        msg.chat.id,
        "🚫 Only the bot owner or admins can use this command.",
        { reply_to_message_id: msg.message_id }
      );
    }

    if (!args) {
      return bot.sendMessage(
        msg.chat.id,
        "❗ Usage: file <command name> [code]",
        { reply_to_message_id: msg.message_id }
      );
    }

    const parts = args.trim().split(/\s+/);
    const commandName = parts[0];
    const wantCode = parts[1] && parts[1].toLowerCase() === "code";

    const commandPath = path.join(__dirname, commandName.endsWith('.js') ? commandName : `${commandName}.js`);
    if (!fs.existsSync(commandPath)) {
      return bot.sendMessage(
        msg.chat.id,
        `❌ Command file "${commandName}.js" not found.`,
        { reply_to_message_id: msg.message_id }
      );
    }

    if (wantCode) {
   
      const code = fs.readFileSync(commandPath, "utf8");
   
      const chunkSize = 4000;
      if (code.length > chunkSize) {
        let sent = 0;
        let part = 1;
        while (sent < code.length) {
          const chunk = code.slice(sent, sent + chunkSize);
          await bot.sendMessage(
            msg.chat.id,
            `<pre>${escapeHtml(chunk)}</pre>\n(part ${part})`,
            {
              reply_to_message_id: msg.message_id,
              parse_mode: "HTML"
            }
          );
          sent += chunkSize;
          part++;
        }
        return;
      }
      return bot.sendMessage(
        msg.chat.id,
        `<pre>${escapeHtml(code)}</pre>`,
        {
          reply_to_message_id: msg.message_id,
          parse_mode: "HTML"
        }
      );
    } else {

      return bot.sendDocument(
        msg.chat.id,
        commandPath,
        {},
        { reply_to_message_id: msg.message_id }
      );
    }
  }
};

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}