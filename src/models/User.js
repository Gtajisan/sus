const { getDB } = require('../config/db');

class User {
  constructor(data) {
    this.id = data.id;
    this.telegramId = data.telegramId;
    this.username = data.username;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.lastInteraction = data.lastInteraction ? new Date(data.lastInteraction) : new Date();
    this.commandCount = data.commandCount || 0;
    this.wallet = data.wallet || 0;
    this.bank = data.bank || 0;
    this.loan = data.loan || 0;
    this.lastDailyWork = data.lastDailyWork ? new Date(data.lastDailyWork) : null;
    this.xp = data.xp || 0;
    this.currentXP = data.currentXP || 0;
    this.requiredXP = data.requiredXP || 100;
    this.level = data.level || 1;
    this.rank = data.rank || 0;
    this.achievements = typeof data.achievements === 'string' ? JSON.parse(data.achievements) : (data.achievements || []);
    this.inventory = typeof data.inventory === 'string' ? JSON.parse(data.inventory) : (data.inventory || []);
    this.isPremium = Boolean(data.isPremium);
    this.premiumExpires = data.premiumExpires ? new Date(data.premiumExpires) : null;
    this.ban = Boolean(data.ban);
    this.banReason = data.banReason;
    this.language = data.language || 'en';
    this.referrer = data.referrer;
    this.referrals = typeof data.referrals === 'string' ? JSON.parse(data.referrals) : (data.referrals || []);
    this.settings = typeof data.settings === 'string' ? JSON.parse(data.settings) : (data.settings || {});
    this.cooldowns = typeof data.cooldowns === 'string' ? JSON.parse(data.cooldowns) : (data.cooldowns || {});
    this.lastActiveGroup = data.lastActiveGroup;
  }

  static findOne(query) {
    const db = getDB();
    const conditions = [];
    const values = [];

    Object.entries(query).forEach(([key, value]) => {
      conditions.push(`${key} = ?`);
      values.push(value);
    });

    const sql = `SELECT * FROM users WHERE ${conditions.join(' AND ')} LIMIT 1`;
    const row = db.prepare(sql).get(...values);
    
    return row ? new User(row) : null;
  }

  static find(query) {
    const db = getDB();
    let sql = 'SELECT * FROM users';
    const values = [];

    if (query && Object.keys(query).length > 0) {
      const conditions = [];
      Object.entries(query).forEach(([key, value]) => {
        conditions.push(`${key} = ?`);
        values.push(value);
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const rows = db.prepare(sql).all(...values);
    return rows.map(row => new User(row));
  }

  async save() {
    const db = getDB();
    
    const data = {
      telegramId: this.telegramId,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      createdAt: this.createdAt.getTime(),
      lastInteraction: this.lastInteraction.getTime(),
      commandCount: this.commandCount,
      wallet: this.wallet,
      bank: this.bank,
      loan: this.loan,
      lastDailyWork: this.lastDailyWork ? this.lastDailyWork.getTime() : null,
      xp: this.xp,
      currentXP: this.currentXP,
      requiredXP: this.requiredXP,
      level: this.level,
      rank: this.rank,
      achievements: JSON.stringify(this.achievements),
      inventory: JSON.stringify(this.inventory),
      isPremium: this.isPremium ? 1 : 0,
      premiumExpires: this.premiumExpires ? this.premiumExpires.getTime() : null,
      ban: this.ban ? 1 : 0,
      banReason: this.banReason,
      language: this.language,
      referrer: this.referrer,
      referrals: JSON.stringify(this.referrals),
      settings: JSON.stringify(this.settings),
      cooldowns: JSON.stringify(this.cooldowns),
      lastActiveGroup: this.lastActiveGroup
    };

    if (this.id) {
      const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data), this.id];
      db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...values);
    } else {
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const result = db.prepare(`INSERT INTO users (${fields}) VALUES (${placeholders})`).run(...Object.values(data));
      this.id = result.lastInsertRowid;
    }
    
    return this;
  }

  async updateOne(updates) {
    const db = getDB();
    
    if (updates.$inc) {
      Object.entries(updates.$inc).forEach(([key, value]) => {
        this[key] = (this[key] || 0) + value;
      });
      delete updates.$inc;
    }

    Object.entries(updates).forEach(([key, value]) => {
      this[key] = value;
    });

    await this.save();
  }

  sort(criteria) {
    return {
      limit: (limit) => {
        const db = getDB();
        const orderBy = Object.entries(criteria).map(([key, order]) => 
          `${key} ${order === 1 ? 'ASC' : 'DESC'}`
        ).join(', ');
        
        const rows = db.prepare(`SELECT * FROM users ORDER BY ${orderBy} LIMIT ?`).all(limit);
        return rows.map(row => new User(row));
      }
    };
  }
}

module.exports = User;
