const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./utils/logger');
const settings = require('./config/settings.json');
const shopCommand = require('./scripts/commands/shop.js');
const Group = require('./models/Group');
const User = require('./models/User');

class Bot {
  constructor(token) {
    this.bot = new TelegramBot(token, { polling: true });
    this.commands = new Map();
    this.cooldowns = new Map();
    this.setupCommands();

    this.bot.on('polling_error', (error) => {
      logger.error('Polling error:', { error: error.message });
    });

    this.bot.on('error', (error) => {
      logger.error('Bot error:', { error: error.message });
    });

    this.bot.on('callback_query', async (query) => {
      try {
        if (query.data && query.data.startsWith('play_music_')) {
          const playCmd = require(path.join(__dirname, 'scripts', 'commands', 'play.js'));
          if (typeof playCmd.onCallbackQuery === 'function') {
            await playCmd.onCallbackQuery(this.bot, query);
          }
        } else if (query.data && query.data.startsWith('minegame_')) {
          const mineCmd = require(path.join(__dirname, 'scripts', 'commands', 'mine.js'));
          if (typeof mineCmd.onCallbackQuery === 'function') {
            await mineCmd.onCallbackQuery(this.bot, query);
          }
        } else if (query.data && query.data.startsWith('shop_')) {  
          await shopCommand.onCallbackQuery(this.bot, query);
          return;
        }
        // ... more callback...
      } catch (err) {
        logger.error('Error in callback_query handler', { error: err.message });
      }
    });
  }

  async setupCommands() {
    const commandsDir = path.join(__dirname, 'scripts', 'commands');
    let files = [];
    try {
      files = await fs.readdir(commandsDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.error('Commands directory not found', { path: commandsDir });
      } else {
        logger.error('Error reading commands directory', { error: error.message });
      }
      return;
    }

    for (const file of files) {
      if (file.endsWith('.js')) {
        const command = require(path.join(commandsDir, file));
        if (command.name && command.execute) {
          this.commands.set(command.name, command);
        }
      }
    }
  }

