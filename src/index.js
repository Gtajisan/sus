require('dotenv').config();
const { connectDB } = require('./config/db');
const Bot = require('./bot');

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

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
    setTimeout(() => {
      console.log('Attempting to restart bot...');
      start();
    }, 5000);
  }
};

start();
