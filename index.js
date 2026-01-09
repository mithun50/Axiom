// =============================================================================
// Axiom Discord AI Bot - Advanced Edition
// Features: Groq AI, OCR, TTS, Slash Commands, Mentions, Reply Context
// =============================================================================

import 'dotenv/config';
import express from 'express';
import Groq from 'groq-sdk';
import {
  Client,
  GatewayIntentBits,
  Partials,
  AttachmentBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  // Discord
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  DISCORD_APP_ID: process.env.DISCORD_APP_ID,

  // Groq API
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_CHAT_MODEL: 'meta-llama/llama-4-scout-17b-16e-instruct',

  // TTS Settings
  TTS_LANGUAGE: 'en',
  TTS_SPEED: 1.0,
  TTS_WITH_AI: true,

  // OCR.space API
  OCR_API_KEY: process.env.OCR_API_KEY,
  OCR_API_URL: 'https://api.ocr.space/parse/image',

  // Express
  PORT: process.env.PORT || 3000,

  // Bot settings
  COMMAND_PREFIX: '!',
  MAX_RESPONSE_LENGTH: 1900,
  MAX_TTS_LENGTH: 500,
  ALLOWED_IMAGE_TYPES: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/bmp',
  ],

  // Bot Credits
  CREDITS: {
    creators: ['Mithun Gowda B', 'Naren V'],
    team: 'NextGenXplorrers Team',
    version: '1.0.0',
    socials: {
      instagram: 'https://www.instagram.com/nexgenxplorerr',
      youtube: 'https://youtube.com/@nexgenxplorer',
      playstore: 'https://play.google.com/store/apps/dev?id=8262374975871504599',
      email: 'nxgextra@gmail.com',
    },
  },

  // System prompts for different modes
  PROMPTS: {
    default: `You are Axiom, a helpful AI assistant in Discord. Be concise, friendly, and accurate. Keep responses under 1800 chars.

ABOUT YOUR CREATORS:
- Created by: Mithun Gowda B and Naren V
- Team: NextGenXplorrers Team (NextGenX)
- Instagram: https://www.instagram.com/nexgenxplorerr
- YouTube: https://youtube.com/@nexgenxplorer
- Play Store: https://play.google.com/store/apps/dev?id=8262374975871504599
- Email: nxgextra@gmail.com

When users ask about your creators, team, or who made you, share this information proudly!`,

    eli5: `You are Axiom. Explain the topic like you're talking to a 5-year-old. Use simple words, fun examples, and analogies. Keep it short and fun!`,

    summarize: `You are Axiom. Summarize the given text in 2-3 concise bullet points. Focus on key information only.`,

    translate: `You are Axiom, a translator. Translate the text to the requested language. Only provide the translation, nothing else.`,

    code: `You are Axiom, a code expert. Review the code, explain what it does, identify issues, and suggest improvements. Be concise.`,

    creative: `You are Axiom, a creative writer. Be imaginative, engaging, and fun. Create compelling content.`,

    joke: `You are Axiom, a comedian. Tell a funny, clean joke. Keep it short and witty.`,

    fact: `You are Axiom. Share an interesting, surprising, and true fact. Be educational and engaging.`,

    quote: `You are Axiom. Share an inspiring quote with its author. Add a brief reflection on its meaning.`,

    define: `You are Axiom, a dictionary. Define the word clearly with: 1) Definition 2) Example sentence 3) Synonyms. Keep it concise.`,

    roast: `You are Axiom. Give a playful, funny roast. Keep it light-hearted and not mean-spirited. Be witty!`,

    advice: `You are Axiom, a wise advisor. Give thoughtful, practical advice. Be supportive and constructive.`,
  },
};

// =============================================================================
// Validate Environment Variables
// =============================================================================

const requiredEnvVars = ['DISCORD_TOKEN', 'GROQ_API_KEY', 'OCR_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
}

// =============================================================================
// Initialize Clients
// =============================================================================

const groq = new Groq({ apiKey: CONFIG.GROQ_API_KEY });

const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// =============================================================================
// Express Server
// =============================================================================

