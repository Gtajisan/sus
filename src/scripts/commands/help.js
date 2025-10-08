const fs = require('fs').promises;
const path = require('path');
const settings = require('../../config/settings.json');
const User = require('../../models/User');
const Group = require('../../models/Group');

module.exports = {
  name: "help",
  aliases: ["h", "commands"],
  author: "Hridoy",
  countDown: 2,
  role: 0,
  description: "Displays the list of available commands or details of a specific command in a terminal-like UI.",
  category: "General",
  usePrefix: true,
  usage: "{pn} [command]",
  execute: async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

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

      const commandsDir = path.join(__dirname, '..', 'commands');
      const files = await fs.readdir(commandsDir);
      const commands = new Map();

      for (const file of files) {
        if (file.endsWith('.js')) {
          const command = require(path.join(commandsDir, file));
          if (command.name && command.execute && !commands.has(command.name)) {
            commands.set(command.name, command);
          }
        }
      }

      const group = await Group.findOne({ groupId: chatId });
      const prefix = group ? group.prefix : settings.botPrefix;

      if (args) {
        const commandName = args.toLowerCase();
        let command = commands.get(commandName);

        if (!command) {
          for (const cmd of commands.values()) {
            if (cmd.aliases && cmd.aliases.includes(commandName)) {
              command = cmd;
              break;
            }
          }
        }

        if (command) {
          const helpMessage = `
╔════════════════════════════╗
║     🔥 COMMAND INFO     ║
╚════════════════════════════╝

📌 Command: ${command.name}
📜 Aliases: ${command.aliases?.length ? command.aliases.join(', ') : 'None'}
✍️ Author: ${command.author || 'Unknown'}
⏱️ Cooldown: ${command.countDown || 0} seconds
🔒 Role: ${command.role === 0 ? 'User' : command.role === 1 ? 'Group Admin' : 'Bot Admin'}
📝 Description: ${command.description || 'No description'}
📂 Category: ${command.category || 'Uncategorized'}
📚 Usage: ${command.usage.replace('{pn}', prefix) || `${prefix}${command.name}`}

━━━━━━━━━━━━━━━━━━━━━━━━
💬 Tip: Use ${prefix}${command.name} to trigger it
⚡ Stay sussy, stay powerful ⚡
✨ Owner: ${settings.ownerName}
          `;
          await bot.sendMessage(chatId, helpMessage);
          return;
        } else {
          await bot.sendMessage(chatId, `Command "${commandName}" not found. Use ${prefix}help to see all commands.`);
          return;
        }
      }

     
      const categories = {};
      commands.forEach(cmd => {
        const cat = (cmd.category || "Uncategorized").toUpperCase();
        if (!categories[cat]) categories[cat] = [];
        if (!categories[cat].includes(cmd.name)) categories[cat].push(cmd.name);
      });



      
      const sortedCats = Object.keys(categories).sort();

      let helpMessage = `
╔════════════════════════════╗
║     🔥 ${settings.botName.toUpperCase()} HELP MENU     ║
╚════════════════════════════╝

👑 Owner: ${settings.ownerName}
💻 Total Commands: ${commands.size}
📌 Categories:
`;

      for (const category of sortedCats) {
        const cmds = categories[category];
        helpMessage += `╭─✦ ${category} ✦\n│ ${cmds.join(', ')}\n╰────────\n\n`;
      }

      helpMessage += `━━━━━━━━━━━━━━━━━━━━━━━━
💬 Tip: Use ${prefix}help <command> for details
⚡️ Stay sussy, stay powerful ⚡️
✨ Owner: ${settings.ownerName}
      `;

      await bot.sendMessage(chatId, helpMessage.trim());
    } catch (error) {
      console.error('Help command error:', error.message);
      await bot.sendMessage(chatId, 'Something went wrong. Please try again.');
    }
  }
};