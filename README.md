# Axiom Discord AI Bot

[![Invite Axiom](https://img.shields.io/badge/Invite_Axiom-Add_to_Server-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/api/oauth2/authorize?client_id=1459077260941197435&permissions=274877958144&scope=bot%20applications.commands)

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Groq](https://img.shields.io/badge/Groq-Llama_4-F55036?style=for-the-badge&logo=meta&logoColor=white)](https://groq.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-green?style=for-the-badge)](package.json)

A production-ready Discord bot powered by:

- **Groq AI** (Llama 4 Scout) - Fast, intelligent responses
- **OCR.space** - Extract text from images
- **Google TTS** - Text-to-speech audio generation
- **Express.js** - Health check server for hosting platforms

---

## Created By

**Mithun Gowda B** & **Naren V**

### NextGenXplorrers Team

[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/nexgenxplorerr)
[![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtube.com/@nexgenxplorer)
[![Play Store](https://img.shields.io/badge/Play_Store-414141?style=for-the-badge&logo=google-play&logoColor=white)](https://play.google.com/store/apps/dev?id=8262374975871504599)
[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nxgextra@gmail.com)

---

## Features

| Feature             | Description                             |
| ------------------- | --------------------------------------- |
| **AI Chat**         | Ask anything using Groq's Llama 4 Scout |
| **Image OCR**       | Extract and analyze text from images    |
| **Text-to-Speech**  | Convert text to audio messages          |
| **Reply Context**   | Understands referenced messages         |
| **Slash Commands**  | Modern Discord slash command support    |
| **Prefix Commands** | Classic `!command` style support        |
| **@Mention**        | Respond when mentioned                  |
| **Fun Commands**    | Jokes, facts, quotes, roasts & more     |

---

## Commands

### Slash Commands (/)

| Command                  | Description              |
| ------------------------ | ------------------------ |
| `/ask <question>`        | Ask the AI anything      |
| `/speak <text>`          | Convert text to speech   |
| `/summarize <text>`      | Summarize text           |
| `/translate <text> <to>` | Translate text           |
| `/eli5 <topic>`          | Explain Like I'm 5       |
| `/define <word>`         | Define a word            |
| `/joke`                  | Tell a joke              |
| `/fact`                  | Share a random fact      |
| `/quote`                 | Share an inspiring quote |
| `/roast @user`           | Playful roast            |
| `/advice <topic>`        | Get advice               |
| `/code <code>`           | Review code              |
| `/story <prompt>`        | Generate a story         |
| `/help`                  | Show all commands        |
| `/about`                 | About Axiom & creators   |

### Prefix Commands (!)

All slash commands also work with `!` prefix:
`!ask`, `!speak`, `!joke`, `!fact`, `!about`, etc.

### Other Ways to Use

- **@mention** the bot with a question
- **Reply** to any message and @mention the bot
- **Attach an image** for OCR analysis

---

## Quick Start

```bash
# Navigate to project
cd ~/Axiom

# Install dependencies
npm install

# Start the bot
npm start

# Or with auto-reload for development
npm run dev
```

---

## Project Structure

```
Axiom/
├── index.js          # Main bot code
├── package.json      # Dependencies & scripts
├── .env              # Your API keys (DO NOT SHARE)
├── .env.example      # Template for API keys
├── .gitignore        # Files to exclude from git
└── README.md         # This file
```

---

## Configuration

Create a `.env` file with:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_APP_ID=your_discord_application_id_here

# Groq API (for AI chat)
GROQ_API_KEY=your_groq_api_key_here

# OCR.space API (for image text extraction)
OCR_API_KEY=your_ocr_space_api_key_here

# Express Server Port
PORT=3000
```

### Where to get API keys:

| Service     | URL                                         |
| ----------- | ------------------------------------------- |
| Discord Bot | https://discord.com/developers/applications |
| Groq API    | https://console.groq.com/keys               |
| OCR.space   | https://ocr.space/ocrapi                    |

---

## Discord Bot Setup

### 1. Enable Message Content Intent

**IMPORTANT:** You must enable the Message Content Intent:

1. Go to https://discord.com/developers/applications
2. Select your application
3. Click "Bot" in the left sidebar
4. Scroll to "Privileged Gateway Intents"
5. Enable **MESSAGE CONTENT INTENT** ✅
6. Click "Save Changes"

### 2. Invite Bot to Server

**[Click here to invite Axiom to your server](https://discord.com/api/oauth2/authorize?client_id=1459077260941197435&permissions=274877958144&scope=bot%20applications.commands)**

Or use this URL:

```
https://discord.com/api/oauth2/authorize?client_id=1459077260941197435&permissions=274877958144&scope=bot%20applications.commands
```

Permissions included:

- Send Messages
- Read Message History
- Attach Files
- Embed Links
- Use Slash Commands

---

## Hosting

### Run on Termux (Android) - Free Forever

```bash
# Install tmux
pkg install tmux

# Start session
tmux new -s axiom

# Run bot
cd ~/Axiom && npm start

# Detach: Ctrl+B, then D
# Reattach: tmux attach -t axiom

# Prevent Android from killing it
termux-wake-lock
```

### Cloud Hosting (Render - Recommended)

1. Go to [render.com](https://render.com)
2. Sign up with **GitHub**
3. Click **New** → **Web Service**
4. Connect your `Axiom` repo
5. Configure:
   | Setting | Value |
   |---------|-------|
   | Name | `axiom-bot` |
   | Runtime | `Node` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |

6. Add **Environment Variables**:

   ```
   DISCORD_TOKEN = your_discord_token
   DISCORD_APP_ID = your_app_id
   GROQ_API_KEY = your_groq_key
   OCR_API_KEY = your_ocr_key
   PORT = 3000
   APP_URL = https://your-app.onrender.com
   ```

7. Click **Create Web Service**

**Auto Keep-Alive:** The bot pings itself every 14 minutes to prevent Render's free tier from sleeping.

### Other Free Platforms

- **Koyeb** - Free tier, no credit card
- **Glitch** - Free, import from GitHub
- **Adaptable.io** - Free Node.js hosting

### Health Check Endpoints

- `GET /` - Returns "Axiom Bot is running"
- `GET /health` - Returns JSON status with uptime

---

## API Limits

| Service    | Free Tier Limit                     |
| ---------- | ----------------------------------- |
| Groq API   | Generous free tier with rate limits |
| OCR.space  | 25,000 requests/month               |
| Discord    | Standard bot rate limits            |
| Google TTS | Unlimited (fair use)                |

---

## Tech Stack

- **Runtime:** Node.js 18+ (ES Modules)
- **Discord:** discord.js v14
- **AI Model:** meta-llama/llama-4-scout-17b-16e-instruct
- **TTS:** Google Translate TTS
- **OCR:** OCR.space Engine 2
- **Server:** Express.js

---

## Troubleshooting

### Bot Not Responding

1. Check MESSAGE CONTENT INTENT is enabled
2. Verify bot has permissions in the channel
3. Check console for error messages

### "Invalid Token" Error

1. Go to Discord Developer Portal
2. Bot section → Reset Token
3. Update `.env` with new token

### OCR Not Working

1. Check OCR_API_KEY is correct
2. Image must be < 1MB for free tier
3. Image must contain readable text

---

## License

**Proprietary License** - All Rights Reserved

Copyright (c) 2025 **Mithun Gowda B**, **Naren V** & **NextGenXplorrers Team**

- No commercial use
- No modification or redistribution
- No trademark rights
- Personal/educational use only

See [LICENSE](LICENSE) for full terms.

## Contributing

Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Security

For security concerns, please see our [Security Policy](SECURITY.md).

---

<p align="center">
  <b>Made with ❤️ by NextGenXplorrers Team</b><br>
  <a href="https://www.instagram.com/nexgenxplorerr">Instagram</a> •
  <a href="https://youtube.com/@nexgenxplorer">YouTube</a> •
  <a href="https://play.google.com/store/apps/dev?id=8262374975871504599">Play Store</a> •
  <a href="mailto:nxgextra@gmail.com">Email</a>
</p>
