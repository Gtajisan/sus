const settings = require('../../config/settings.json');

const warnings = {};
const mutes = {};

module.exports = {
  name: "moderation",
  aliases: ["mod", "modhelp"],
  author: "Hridoy",
  countDown: 0,
  role: 0,
  description: "Moderation tools: warn, ban, mute, kick, unban, clear. Only bot owner and group admins can use.",
  category: "Moderation",
  usePrefix: true,
  usage: "{pn}moderation [user_id] [action] [reason|duration|count]",
  async execute(bot, msg, args) {
    const userId = msg.from.id.toString();
    const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
    let isAdmin = false;
    const isOwner = settings.ownerUid === userId;

    if (isGroup && !isOwner) {
      try {
        const admins = await bot.getChatAdministrators(msg.chat.id);
        isAdmin = admins.some(a => a.user && a.user.id && a.user.id.toString() === userId);
      } catch (err) {
        if (Array.isArray(settings.admins) && settings.admins.includes(userId)) {
          isAdmin = true;
        }
      }
    } else if (Array.isArray(settings.admins) && settings.admins.includes(userId)) {
      isAdmin = true;
    }

    if (!isOwner && !isAdmin) {
      return bot.sendMessage(
        msg.chat.id,
        "🚫 Only the bot owner or group admins can use this command.",
        { reply_to_message_id: msg.message_id }
      );
    }


    if (!args) {
      return bot.sendMessage(
        msg.chat.id,
        `🛡️ <b>Moderation Commands</b>
• <b>{pn}ban &lt;user_id&gt; [reason]</b> - Ban a user from the group.
• <b>{pn}unban &lt;user_id&gt;</b> - Unban a user.
• <b>{pn}kick &lt;user_id&gt; [reason]</b> - Kick a user from the group.
• <b>{pn}mute &lt;user_id&gt; [duration in minutes]</b> - Mute a user for a specific duration.
• <b>{pn}unmute &lt;user_id&gt;</b> - Unmute a user.
• <b>{pn}warn &lt;user_id&gt; [reason]</b> - Warn a user.
• <b>{pn}infractions &lt;user_id&gt;</b> - Show user’s warnings/infractions.
• <b>{pn}clear &lt;number&gt;</b> - Delete the last N messages (if permissions allow).
<i>Replace {pn} with the actual prefix in your group.</i>`,
        { reply_to_message_id: msg.message_id, parse_mode: "HTML" }
      );
    }


    const params = args.trim().split(/\s+/);
    const targetId = params[0];
    const action = (params[1] || "").toLowerCase();
    const extra = params.slice(2).join(" ");

    if (!/^\d+$/.test(targetId)) {
      return bot.sendMessage(
        msg.chat.id,
        "❗ Please provide a valid user ID.",
        { reply_to_message_id: msg.message_id }
      );
    }

    if (
      ["mute", "unmute", "ban", "kick"].includes(action) &&
      msg.chat.type !== "supergroup"
    ) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ This moderation action requires a supergroup (not a basic group).",
        { reply_to_message_id: msg.message_id }
      );
    }

    // ========== WARN ==========
    if (action === 'warn') {
      const reason = extra || "No reason provided.";
      if (!warnings[targetId]) warnings[targetId] = [];
      warnings[targetId].push({ by: userId, date: new Date(), reason });
      return bot.sendMessage(
        msg.chat.id,
        `⚠️ User <b>${targetId}</b> has been warned.\nReason: <i>${reason}</i>\nTotal warns: <b>${warnings[targetId].length}</b>`,
        { reply_to_message_id: msg.message_id, parse_mode: "HTML" }
      );
    }

    // ========== INFRACTIONS ==========
    if (action === 'infractions') {
      const userWarns = warnings[targetId] || [];
      if (userWarns.length === 0) {
        return bot.sendMessage(
          msg.chat.id,
          `✅ User <b>${targetId}</b> has no warnings.`,
          { reply_to_message_id: msg.message_id, parse_mode: "HTML" }
        );
      }
      let list = userWarns.map(
        (w, i) => `${i + 1}. By: <code>${w.by}</code> | Reason: <i>${w.reason}</i> | Date: <code>${w.date.toLocaleString()}</code>`
      ).join('\n');
      return bot.sendMessage(
        msg.chat.id,
        `⚠️ <b>Warnings for user ${targetId}:</b>\n${list}`,
        { reply_to_message_id: msg.message_id, parse_mode: "HTML" }
      );
    }

    // ========== BAN ==========
    if (action === 'ban') {
      try {
        await bot.banChatMember(msg.chat.id, Number(targetId));
        return bot.sendMessage(
          msg.chat.id,
          `🚫 User <b>${targetId}</b> has been <b>banned</b> from the group.`,
          { reply_to_message_id: msg.message_id, parse_mode: "HTML" }
        );
      } catch (err) {
        return bot.sendMessage(
          msg.chat.id,
          `❌ Failed to ban user: ${err.message}`,
          { reply_to_message_id: msg.message_id }
        );
      }
    }

    // ========== UNBAN ==========
    if (action === 'unban') {
      try {
        await bot.unbanChatMember(msg.chat.id, Number(targetId));
        return bot.sendMessage(
          msg.chat.id,
          `✅ User <b>${targetId}</b> has been <b>unbanned</b>.`,
          { reply_to_message_id: msg.message_id, parse_mode: "HTML" }
        );
      } catch (err) {
        return bot.sendMessage(
          msg.chat.id,
          `❌ Failed to unban user: ${err.message}`,
          { reply_to_message_id: msg.message_id }
        );
      }
    }

    // ========== KICK ==========
    if (action === 'kick') {
      try {
        await bot.banChatMember(msg.chat.id, Number(targetId));
        await bot.unbanChatMember(msg.chat.id, Number(targetId)); 
        return bot.sendMessage(
          msg.chat.id,
          `👢 User <b>${targetId}</b> has been <b>kicked</b> from the group.`,
          { reply_to_message_id: msg.message_id, parse_mode: "HTML" }
        );
      } catch (err) {
        return bot.sendMessage(
          msg.chat.id,
          `❌ Failed to kick user: ${err.message}`,
          { reply_to_message_id: msg.message_id }
        );
      }
    }

    // ========== MUTE ==========
    if (action === 'mute') {
      const duration = parseInt(extra) || 5;  
      const untilDate = Math.floor(Date.now() / 1000) + duration * 60;
      try {
        await bot.restrictChatMember(msg.chat.id, Number(targetId), {
          permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
          },
          until_date: untilDate
        });
        mutes[targetId] = untilDate;
        return bot.sendMessage(
          msg.chat.id,
          `🔇 User <b>${targetId}</b> has been <b>muted</b> for <b>${duration}</b> minute(s).`,
          { reply_to_message_id: msg.message_id, parse_mode: "HTML" }
        );
      } catch (err) {
        return bot.sendMessage(
          msg.chat.id,
          `❌ Failed to mute user: ${err.message}`,
          { reply_to_message_id: msg.message_id }
        );
      }
    }

    // ========== UNMUTE ==========
    if (action === 'unmute') {
      try {
        await bot.restrictChatMember(msg.chat.id, Number(targetId), {
          permissions: {
            can_send_messages: true,
            can_send_media_messages: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
          },
          until_date: 0
        });
        delete mutes[targetId];
        return bot.sendMessage(
          msg.chat.id,
          `✅ User <b>${targetId}</b> has been <b>unmuted</b>.`,
          { reply_to_message_id: msg.message_id, parse_mode: "HTML" }
        );
      } catch (err) {
        return bot.sendMessage(
          msg.chat.id,
          `❌ Failed to unmute user: ${err.message}`,
          { reply_to_message_id: msg.message_id }
        );
      }
    }

    // ========== CLEAR ==========
    if (action === 'clear') {
      const count = parseInt(extra) || 1;
      if (!msg.chat || !msg.chat.id) {
        return bot.sendMessage(
          msg.chat.id,
          `❌ Cannot clear messages here.`,
          { reply_to_message_id: msg.message_id }
        );
      }
      try {
      
        let currentId = msg.message_id;
        let deleted = 0;
        for (let i = 0; i < count; i++) {
          currentId--;
          try {
            await bot.deleteMessage(msg.chat.id, currentId);
            deleted++;
          } catch {}
        }
        return bot.sendMessage(
          msg.chat.id,
          `🧹 Deleted <b>${deleted}</b> message(s) (if possible).`,
          { reply_to_message_id: msg.message_id, parse_mode: "HTML" }
        );
      } catch (err) {
        return bot.sendMessage(
          msg.chat.id,
          `❌ Failed to clear messages: ${err.message}`,
          { reply_to_message_id: msg.message_id }
        );
      }
    }

    // ========== Unknown ==========
    return bot.sendMessage(
      msg.chat.id,
      "❗ Unknown moderation action. Type {pn}moderation for help.",
      { reply_to_message_id: msg.message_id }
    );
  }
};