const app = express();
app.get('/', (req, res) => res.send('Axiom Bot is running'));
app.get('/health', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    guilds: discordClient.guilds?.cache?.size || 0,
  });
});
app.listen(CONFIG.PORT, () => console.log(`🌐 Express running on port ${CONFIG.PORT}`));

// =============================================================================
// Keep Alive - Auto Ping (for Render/Koyeb free tier)
// =============================================================================

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
if (RENDER_URL) {
  setInterval(
    () => {
      fetch(`${RENDER_URL}/health`)
        .then(() => console.log('🏓 Keep-alive ping sent'))
        .catch(() => {});
    },
    14 * 60 * 1000
  ); // Ping every 14 minutes
}

// =============================================================================
// Slash Commands Definition
// =============================================================================

const slashCommands = [
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask Axiom anything')
    .addStringOption(opt =>
      opt.setName('question').setDescription('Your question').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('speak')
    .setDescription('Convert text to speech')
    .addStringOption(opt => opt.setName('text').setDescription('Text to speak').setRequired(true)),

  new SlashCommandBuilder()
    .setName('summarize')
    .setDescription('Summarize text')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to summarize').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to translate').setRequired(true)
    )
    .addStringOption(opt => opt.setName('to').setDescription('Target language').setRequired(true)),

  new SlashCommandBuilder()
    .setName('eli5')
    .setDescription("Explain Like I'm 5")
    .addStringOption(opt =>
      opt.setName('topic').setDescription('Topic to explain').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('define')
    .setDescription('Define a word')
    .addStringOption(opt => opt.setName('word').setDescription('Word to define').setRequired(true)),

  new SlashCommandBuilder().setName('joke').setDescription('Tell me a joke'),

  new SlashCommandBuilder().setName('fact').setDescription('Share an interesting fact'),

  new SlashCommandBuilder().setName('quote').setDescription('Share an inspiring quote'),

  new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Roast someone (playfully)')
    .addUserOption(opt => opt.setName('user').setDescription('User to roast').setRequired(true)),

  new SlashCommandBuilder()
    .setName('advice')
    .setDescription('Get advice on something')
    .addStringOption(opt =>
      opt.setName('topic').setDescription('What do you need advice on?').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('code')
    .setDescription('Review or explain code')
    .addStringOption(opt => opt.setName('code').setDescription('Code to review').setRequired(true)),

  new SlashCommandBuilder()
    .setName('story')
    .setDescription('Generate a short story')
    .addStringOption(opt => opt.setName('prompt').setDescription('Story prompt').setRequired(true)),

  new SlashCommandBuilder().setName('help').setDescription('Show all commands'),

  new SlashCommandBuilder().setName('about').setDescription('About Axiom and its creators'),
].map(cmd => cmd.toJSON());

// =============================================================================
// Register Slash Commands
// =============================================================================

async function registerSlashCommands() {
  if (!CONFIG.DISCORD_APP_ID) {
    console.log('⚠️ DISCORD_APP_ID not set, skipping slash command registration');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);

  try {
    console.log('📝 Registering slash commands...');
    await rest.put(Routes.applicationCommands(CONFIG.DISCORD_APP_ID), { body: slashCommands });
    console.log('✅ Slash commands registered!');
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error.message);
  }
}

// =============================================================================
// AI Functions
// =============================================================================

async function askAI(prompt, systemPrompt = CONFIG.PROMPTS.default) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    model: CONFIG.GROQ_CHAT_MODEL,
    temperature: 0.7,
    max_tokens: 1024,
  });

  return chatCompletion.choices[0]?.message?.content || 'No response generated.';
}

