const winston = require('winston');
const chalk = require('chalk');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
   
      const gradientColors = [
        chalk.hex('#00B7EB'),
        chalk.hex('#1E90FF'), 
        chalk.hex('#4169E1'), 
      ];
      const coloredMessage = gradientColors[Math.floor(Math.random() * gradientColors.length)](message);

      let logMessage = `
╔════════════════════════════╗
║ ${level.toUpperCase()} - ${timestamp} ║
╚════════════════════════════╝
Message: ${coloredMessage}
`;
      if (meta.chatId) {
        logMessage += `Chat ID: ${meta.chatId}\n`;
        logMessage += `Message Type: ${meta.isGroup ? 'Group' : 'Private'}\n`;
        logMessage += `Message Time: ${new Date().toLocaleString()}\n`;
        logMessage += `Content Type: ${meta.text ? 'Text' : 'Media'}\n`;
        if (meta.text) {
          logMessage += `Text: ${meta.text}\n`;
        } else if (meta.mediaUrl) {
          logMessage += `Media URL: ${meta.mediaUrl}\n`;
        }
      }
      if (meta.url) {
        logMessage += `API URL: ${meta.url}\n`;
      }
      if (meta.status) {
        logMessage += `API Status: ${meta.status}\n`;
        if (meta.contentType) {
          logMessage += `Content Type: ${meta.contentType}\n`;
        }
      }
      if (meta.command) {
        logMessage += `Command: ${meta.command}\n`;
        logMessage += `Prefix: ${meta.prefix}\n`;
      }
      if (meta.author) {
        logMessage += `Author: ${meta.author}\n`;
        logMessage += `GitHub: ${meta.github}\n`;
      }
      if (meta.event) {
        logMessage += `Event: ${meta.event}\n`;
      }
      if (meta.error) {
        logMessage += `Error: ${meta.error}\n`;
      }
      logMessage += '════════════════════════════';
      return logMessage;
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console(),
  ],
});

module.exports = logger;