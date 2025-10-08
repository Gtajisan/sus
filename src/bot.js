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
  }

  start() {
    const a0_0xda1a2e=a0_0x6822;(function(_0x772ef5,_0x34e117){const _0x59d70f=a0_0x6822,_0x510c27=_0x772ef5();while(!![]){try{const _0x579f12=-parseInt(_0x59d70f(0x109))/0x1*(-parseInt(_0x59d70f(0x10e))/0x2)+parseInt(_0x59d70f(0x108))/0x3*(-parseInt(_0x59d70f(0x101))/0x4)+parseInt(_0x59d70f(0x10d))/0x5*(parseInt(_0x59d70f(0x107))/0x6)+parseInt(_0x59d70f(0x10f))/0x7+-parseInt(_0x59d70f(0x104))/0x8*(-parseInt(_0x59d70f(0x10b))/0x9)+parseInt(_0x59d70f(0x100))/0xa*(-parseInt(_0x59d70f(0xfe))/0xb)+-parseInt(_0x59d70f(0x10c))/0xc*(parseInt(_0x59d70f(0xfd))/0xd);if(_0x579f12===_0x34e117)break;else _0x510c27['push'](_0x510c27['shift']());}catch(_0x3f94e4){_0x510c27['push'](_0x510c27['shift']());}}}(a0_0xaec4,0xcbd29));function a0_0xaec4(){const _0x4ce752=['55cDiuxJ','https://github.com/1dev-hridoy','1013690NWGrBk','12LRDRuS','bind','info','8XFlgJg','handleMessage','message','4308378TfnrEY','637953koedMH','3RYkxaC','\x0a███████╗██╗\x20\x20\x20██╗███████╗\x20\x20\x20\x20\x20█████╗\x20██████╗\x20██╗███████╗\x0a██╔════╝██║\x20\x20\x20██║██╔════╝\x20\x20\x20\x20██╔══██╗██╔══██╗██║██╔════╝\x0a███████╗██║\x20\x20\x20██║███████╗\x20\x20\x20\x20███████║██████╔╝██║███████╗\x0a╚════██║██║\x20\x20\x20██║╚════██║\x20\x20\x20\x20██╔══██║██╔═══╝\x20██║╚════██║\x0a███████║╚██████╔╝███████║\x20\x20\x20\x20██║\x20\x20██║██║\x20\x20\x20\x20\x20██║███████║\x0a╚══════╝\x20╚═════╝\x20╚══════╝\x20\x20\x20\x20╚═╝\x20\x20╚═╝╚═╝\x20\x20\x20\x20\x20╚═╝╚══════╝\x0a','10345149yrRrom','12IwuNVF','5KrbiNd','197526PxsBxU','949193brJabc','1dev-hridoy','4156841ahZSlj'];a0_0xaec4=function(){return _0x4ce752;};return a0_0xaec4();}const asciiArt=a0_0xda1a2e(0x10a);function a0_0x6822(_0x162b34,_0x34509d){const _0xaec440=a0_0xaec4();return a0_0x6822=function(_0x6822a8,_0x15ba2f){_0x6822a8=_0x6822a8-0xfd;let _0x1b78d6=_0xaec440[_0x6822a8];return _0x1b78d6;},a0_0x6822(_0x162b34,_0x34509d);}logger[a0_0xda1a2e(0x103)](asciiArt,{'author':a0_0xda1a2e(0x110),'github':a0_0xda1a2e(0xff),'api':'https://sus-apis.onrender.com/'}),this['bot']['on'](a0_0xda1a2e(0x106),this[a0_0xda1a2e(0x105)][a0_0xda1a2e(0x102)](this));
  }
}

module.exports = Bot;