async function extractTextFromImage(imageUrl) {
  const formData = new URLSearchParams();
  formData.append('apikey', CONFIG.OCR_API_KEY);
  formData.append('url', imageUrl);
  formData.append('language', 'eng');
  formData.append('OCREngine', '2');

  const response = await fetch(CONFIG.OCR_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  const data = await response.json();
  if (data.IsErroredOnProcessing) throw new Error(data.ErrorMessage?.[0] || 'OCR failed');
  return (
    data.ParsedResults?.map(r => r.ParsedText)
      .join('\n')
      .trim() || ''
  );
}

async function textToSpeech(text) {
  const maxChunk = 200;
  const chunks = [];
  let remaining = text.slice(0, CONFIG.MAX_TTS_LENGTH);

  while (remaining.length > 0) {
    if (remaining.length <= maxChunk) {
      chunks.push(remaining);
      break;
    }
    let bp = remaining.lastIndexOf(' ', maxChunk);
    if (bp === -1) bp = maxChunk;
    chunks.push(remaining.slice(0, bp));
    remaining = remaining.slice(bp).trim();
  }

  const buffers = [];
  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${CONFIG.TTS_LANGUAGE}&client=tw-ob&ttsspeed=${CONFIG.TTS_SPEED}&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) throw new Error('TTS failed');
    buffers.push(Buffer.from(await res.arrayBuffer()));
  }
  return Buffer.concat(buffers);
}

function isValidImage(attachment) {
  if (!attachment) return false;
  if (attachment.contentType)
    return CONFIG.ALLOWED_IMAGE_TYPES.includes(attachment.contentType.toLowerCase());
  const ext = attachment.name?.toLowerCase().split('.').pop();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext);
}

function cleanTextForTTS(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .slice(0, CONFIG.MAX_TTS_LENGTH);
}

// =============================================================================
// Get Referenced Message Context
// =============================================================================

async function getReferencedContext(message) {
  if (!message.reference) return null;

  try {
    const refMessage = await message.channel.messages.fetch(message.reference.messageId);
    let context = { text: refMessage.content, image: null, author: refMessage.author.username };

    const img = refMessage.attachments.find(a => isValidImage(a));
    if (img) {
      try {
        context.image = await extractTextFromImage(img.url);
      } catch (e) {
        console.log('Could not extract text from referenced image');
      }
    }
    return context;
  } catch (e) {
    return null;
  }
}

// =============================================================================
// Send Response with Optional TTS
// =============================================================================

async function sendResponse(target, content, withTTS = false) {
  let response = content;
  if (response.length > CONFIG.MAX_RESPONSE_LENGTH) {
    response = response.slice(0, CONFIG.MAX_RESPONSE_LENGTH - 30) + '\n\n*... (truncated)*';
  }

  const payload = { content: response };

  if (withTTS && CONFIG.TTS_WITH_AI) {
    try {
      const audio = await textToSpeech(cleanTextForTTS(response));
      payload.files = [new AttachmentBuilder(audio, { name: 'response.mp3' })];
    } catch (e) {
      console.log('TTS failed, sending text only');
    }
  }

  if (target.reply) {
    await target.reply(payload);
  } else if (target.editReply) {
    await target.editReply(payload);
  } else {
    await target.send(payload);
  }
}

// =============================================================================
// Message Handler (Prefix + Mentions + Replies)
// =============================================================================

