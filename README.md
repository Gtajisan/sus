
# Sus-Apis Telegram Bot
![SUS BOT Banner](https://raw.githubusercontent.com/1dev-hridoy/1dev-hridoy/refs/heads/main/Will%20Come%20True.png)
<div align="center"> <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"> <img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram"> <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite"> <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License"> </div>

A feature-rich Telegram bot built with Node.js, offering moderation tools, economy system, entertainment commands, and utility features. Powered by the [Sus-Apis](https://sus-apis.onrender.com/) external API for enhanced functionality.

## ✨ Features

### 🛡️ Moderation

-   **User Management**: Ban/unban users with reason tracking
-   **Prefix Control**: Customizable command prefixes per server
-   **Admin Controls**: Role-based permission system
-   **Message Filtering**: Automated content moderation

### 💰 Economy System

-   **Balance Management**: Check, deposit, and withdraw virtual currency
-   **Work Commands**: Earn money through various activities
-   **Shopping System**: Purchase items from the bot store
-   **Transaction History**: Track all economic activities

### 🎮 Entertainment

-   **Interactive Games**: Country guessing games with scoring
-   **Music Integration**: YouTube audio playback capabilities
-   **Dad Jokes**: Endless supply of family-friendly humor
-   **Memes**: Random meme generation and sharing
-   **Color Generator**: Create beautiful color palettes


### 🔧 Utility Tools

-   **QR Code Generation**: Create custom QR codes instantly
-   **File Operations**: Upload, download, and manage files
-   **API Integration**: Seamless external API connectivity
-   **Canvas Support**: Image manipulation and creation

## 🚀 Quick Start

### Prerequisites

-   Node.js 16.x or higher
-   SQLite (included with better-sqlite3 package)
-   Telegram Bot Token from [@BotFather](https://t.me/BotFather)

### Installation

1.  **Clone the Repository**
    
    ```bash
    git clone https://github.com/1dev-hridoy/Sus-Apis.git
    cd Sus-Apis
    
    ```
    
2.  **Install Dependencies**
    
    ```bash
    npm install
    
    ```
    
3.  **Environment Setup**
    
    Create a `.env` file and configure:
    
    ```env
    TELEGRAM_BOT_TOKEN=your_bot_token_here
    SQLITE_DB_PATH=./data/bot.db
    
    ```
    
4.  **Configure Bot Settings**
    
    Update `src/config/settings.json`:
    
    ```json
    {
      "botName": "Sus-Apis Bot",
      "ownerName": "Your Name",
      "ownerUid": "your_telegram_user_id",
      "admins": ["admin_user_id_1", "admin_user_id_2"],
      "botPrefix": "!",
      "botLanguage": "en"
    }
    
    ```
    
5.  **Launch the Bot**
    
    ```bash
    npm start
    
    ```
    

## 📋 Command Examples

### Basic Commands

-   `!help` - Display all available commands
-   `!ping` - Check bot response time
-   `!info` - Get bot information

### Economy Commands

-   `!balance` - Check your current balance
-   `!work` - Earn money through work
-   `!shop` - Browse the bot store
-   `!transfer @user amount` - Send money to another user

### Entertainment Commands

-   `!guess-country` - Start a country guessing game
-   `!joke` - Get a random dad joke
-   `!meme` - Generate a random meme
-   `!color` - Generate a random color palette

### Utility Commands

-   `!qr text` - Generate QR code
-   `!play song_name` - Play music from YouTube
-   `!weather city` - Get weather information

## 🏗️ Project Structure

```
Sus-Apis/
├── 📁 bin/                    # Binary files
├── 📁 src/                    # Source code
│   ├── 📄 bot.js             # Main bot logic
│   ├── 📄 index.js           # Entry point
│   ├── 📁 assets/            # Static assets
│   ├── 📁 caches/            # Cache files
│   ├── 📁 config/            # Configuration files
│   │   ├── 📄 settings.json  # Bot settings
│   │   └── 📄 db.js         # Database configuration
│   ├── 📁 models/            # Database models
│   ├── 📁 scripts/           # Command and event handlers
│   │   ├── 📁 commands/      # Bot commands
│   │   └── 📁 events/        # Event listeners
│   ├── 📁 temp/              # Temporary files
│   ├── 📁 tmp/               # Temporary storage
│   └── 📁 utils/             # Utility functions
├── 📄 package.json           # Dependencies
├── 📄 README.md             # Documentation
└── 📄 .env                  # Environment variables

```

## 🛠️ Creating Custom Commands

### Step 1: Create Command File

Create a new file in `src/scripts/commands/` directory:

```javascript
// src/scripts/commands/example.js
const User = require('../../models/User');

module.exports = {
  name: "example",
  description: "Example command that greets the user",
  category: "Fun",
  usePrefix: true,
  cooldown: 3000, // 3 seconds cooldown
  
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageId = msg.message_id;
    const userName = msg.from.first_name;

    try {
      // Find or create user
      let user = await User.findOne({ telegramId: userId });
      if (!user) {
        user = new User({
          telegramId: userId,
          username: msg.from.username,
          firstName: msg.from.first_name,
          lastName: msg.from.last_name,
        });
      }

      // Update user statistics
      await user.updateOne({ 
        lastInteraction: new Date(), 
        $inc: { commandCount: 1 } 
      });
      await user.save();

      // Send response
      await bot.sendMessage(chatId, `Hello, ${userName}! 🎉\nThanks for using the example command!`, {
        reply_to_message_id: messageId,
        parse_mode: 'HTML'
      });

    } catch (error) {
      console.error('Example command error:', error.message);
      await bot.sendMessage(chatId, '❌ Something went wrong. Please try again!', {
        reply_to_message_id: messageId
      });
    }
  }
};

```

### Step 2: Test Your Command

-   Restart the bot: `npm start`
-   Use the command: `!example`
-   Check for any errors in the console

## 🔧 API Integration

The bot integrates with the Sus-Apis external service for enhanced functionality:

```javascript
const axios = require('axios');

// Example API call
const response = await axios.get('https://sus-apis.onrender.com/api/random-color');
const colorData = response.data;

```

## 📊 Database Schema

### User Model

```javascript
{
  telegramId: String,
  username: String,
  firstName: String,
  lastName: String,
  balance: Number,
  lastInteraction: Date,
  commandCount: Number,
  joinDate: Date
}

```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1.  **Fork the Repository**
2.  **Create a Feature Branch**
    
    ```bash
    git checkout -b feature/amazing-feature
    
    ```
    
3.  **Commit Your Changes**
    
    ```bash
    git commit -m 'Add amazing feature'
    
    ```
    
4.  **Push to Branch**
    
    ```bash
    git push origin feature/amazing-feature
    
    ```
    
5.  **Open a Pull Request**

### Development Guidelines

-   Follow existing code style
-   Add tests for new features
-   Update documentation
-   Test thoroughly before submitting

## 💬 Need Help?

If you need any help or support, feel free to join our Telegram group.  
We’re active, friendly, and ready to assist you anytime 😎

[![Join Telegram](https://img.shields.io/badge/Join-Our%20Support%20Group-blue?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/sus_support)


## 📝 License

This project is licensed under the ISC License - see the [LICENSE](https://github.com/1dev-hridoy/Sus-Apis/tree/main?tab=MIT-1-ov-file) file for details.

## 🙏 Acknowledgments

-   [Sus-Apis](https://sus-apis.onrender.com/) for providing the external API
-   [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) for Telegram integration
-   All contributors who help improve this project

## 📞 Support

-   **Telegram Chat**: [Telegram](https://t.me/sus_support)
-   **Issues**: [GitHub Issues](https://github.com/1dev-hridoy/Sus-Apis/issues)
-   **Discussions**: [GitHub Discussions](https://github.com/1dev-hridoy/Sus-Apis/discussions)
-   **Developer**: [@1dev-hridoy](https://github.com/1dev-hridoy)

----------

<div align="center"> <p>Made with ❤️ by 1dev-hridoy</p> <p>⭐ Star this repository if you find it helpful!</p> </div>