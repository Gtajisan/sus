const { getDB } = require('../config/db');

class Group {
  constructor(data) {
    this.id = data.id;
    this.groupId = data.groupId;
    this.prefix = data.prefix || '/';
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
  }

  static findOne(query) {
    const db = getDB();
    const conditions = [];
    const values = [];

    Object.entries(query).forEach(([key, value]) => {
      conditions.push(`${key} = ?`);
      values.push(value);
    });

    const sql = `SELECT * FROM groups WHERE ${conditions.join(' AND ')} LIMIT 1`;
    const row = db.prepare(sql).get(...values);
    
    return row ? new Group(row) : null;
  }

  static find(query) {
    const db = getDB();
    let sql = 'SELECT * FROM groups';
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
    return rows.map(row => new Group(row));
  }

  async save() {
    const db = getDB();
    
    const data = {
      groupId: this.groupId,
      prefix: this.prefix,
      createdAt: this.createdAt.getTime()
    };

    if (this.id) {
      const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data), this.id];
      db.prepare(`UPDATE groups SET ${fields} WHERE id = ?`).run(...values);
    } else {
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const result = db.prepare(`INSERT INTO groups (${fields}) VALUES (${placeholders})`).run(...Object.values(data));
      this.id = result.lastInsertRowid;
    }
    
    return this;
  }
}

module.exports = Group;