async function handleMessage(message) {
  if (message.author.bot) return;

  const botMentioned = message.mentions.has(discordClient.user);
  const content = message.content.replace(/<@!?\d+>/g, '').trim();

  // Check if bot is mentioned or message starts with prefix
  const isCommand = message.content.startsWith(CONFIG.COMMAND_PREFIX);

  if (!botMentioned && !isCommand) return;

  await message.channel.sendTyping();
  const typingInterval = setInterval(() => message.channel.sendTyping().catch(() => {}), 5000);

  try {
    // Get referenced message context if replying to something
    const refContext = await getReferencedContext(message);

    // Get attached image if any
    const imageAtt = message.attachments.find(a => isValidImage(a));
    let imageText = null;
    if (imageAtt) {
      try {
        imageText = await extractTextFromImage(imageAtt.url);
      } catch (e) {
        console.log('Could not extract image text');
      }
    }

    // Build the prompt
    let prompt = '';

    if (refContext) {
      prompt += `[User is replying to a message from ${refContext.author}]\n`;
      if (refContext.text) prompt += `Referenced message: "${refContext.text}"\n`;
      if (refContext.image) prompt += `Text from referenced image: "${refContext.image}"\n`;
      prompt += '\n';
    }

    if (imageText) {
      prompt += `[User attached an image with text: "${imageText}"]\n\n`;
    }

    // Parse command or use content
    let userQuery = content;
    let commandType = 'default';

    if (isCommand) {
      const args = content.slice(CONFIG.COMMAND_PREFIX.length).trim().split(/\s+/);
      const cmd = args.shift()?.toLowerCase();

      switch (cmd) {
        case 'ask':
          userQuery = args.join(' ');
          break;
        case 'speak':
          const ttsText = args.join(' ');
          if (ttsText) {
            const audio = await textToSpeech(ttsText);
            await message.reply({
              content: '🔊',
              files: [new AttachmentBuilder(audio, { name: 'speech.mp3' })],
            });
          }
          return;
        case 'eli5':
          userQuery = args.join(' ');
          commandType = 'eli5';
          break;
        case 'summarize':
          userQuery = args.join(' ') || refContext?.text || '';
          commandType = 'summarize';
          break;
        case 'translate':
          userQuery = args.join(' ');
          commandType = 'translate';
          break;
        case 'joke':
          userQuery = 'Tell me a funny joke';
          commandType = 'joke';
          break;
        case 'fact':
          userQuery = 'Share an interesting fact';
          commandType = 'fact';
          break;
        case 'quote':
          userQuery = 'Share an inspiring quote';
          commandType = 'quote';
          break;
        case 'define':
          userQuery = `Define: ${args.join(' ')}`;
          commandType = 'define';
          break;
        case 'advice':
          userQuery = args.join(' ');
          commandType = 'advice';
          break;
        case 'roast':
          const target = message.mentions.users.first();
          userQuery = `Give a playful roast for someone named ${target?.username || 'this person'}`;
          commandType = 'roast';
          break;
        case 'code':
          userQuery = args.join(' ');
          commandType = 'code';
          break;
        case 'story':
          userQuery = `Write a short story: ${args.join(' ')}`;
          commandType = 'creative';
          break;
        case 'help':
          await message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('🤖 Axiom Commands')
                .setColor(0x5865f2)
                .setDescription(
                  '**Prefix Commands (!)**\n' +
                    '`!ask <question>` - Ask anything\n' +
                    '`!speak <text>` - Text to speech\n' +
                    '`!eli5 <topic>` - Explain simply\n' +
                    '`!summarize <text>` - Summarize\n' +
                    '`!translate <text> to <lang>` - Translate\n' +
                    '`!define <word>` - Define a word\n' +
                    '`!joke` - Tell a joke\n' +
                    '`!fact` - Random fact\n' +
                    '`!quote` - Inspiring quote\n' +
                    '`!advice <topic>` - Get advice\n' +
                    '`!roast @user` - Playful roast\n' +
                    '`!code <code>` - Review code\n' +
                    '`!story <prompt>` - Generate story\n' +
                    '`!about` - About Axiom\n\n' +
                    '**Other Ways to Use**\n' +
                    '• @mention me with a question\n' +
                    '• Reply to any message and @mention me\n' +
                    '• Attach an image for OCR analysis\n' +
                    '• Use slash commands (/ask, /joke, etc.)'
                )
                .setFooter({ text: 'Powered by Groq AI' }),
            ],
          });
          return;
        case 'about':
          await message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('🤖 About Axiom')
                .setColor(0x00d4ff)
                .setDescription(
                  '**Axiom** is an advanced AI-powered Discord bot that brings intelligent conversation, text-to-speech, image analysis, and fun commands to your server!'
                )
                .addFields(
                  {
                    name: '👨‍💻 Created By',
                    value: CONFIG.CREDITS.creators.join('\n'),
                    inline: true,
                  },
                  { name: '🏢 Team', value: CONFIG.CREDITS.team, inline: true },
                  { name: '📦 Version', value: `v${CONFIG.CREDITS.version}`, inline: true },
                  {
                    name: '⚡ Powered By',
                    value:
                      '• **Groq AI** (Llama 4 Scout)\n• **OCR.space** (Image Text)\n• **Google TTS** (Speech)',
                    inline: false,
                  },
                  {
                    name: '✨ Features',
                    value:
                      '• AI Chat & Q&A\n• Text-to-Speech\n• Image OCR Analysis\n• Reply Context Awareness\n• 15+ Slash Commands\n• Fun Commands (jokes, facts, quotes)',
                    inline: false,
                  },
                  {
                    name: '🌐 Connect With Us',
                    value: `📸 [Instagram](${CONFIG.CREDITS.socials.instagram})\n▶️ [YouTube](${CONFIG.CREDITS.socials.youtube})\n📱 [Play Store](${CONFIG.CREDITS.socials.playstore})\n📧 ${CONFIG.CREDITS.socials.email}`,
                    inline: false,
                  }
                )
                .setThumbnail(discordClient.user.displayAvatarURL())
                .setFooter({ text: `Made with ❤️ by ${CONFIG.CREDITS.team}` })
                .setTimestamp(),
            ],
          });
          return;
        default:
          userQuery = content.slice(CONFIG.COMMAND_PREFIX.length).trim();
      }
    }

    prompt += userQuery || 'Hello!';

    if (!prompt.trim()) {
      await message.reply('Please provide a question or attach an image!');
      return;
    }

    const response = await askAI(prompt, CONFIG.PROMPTS[commandType] || CONFIG.PROMPTS.default);
    await sendResponse(message, response, CONFIG.TTS_WITH_AI);
  } catch (error) {
    console.error('Message handler error:', error);
    await message.reply('❌ Something went wrong. Please try again.').catch(() => {});
  } finally {
    clearInterval(typingInterval);
  }
}

