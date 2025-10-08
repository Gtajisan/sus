require('dotenv').config();
const { connectDB } = require('./config/db');
const Bot = require('./bot');

const start = async () => {
  try {
    connectDB();
  
    console.log('Starting bot...');
    const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
    bot.start();
    const restartCmd = require('./scripts/commands/restart.js');
    restartCmd.notifyOnRestart(bot.bot); 
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
};

start();