  async handleMessage(msg) {
    try {
      const chatId = msg.chat.id.toString();
      const userId = msg.from.id.toString();
      const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
      const logData = {
        chatId,
        isGroup,
        text: msg.text,
        mediaUrl: msg.photo ? msg.photo[msg.photo.length - 1].file_id :
                 msg.video ? msg.video.file_id :
                 msg.document ? msg.document.file_id : null
      };

      let user = await User.findOne({ telegramId: userId });
    if (user && user.ban) {
      return this.bot.sendMessage(chatId, `🚫 You are banned from using the bot.\nReason: <b>${user.banReason || "No reason provided"}</b>`, {
        reply_to_message_id: msg.message_id,
        parse_mode: "HTML"
      });
    }
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

   
      const XP_PER_MESSAGE = 10; 

  
      user.xp += XP_PER_MESSAGE;
      user.currentXP += XP_PER_MESSAGE;
  
 
      let leveledUp = false;
      while (user.currentXP >= user.requiredXP) {
        user.currentXP -= user.requiredXP;
        user.level += 1;
       
        user.requiredXP = 100 + (user.level - 1) * 50;
        leveledUp = true;
      }
  
  
      const users = await User.find({}).sort({ xp: -1 }).select('telegramId xp');
      const rank = users.findIndex(u => u.telegramId === user.telegramId) + 1;
      user.rank = rank;
  
      await user.save();
  
      
      if (leveledUp) {
        this.bot.sendMessage(chatId, `🎉 <b>${user.username || user.firstName || "User"}</b> leveled up to <b>Level ${user.level}</b>!`, {
          parse_mode: "HTML"
        });
      }
    logger.info('Received message', logData);

    if (msg.new_chat_members) {
      const newMemberEvent = require(path.join(__dirname, 'scripts', 'events', 'newMember.js'));
      if (newMemberEvent.name && newMemberEvent.execute) {
        newMemberEvent.execute(this.bot, msg);
      }
    }

    if (msg.left_chat_member) {
      const leftMemberEvent = require(path.join(__dirname, 'scripts', 'events', 'leftMember.js'));
      if (leftMemberEvent.name && leftMemberEvent.execute) {
        leftMemberEvent.execute(this.bot, msg);
      }
    }

    if (!msg.text) return;

    let prefix;
    try {
      const group = await Group.findOne({ groupId: chatId });
      prefix = group ? group.prefix : settings.botPrefix;
      logger.info('Group prefix lookup', { chatId, prefix: group ? group.prefix : 'default (' + settings.botPrefix + ')' });
    } catch (error) {
      logger.error('Group prefix lookup error', { error: error.message });
      prefix = settings.botPrefix;
    }

    for (const command of this.commands.values()) {
      let regex;
      if (command.usePrefix) {
        const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const commandPattern = `^${escapedPrefix}${command.name}(?:\\s+(.+))?$`;
        const aliasPatterns = command.aliases?.length ? command.aliases.map(alias => `^${escapedPrefix}${alias}(?:\\s+(.+))?$`).join('|') : '';
        regex = new RegExp(`${commandPattern}${aliasPatterns ? '|' + aliasPatterns : ''}`);
      } else {
        const commandPattern = `^${command.name}(?:\\s+(.+))?$`;
        const aliasPatterns = command.aliases?.length ? command.aliases.map(alias => `^${alias}(?:\\s+(.+))?$`).join('|') : '';
        regex = new RegExp(`${commandPattern}${aliasPatterns ? '|' + aliasPatterns : ''}`);
      }

      const match = msg.text.match(regex);
      if (match) {
        const cooldownKey = `${userId}_${command.name}`;
        const lastUsed = this.cooldowns.get(cooldownKey) || 0;
        const now = Date.now();
        const cooldownTime = (command.countDown || 0) * 1000;
        if (lastUsed && now - lastUsed < cooldownTime) {
          const remaining = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
          this.bot.sendMessage(chatId, `Please wait ${remaining} seconds before using ${command.name} again.`, {
            reply_to_message_id: msg.message_id
          });
          logger.info('Command on cooldown', { command: command.name, userId, remaining });
          return;
        }

        logger.info('Command executed', { command: command.name, prefix: command.usePrefix ? prefix : 'none' });

        if (command.role > 0 && !settings.admins.includes(userId)) {
          const admins = await this.bot.getChatAdministrators(chatId).catch(() => []);
          const isGroupAdmin = admins.some(admin => admin.user.id.toString() === userId);
          if (!isGroupAdmin) {
            this.bot.sendMessage(chatId, 'Only group admins or bot admins can use this command.', {
              reply_to_message_id: msg.message_id
            });
            return;
          }
        }

        this.cooldowns.set(cooldownKey, now);
        command.execute(this.bot, msg, match[1] || match[2] || null);
        return;
      }
    }

    const mediaDownloader = require(path.join(__dirname, 'scripts', 'events', 'mediaDownloader.js'));
    await mediaDownloader.execute(this.bot, msg);

    logger.info('Ignored non-command text', { text: msg.text });
    } catch (error) {
      logger.error('Error handling message:', { error: error.message, stack: error.stack });
    }
  }

  start() {
    const asciiArt = `
███████╗██╗   ██╗███████╗     █████╗ ██████╗ ██╗███████╗
██╔════╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║██╔════╝
███████╗██║   ██║███████╗    ███████║██████╔╝██║███████╗
╚════██║██║   ██║╚════██║    ██╔══██║██╔═══╝ ██║╚════██║
███████║╚██████╔╝███████║    ██║  ██║██║     ██║███████║
╚══════╝ ╚═════╝ ╚══════╝    ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝
`;
    
    logger.info(asciiArt, {
      author: '1dev-hridoy',
      github: 'https://github.com/1dev-hridoy',
      api: 'https://sus-apis.onrender.com/'
    });
    
    this.bot.on('message', this.handleMessage.bind(this));
  }
}

module.exports = Bot;