// =============================================================================
// Slash Command Handler
// =============================================================================

async function handleSlashCommand(interaction) {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();

  try {
    const cmd = interaction.commandName;
    let response = '';
    let withTTS = CONFIG.TTS_WITH_AI;

    switch (cmd) {
      case 'ask':
        response = await askAI(interaction.options.getString('question'));
        break;

      case 'speak':
        const text = interaction.options.getString('text');
        const audio = await textToSpeech(text);
        await interaction.editReply({
          content: '🔊',
          files: [new AttachmentBuilder(audio, { name: 'speech.mp3' })],
        });
        return;

      case 'summarize':
        response = await askAI(interaction.options.getString('text'), CONFIG.PROMPTS.summarize);
        break;

      case 'translate':
        const toTranslate = interaction.options.getString('text');
        const targetLang = interaction.options.getString('to');
        response = await askAI(
          `Translate to ${targetLang}: "${toTranslate}"`,
          CONFIG.PROMPTS.translate
        );
        break;

      case 'eli5':
        response = await askAI(interaction.options.getString('topic'), CONFIG.PROMPTS.eli5);
        break;

      case 'define':
        response = await askAI(
          `Define: ${interaction.options.getString('word')}`,
          CONFIG.PROMPTS.define
        );
        break;

      case 'joke':
        response = await askAI('Tell me a funny joke', CONFIG.PROMPTS.joke);
        break;

      case 'fact':
        response = await askAI('Share an interesting fact', CONFIG.PROMPTS.fact);
        break;

      case 'quote':
        response = await askAI('Share an inspiring quote', CONFIG.PROMPTS.quote);
        break;

      case 'roast':
        const user = interaction.options.getUser('user');
        response = await askAI(`Give a playful roast for ${user.username}`, CONFIG.PROMPTS.roast);
        break;

      case 'advice':
        response = await askAI(interaction.options.getString('topic'), CONFIG.PROMPTS.advice);
        break;

      case 'code':
        response = await askAI(interaction.options.getString('code'), CONFIG.PROMPTS.code);
        withTTS = false; // Don't TTS code
        break;

      case 'story':
        response = await askAI(
          `Write a short story: ${interaction.options.getString('prompt')}`,
          CONFIG.PROMPTS.creative
        );
        break;

      case 'help':
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('🤖 Axiom Commands')
              .setColor(0x5865f2)
              .setDescription(
                'Use `/` to see all slash commands!\n\n' +
                  '**/ask** - Ask anything\n' +
                  '**/speak** - Text to speech\n' +
                  '**/summarize** - Summarize text\n' +
                  '**/translate** - Translate text\n' +
                  '**/eli5** - Explain simply\n' +
                  '**/define** - Define a word\n' +
                  '**/joke** - Get a joke\n' +
                  '**/fact** - Random fact\n' +
                  '**/quote** - Inspiring quote\n' +
                  '**/roast** - Playful roast\n' +
                  '**/advice** - Get advice\n' +
                  '**/code** - Review code\n' +
                  '**/story** - Generate story\n' +
                  '**/about** - About Axiom'
              )
              .setFooter({ text: 'Powered by Groq AI' }),
          ],
        });
        return;

      case 'about':
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('🤖 About Axiom')
              .setColor(0x00d4ff)
              .setDescription(
                '**Axiom** is an advanced AI-powered Discord bot that brings intelligent conversation, text-to-speech, image analysis, and fun commands to your server!'
              )
              .addFields(
                { name: '👨‍💻 Created By', value: CONFIG.CREDITS.creators.join('\n'), inline: true },
                { name: '🏢 Team', value: CONFIG.CREDITS.team, inline: true },
                { name: '📦 Version', value: `v${CONFIG.CREDITS.version}`, inline: true },
                {
                  name: '⚡ Powered By',
                  value:
                    '• **Groq AI** (Llama 4 Scout)\n• **OCR.space** (Image Text)\n• **Google TTS** (Speech)',
                  inline: false,
                },
                {
                  name: '✨ Features',
                  value:
                    '• AI Chat & Q&A\n• Text-to-Speech\n• Image OCR Analysis\n• Reply Context Awareness\n• 15+ Slash Commands\n• Fun Commands (jokes, facts, quotes)',
                  inline: false,
                },
                {
                  name: '🌐 Connect With Us',
                  value: `📸 [Instagram](${CONFIG.CREDITS.socials.instagram})\n▶️ [YouTube](${CONFIG.CREDITS.socials.youtube})\n📱 [Play Store](${CONFIG.CREDITS.socials.playstore})\n📧 ${CONFIG.CREDITS.socials.email}`,
                  inline: false,
                }
              )
              .setThumbnail(discordClient.user.displayAvatarURL())
              .setFooter({ text: `Made with ❤️ by ${CONFIG.CREDITS.team}` })
              .setTimestamp(),
          ],
        });
        return;
    }

    await sendResponse(interaction, response, withTTS);
  } catch (error) {
    console.error('Slash command error:', error);
    await interaction.editReply('❌ Something went wrong.').catch(() => {});
  }
}

