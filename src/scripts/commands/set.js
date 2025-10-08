const User = require('../../models/User');
const settings = require('../../config/settings.json');

module.exports = {
  name: "set",
  aliases: [],
  author: "Hridoy",
  countDown: 2,
  role: 1, 
  description: `
👑 <b>Admin/Owner Only: Set Command Help</b>

Manage users' balances, XP, and levels.
All commands support: user ID, @username, or by replying to a user's message.

<b>Add/Remove Money</b>
!set addmoney [uid|@username|reply] [amount]
  ➥ Add money to user's wallet.
!set removemoney [uid|@username|reply] [amount]
  ➥ Remove money from user's wallet.

<b>Set Wallet Money</b>
!set money [uid|@username|reply] [amount]
  ➥ Set user's wallet to exact amount.

<b>XP and Level</b>
!set xp [uid|@username|reply] [amount]
  ➥ Set user's XP to exact value.
!set addxp [uid|@username|reply] [amount]
  ➥ Add XP to user.
!set removexp [uid|@username|reply] [amount]
  ➥ Remove XP from user.
!set level [uid|@username|reply] [level]
  ➥ Set user's level directly.

<b>Reset User</b>
!set rest [uid|@username|reply]
  ➥ Reset user's XP & level to 0/1.

<b>Reset All</b>
!set resetall
  ➥ Reset XP & level for everyone. (Dangerous!)

⚠️ Only bot admins/owners may use these commands.
`,
  category: "Admin",
  usePrefix: true,
  usage: "{pn}set <action> <user> <amount/level>",
  async execute(bot, msg, args) {
    try {

      const userId = msg.from.id.toString();
      const isAdmin = settings.admins.includes(userId) || userId === settings.ownerUid;
      if (!isAdmin) {
        await bot.sendMessage(msg.chat.id, "❌ Only bot admins/owners can use this command.", { reply_to_message_id: msg.message_id });
        return;
      }


      if (!args) {
        await bot.sendMessage(msg.chat.id, this.description, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        return;
      }
      const [action, ...params] = args.trim().split(/\s+/);

    
      async function getTargetUser() {
        let targetId;
        if (msg.reply_to_message) {
          targetId = msg.reply_to_message.from.id.toString();
        } else if (params[0]?.startsWith('@')) {
          const username = params[0].slice(1);
          const user = await User.findOne({ username });
          if (user) targetId = user.telegramId;
        } else if (/^\d+$/.test(params[0])) {
          targetId = params[0];
        } else {
          targetId = userId; 
        }
        if (!targetId) return null;
        let user = await User.findOne({ telegramId: targetId });
        if (!user) {
          user = new User({ telegramId: targetId, wallet: 0, xp: 0, level: 1, bank: 0, inventory: [] });
          await user.save();
        }
        return user;
      }

      if (action === "addmoney") {
        const amount = parseFloat(params[1] || params[0]);
        if (isNaN(amount) || amount <= 0) {
          return bot.sendMessage(msg.chat.id, "❗ Provide a valid amount.", { reply_to_message_id: msg.message_id });
        }
        const user = await getTargetUser();
        if (!user) return bot.sendMessage(msg.chat.id, "❗ Target user not found.", { reply_to_message_id: msg.message_id });
        user.wallet = (user.wallet || 0) + amount;
        await user.save();
        return bot.sendMessage(msg.chat.id, `✅ Added $${amount} to <b>${user.username || user.firstName || user.telegramId}</b>'s wallet.`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
      }


      if (action === "removemoney") {
        const amount = parseFloat(params[1] || params[0]);
        if (isNaN(amount) || amount <= 0) {
          return bot.sendMessage(msg.chat.id, "❗ Provide a valid amount.", { reply_to_message_id: msg.message_id });
        }
        const user = await getTargetUser();
        if (!user) return bot.sendMessage(msg.chat.id, "❗ Target user not found.", { reply_to_message_id: msg.message_id });
        user.wallet = Math.max(0, (user.wallet || 0) - amount);
        await user.save();
        return bot.sendMessage(msg.chat.id, `✅ Removed $${amount} from <b>${user.username || user.firstName || user.telegramId}</b>'s wallet.`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
      }


      if (action === "money") {
        const amount = parseFloat(params[1] || params[0]);
        if (isNaN(amount) || amount < 0) {
          return bot.sendMessage(msg.chat.id, "❗ Provide a valid amount.", { reply_to_message_id: msg.message_id });
        }
        const user = await getTargetUser();
        if (!user) return bot.sendMessage(msg.chat.id, "❗ Target user not found.", { reply_to_message_id: msg.message_id });
        user.wallet = amount;
        await user.save();
        return bot.sendMessage(msg.chat.id, `✅ Set wallet to $${amount} for <b>${user.username || user.firstName || user.telegramId}</b>.`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
      }

     
      if (action === "xp") {
        const amount = parseInt(params[1] || params[0]);
        if (isNaN(amount) || amount < 0) {
          return bot.sendMessage(msg.chat.id, "❗ Provide a valid XP value.", { reply_to_message_id: msg.message_id });
        }
        const user = await getTargetUser();
        if (!user) return bot.sendMessage(msg.chat.id, "❗ Target user not found.", { reply_to_message_id: msg.message_id });
        user.xp = amount;
        await user.save();
        return bot.sendMessage(msg.chat.id, `✅ Set XP to ${amount} for <b>${user.username || user.firstName || user.telegramId}</b>.`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
      }


      if (action === "addxp") {
        const amount = parseInt(params[1] || params[0]);
        if (isNaN(amount) || amount <= 0) {
          return bot.sendMessage(msg.chat.id, "❗ Provide a valid amount.", { reply_to_message_id: msg.message_id });
        }
        const user = await getTargetUser();
        if (!user) return bot.sendMessage(msg.chat.id, "❗ Target user not found.", { reply_to_message_id: msg.message_id });
        user.xp = (user.xp || 0) + amount;
        await user.save();
        return bot.sendMessage(msg.chat.id, `✅ Added ${amount} XP to <b>${user.username || user.firstName || user.telegramId}</b>.`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
      }


      if (action === "removexp") {
        const amount = parseInt(params[1] || params[0]);
        if (isNaN(amount) || amount <= 0) {
          return bot.sendMessage(msg.chat.id, "❗ Provide a valid amount.", { reply_to_message_id: msg.message_id });
        }
        const user = await getTargetUser();
        if (!user) return bot.sendMessage(msg.chat.id, "❗ Target user not found.", { reply_to_message_id: msg.message_id });
        user.xp = Math.max(0, (user.xp || 0) - amount);
        await user.save();
        return bot.sendMessage(msg.chat.id, `✅ Removed ${amount} XP from <b>${user.username || user.firstName || user.telegramId}</b>.`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
      }


      if (action === "level") {
        const level = parseInt(params[1] || params[0]);
        if (isNaN(level) || level < 1) {
          return bot.sendMessage(msg.chat.id, "❗ Provide a valid level.", { reply_to_message_id: msg.message_id });
        }
        const user = await getTargetUser();
        if (!user) return bot.sendMessage(msg.chat.id, "❗ Target user not found.", { reply_to_message_id: msg.message_id });
        user.level = level;
        await user.save();
        return bot.sendMessage(msg.chat.id, `✅ Set level to ${level} for <b>${user.username || user.firstName || user.telegramId}</b>.`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
      }

  
      if (action === "rest") {
        const user = await getTargetUser();
        if (!user) return bot.sendMessage(msg.chat.id, "❗ Target user not found.", { reply_to_message_id: msg.message_id });
        user.xp = 0;
        user.level = 1;
        await user.save();
        return bot.sendMessage(msg.chat.id, `✅ Reset XP and level for <b>${user.username || user.firstName || user.telegramId}</b>.`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
      }


      if (action === "resetall") {
        await User.updateMany({}, { $set: { xp: 0, level: 1 } });
        return bot.sendMessage(msg.chat.id, "⚠️ All users' XP and level have been reset.", { reply_to_message_id: msg.message_id });
      }


      await bot.sendMessage(msg.chat.id, this.description, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    } catch (err) {
  
      let errMsg = "❌ Error: " + (err.message || err.toString());
      try {
        await bot.sendMessage(msg.chat.id, errMsg, { reply_to_message_id: msg.message_id });
      } catch {}
      console.error("[set.js]", err);
    }
  }
};