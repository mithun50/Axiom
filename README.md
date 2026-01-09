# Axiom Discord AI Bot

[![Invite Axiom](https://img.shields.io/badge/Invite_Axiom-Add_to_Server-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/api/oauth2/authorize?client_id=1459077260941197435&permissions=274877958144&scope=bot%20applications.commands)
[![Live Preview](https://img.shields.io/badge/Live_Preview-View_Website-6366F1?style=for-the-badge&logo=github&logoColor=white)](https://mithun50.github.io/Axiom/)

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Groq](https://img.shields.io/badge/Groq-Llama_4-F55036?style=for-the-badge&logo=meta&logoColor=white)](https://groq.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.1.0-green?style=for-the-badge)](package.json)

A production-ready Discord bot powered by:

- **Groq AI** (Llama 4 Scout) - Fast, intelligent responses
- **Groq Whisper** - Voice transcription (speech-to-text)
- **OCR.space** - Extract text from images
- **Google TTS** - Text-to-speech audio generation
- **Discord DAVE** - End-to-end voice encryption support
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

| Feature                  | Description                                    |
| ------------------------ | ---------------------------------------------- |
| **AI Chat**              | Ask anything using Groq's Llama 4 Scout        |
| **Voice Conversations**  | Talk to the bot in voice channels              |
| **Speech-to-Text**       | Bot listens and transcribes using Whisper      |
| **Text-to-Speech**       | Bot speaks responses in voice channels         |
| **Multi-User Support**   | Multiple users can interact simultaneously     |
| **Response Queue**       | Questions queued while bot is speaking         |
| **Image OCR**            | Extract and analyze text from images           |
| **Reply Context**        | Understands referenced messages                |
| **Slash Commands**       | Modern Discord slash command support           |
| **Prefix Commands**      | Classic `!command` style support               |
| **@Mention**             | Respond when mentioned                         |
| **Auto-Leave**           | Automatically leaves empty voice channels      |
| **Multi-Server**         | Works across multiple Discord servers          |
| **Fun Commands**         | Jokes, facts, quotes, roasts & more            |

---

## Commands

### Slash Commands (/)

| Command                  | Description                    |
| ------------------------ | ------------------------------ |
| `/ask <question>`        | Ask the AI anything            |
| `/speak <text>`          | Convert text to speech         |
| `/summarize <text>`      | Summarize text                 |
| `/translate <text> <to>` | Translate text                 |
| `/eli5 <topic>`          | Explain Like I'm 5             |
| `/define <word>`         | Define a word                  |
| `/joke`                  | Tell a joke                    |
| `/fact`                  | Share a random fact            |
| `/quote`                 | Share an inspiring quote       |
| `/roast @user`           | Playful roast                  |
| `/advice <topic>`        | Get advice                     |
| `/code <code>`           | Review code                    |
| `/story <prompt>`        | Generate a story               |
| `/help`                  | Show all commands              |
| `/about`                 | About Axiom & creators         |

### Voice Commands (/)

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `/join`            | Join your voice channel                  |
| `/leave`           | Leave the voice channel                  |
| `/say <text>`      | Speak text in voice channel              |
| `/talk <question>` | Ask AI and hear the response in voice    |

### Prefix Commands (!)

All slash commands also work with `!` prefix:
`!ask`, `!speak`, `!joke`, `!fact`, `!join`, `!leave`, etc.

### Other Ways to Use

- **@mention** the bot with a question
- **Reply** to any message and @mention the bot
- **Attach an image** for OCR analysis
- **Talk in voice channel** - Bot responds to conversational speech

---

## Voice Channel Features

### How Voice Works

1. Use `/join` to invite the bot to your voice channel
2. The bot will greet you with "Hello! I'm Axiom..."
3. **Just talk naturally** - the bot responds to:
   - Questions ("Who created you?", "What's the weather?")
   - Direct speech ("Tell me a joke", "Can you help me?")
   - Wake words ("Hey Axiom", "Hi bot")
4. Bot transcribes your speech → Generates AI response → Speaks it back
5. Bot **auto-leaves** when everyone leaves the channel (after 10 seconds)

### Conversational Triggers

The bot responds when you say:

| Pattern               | Examples                                    |
| --------------------- | ------------------------------------------- |
| Questions with "you"  | "Who are you?", "What can you do?"          |
| Questions (?)         | Any sentence ending with a question mark    |
| "Can/will/do you"     | "Can you help?", "Will you tell me?"        |
| "Tell me"             | "Tell me a joke", "Tell me about space"     |
| "What/why/how/where"  | "What is AI?", "Why is the sky blue?"       |
| Wake words            | "Hey", "Hi", "Hello", "Axiom", "Bot"        |

### Multi-User & Queue System

The bot handles multiple users and concurrent requests intelligently:

| Scenario | Handling |
| -------- | -------- |
| Multiple users in voice | All users can speak, responses queued |
| Text + Voice simultaneously | Both processed in parallel |
| Question while bot speaking | Queued and answered after current response |
| Multiple servers | Each server has independent voice session |
| Rapid questions (5+) | Queue limit prevents spam, oldest dropped |

**How the Queue Works:**
```
User asks question while bot is speaking
         ↓
🎤 Voice: "What is 2+2?" (queued)
         ↓
Bot finishes current response
         ↓
📝 Processing queued question...
         ↓
🔊 Bot responds to queued question
```

### Voice Requirements

The bot needs these permissions for voice:
- Connect to Voice Channels
- Speak in Voice Channels
- Use Voice Activity

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
├── docs/             # GitHub Pages website
└── README.md         # This file
```

---

## Configuration

Create a `.env` file with:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_APP_ID=your_discord_application_id_here

# Groq API (for AI chat & voice transcription)
GROQ_API_KEY=your_groq_api_key_here

# OCR.space API (for image text extraction)
OCR_API_KEY=your_ocr_space_api_key_here

# Express Server Port
PORT=3000

# Keep-alive URL (for free hosting platforms)
APP_URL=https://your-app.onrender.com
```

### Where to get API keys:

| Service     | URL                                         |
| ----------- | ------------------------------------------- |
| Discord Bot | https://discord.com/developers/applications |
| Groq API    | https://console.groq.com/keys               |
| OCR.space   | https://ocr.space/ocrapi                    |

---

## Discord Bot Setup

### 1. Enable Required Intents

**IMPORTANT:** You must enable these intents:

1. Go to https://discord.com/developers/applications
2. Select your application
3. Click "Bot" in the left sidebar
4. Scroll to "Privileged Gateway Intents"
5. Enable:
   - **MESSAGE CONTENT INTENT** ✅
   - **SERVER MEMBERS INTENT** ✅ (for voice features)
6. Click "Save Changes"

### 2. Bot Permissions

Required permissions for full functionality:

| Permission           | Required For           |
| -------------------- | ---------------------- |
| Send Messages        | Text responses         |
| Read Message History | Reply context          |
| Attach Files         | TTS audio files        |
| Embed Links          | Rich embeds            |
| Use Slash Commands   | Slash command support  |
| Connect              | Join voice channels    |
| Speak                | Voice TTS playback     |
| Use Voice Activity   | Voice listening        |

### 3. Invite Bot to Server

Use this URL format:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&permissions=3214336&scope=bot%20applications.commands
```

---

## Hosting

### Run on Termux (Android) - Free Forever

```bash
# Install required packages
pkg install tmux ffmpeg

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

   | Setting       | Value         |
   | ------------- | ------------- |
   | Name          | `axiom-bot`   |
   | Runtime       | `Node`        |
   | Build Command | `npm install` |
   | Start Command | `npm start`   |

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

**Note:** FFmpeg is pre-installed on Render, Railway, Koyeb, and most cloud platforms.

**Auto Keep-Alive:** The bot pings itself every 14 minutes to prevent Render's free tier from sleeping.

### Other Free Platforms

| Platform      | FFmpeg | Notes                    |
| ------------- | ------ | ------------------------ |
| Render.com    | ✅     | Recommended, easy setup  |
| Railway.app   | ✅     | Good free tier           |
| Koyeb         | ✅     | No credit card required  |
| Glitch        | ✅     | Import from GitHub       |
| Fly.io        | ✅     | Generous free tier       |

### Health Check Endpoints

- `GET /` - Returns "Axiom Bot is running"
- `GET /health` - Returns JSON status with uptime and guild count

---

## Dependencies

### Core Dependencies

| Package              | Version  | Purpose                        |
| -------------------- | -------- | ------------------------------ |
| discord.js           | ^14.16.3 | Discord API client             |
| @discordjs/voice     | ^0.19.x  | Voice channel support          |
| groq-sdk             | ^0.8.0   | AI chat & voice transcription  |
| express              | ^4.21.0  | Health check server            |

### Voice Dependencies

| Package              | Version  | Purpose                        |
| -------------------- | -------- | ------------------------------ |
| @snazzah/davey       | ^0.1.9   | Discord DAVE encryption        |
| sodium-native        | ^5.x     | Voice encryption modes         |
| prism-media          | ^1.3.5   | Audio codec handling           |
| opusscript           | ^0.1.1   | Opus audio codec               |

---

## API Limits

| Service       | Free Tier Limit                     |
| ------------- | ----------------------------------- |
| Groq API      | Generous free tier with rate limits |
| Groq Whisper  | Included with Groq API              |
| OCR.space     | 25,000 requests/month               |
| Discord       | Standard bot rate limits            |
| Google TTS    | Unlimited (fair use)                |

---

## Tech Stack

- **Runtime:** Node.js 18+ (ES Modules)
- **Discord:** discord.js v14 + @discordjs/voice
- **AI Model:** meta-llama/llama-4-scout-17b-16e-instruct
- **Voice Transcription:** Groq Whisper (whisper-large-v3-turbo)
- **TTS:** Google Translate TTS
- **OCR:** OCR.space Engine 2
- **Voice Encryption:** DAVE protocol (@snazzah/davey)
- **Server:** Express.js

---

## Troubleshooting

### Bot Not Responding to Text

1. Check MESSAGE CONTENT INTENT is enabled
2. Verify bot has permissions in the channel
3. Check console for error messages

### Bot Not Joining Voice Channel

1. Ensure bot has Connect and Speak permissions
2. Check if you're in a voice channel when using `/join`
3. Verify SERVER MEMBERS INTENT is enabled

### Voice Listening Not Working

1. This may be due to Discord's DAVE encryption
2. Check console for "Audio stream error" messages
3. Text commands (`/ask`, `/talk`) still work as fallback

### "Invalid Token" Error

1. Go to Discord Developer Portal
2. Bot section → Reset Token
3. Update `.env` with new token

### OCR Not Working

1. Check OCR_API_KEY is correct
2. Image must be < 1MB for free tier
3. Image must contain readable text

### Voice Encryption Errors

If you see encryption-related errors:
```bash
# Reinstall voice dependencies
npm install @discordjs/voice@latest @snazzah/davey sodium-native
```

---

## Changelog

### v1.1.0 (Latest)
- Added voice channel support (join, leave, say, talk)
- Added voice listening with Groq Whisper transcription
- Added conversational AI triggers (responds to natural speech)
- Added auto-leave when voice channel is empty
- Added DAVE protocol support for Discord's new encryption
- Added multi-user voice support (multiple users can speak)
- Added response queue system (no questions lost while bot speaking)
- Added parallel text + voice processing
- Added multi-server support with independent sessions
- Improved wake word detection with more patterns
- Added timeout handling for voice listeners
- Queue limit (5) to prevent spam

### v1.0.0
- Initial release
- Text commands and slash commands
- Image OCR support
- Text-to-speech responses

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