// =============================================================================
// Discord Event Handlers
// =============================================================================

discordClient.once('ready', async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`✅ Axiom Bot logged in as: ${discordClient.user.tag}`);
  console.log(`📊 Serving ${discordClient.guilds.cache.size} server(s)`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Features:');
  console.log('  • Prefix commands (!ask, !joke, !speak, etc.)');
  console.log('  • Slash commands (/ask, /joke, /speak, etc.)');
  console.log('  • @mention replies');
  console.log('  • Reply context awareness');
  console.log('  • Image OCR analysis');
  console.log('  • Text-to-speech');
  console.log('═══════════════════════════════════════════════════════════════');

  discordClient.user.setActivity('/help | @mention me!', { type: 0 });
  await registerSlashCommands();
});

discordClient.on('messageCreate', handleMessage);
discordClient.on('interactionCreate', handleSlashCommand);
discordClient.on('error', console.error);

// =============================================================================
// Graceful Shutdown
// =============================================================================

process.on('SIGINT', () => {
  discordClient.destroy();
  process.exit(0);
});
process.on('SIGTERM', () => {
  discordClient.destroy();
  process.exit(0);
});

// =============================================================================
// Start Bot
// =============================================================================

console.log('🚀 Starting Axiom Bot (Advanced Edition)...\n');
discordClient.login(CONFIG.DISCORD_TOKEN);
