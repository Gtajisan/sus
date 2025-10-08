const Database = require('better-sqlite3');
const path = require('path');

const database = {
  type: 'sqlite',
  path: process.env.SQLITE_DB_PATH || path.join(__dirname, '../../data/bot.db')
};

let db = null;

const connectDB = () => {
  try {
    const dbPath = database.path;
    
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegramId TEXT UNIQUE NOT NULL,
        username TEXT,
        firstName TEXT,
        lastName TEXT,
        createdAt INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        lastInteraction INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        commandCount INTEGER DEFAULT 0,
        wallet INTEGER DEFAULT 0,
        bank INTEGER DEFAULT 0,
        loan INTEGER DEFAULT 0,
        lastDailyWork INTEGER,
        xp INTEGER DEFAULT 0,
        currentXP INTEGER DEFAULT 0,
        requiredXP INTEGER DEFAULT 100,
        level INTEGER DEFAULT 1,
        rank INTEGER DEFAULT 0,
        achievements TEXT DEFAULT '[]',
        inventory TEXT DEFAULT '[]',
        isPremium INTEGER DEFAULT 0,
        premiumExpires INTEGER,
        ban INTEGER DEFAULT 0,
        banReason TEXT,
        language TEXT DEFAULT 'en',
        referrer TEXT,
        referrals TEXT DEFAULT '[]',
        settings TEXT DEFAULT '{}',
        cooldowns TEXT DEFAULT '{}',
        lastActiveGroup TEXT
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        groupId TEXT UNIQUE NOT NULL,
        prefix TEXT DEFAULT '/',
        createdAt INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);
    
    console.log(`${database.type.toUpperCase()} database connected at ${dbPath}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) {
    connectDB();
  }
  return db;
};

const getConfig = () => database;

module.exports = { connectDB, getDB, getConfig, database };
