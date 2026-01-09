// =============================================================================
// Axiom Discord AI Bot - Advanced Edition
// Features: Groq AI, OCR, TTS, Slash Commands, Mentions, Reply Context
// =============================================================================

import 'dotenv/config';
import express from 'express';
import Groq from 'groq-sdk';
import { createWriteStream, unlinkSync, existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { tmpdir } from 'os';
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
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  EndBehaviorType,
} from '@discordjs/voice';
import prism from 'prism-media';

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
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Voice connections and players map
const voiceConnections = new Map();

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

  // Voice Commands
  new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join your voice channel'),

  new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave the voice channel'),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Speak text in voice channel')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to speak').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('talk')
    .setDescription('Ask AI and hear response in voice channel')
    .addStringOption(opt =>
      opt.setName('question').setDescription('Your question').setRequired(true)
    ),
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
// Voice Channel Functions
// =============================================================================

// Voice listening state per guild
const voiceListeners = new Map();
// Track if bot is currently speaking
const botSpeaking = new Map();
// Queue for voice responses (process one at a time)
const voiceResponseQueue = new Map();

// Process voice response queue for a guild
async function processVoiceQueue(guildId) {
  const queue = voiceResponseQueue.get(guildId);
  if (!queue || queue.length === 0 || botSpeaking.get(guildId)) return;

  const { question, textChannel, userId } = queue.shift();

  try {
    console.log(`🎯 Processing queued question from user ${userId}`);

    // Get AI response
    const response = await askAI(question);

    if (response) {
      // Speak the response
      await speakInVC(guildId, response);

      // Send to text channel
      if (textChannel) {
        let displayResponse = response;
        if (displayResponse.length > CONFIG.MAX_RESPONSE_LENGTH) {
          displayResponse = displayResponse.slice(0, CONFIG.MAX_RESPONSE_LENGTH - 30) + '\n\n*... (truncated)*';
        }
        await textChannel.send(`🔊 **Axiom:** ${displayResponse}`).catch(() => {});
      }
    }
  } catch (err) {
    console.log('Queue processing error:', err.message);
  }
}

// Add to voice response queue
function queueVoiceResponse(guildId, question, textChannel, userId) {
  if (!voiceResponseQueue.has(guildId)) {
    voiceResponseQueue.set(guildId, []);
  }

  const queue = voiceResponseQueue.get(guildId);

  // Limit queue size to prevent spam
  if (queue.length >= 5) {
    console.log('🚫 Voice queue full, dropping oldest');
    queue.shift();
  }

  queue.push({ question, textChannel, userId });
  console.log(`📝 Queued response (${queue.length} in queue)`);

  // Try to process if not speaking
  processVoiceQueue(guildId);
}

async function joinVC(interaction, greet = true) {
  const member = interaction.member;
  const voiceChannel = member?.voice?.channel;

  if (!voiceChannel) {
    return { success: false, message: '❌ You need to be in a voice channel first!' };
  }

  try {
    const existingConnection = getVoiceConnection(interaction.guildId);
    if (existingConnection) {
      if (existingConnection.joinConfig.channelId === voiceChannel.id) {
        return { success: true, message: '✅ Already in your voice channel!', connection: existingConnection };
      }
      existingConnection.destroy();
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    // Wait for connection to be ready
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

    // Create audio player for this guild
    const player = createAudioPlayer();
    connection.subscribe(player);
    voiceConnections.set(interaction.guildId, { connection, player, channelId: voiceChannel.id });

    // Handle disconnection
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        connection.destroy();
        voiceConnections.delete(interaction.guildId);
        voiceListeners.delete(interaction.guildId);
        botSpeaking.delete(interaction.guildId);
        voiceResponseQueue.delete(interaction.guildId);
      }
    });

    // Start voice listening
    startVoiceListening(connection, interaction.guildId, interaction.channel);

    // Greet when joining
    if (greet) {
      setTimeout(async () => {
        try {
          await speakInVC(interaction.guildId, "Hello! I'm Axiom. Talk to me or use slash commands!");
        } catch (e) {
          console.log('Could not play greeting:', e.message);
        }
      }, 500);
    }

    return { success: true, message: `🔊 Joined **${voiceChannel.name}**! 🎤 Voice listening enabled.`, connection };
  } catch (error) {
    console.error('Voice join error:', error);
    return { success: false, message: '❌ Failed to join voice channel. Please try again.' };
  }
}

// Start listening to voice in the channel
function startVoiceListening(connection, guildId, textChannel) {
  const receiver = connection.receiver;

  receiver.speaking.on('start', async (userId) => {
    // Don't listen to the bot itself
    if (userId === discordClient.user.id) return;

    // Note: We still process while speaking, but queue the response
    const isBotSpeaking = botSpeaking.get(guildId);

    // Check if already processing this user
    const listenerKey = `${guildId}-${userId}`;
    if (voiceListeners.has(listenerKey)) return;

    voiceListeners.set(listenerKey, Date.now());

    // Timeout to auto-cleanup stuck listeners (30 seconds max)
    const listenerTimeout = setTimeout(() => {
      if (voiceListeners.has(listenerKey)) {
        console.log(`⏰ Listener timeout for ${listenerKey}, cleaning up`);
        voiceListeners.delete(listenerKey);
      }
    }, 30000);

    const cleanup = () => {
      clearTimeout(listenerTimeout);
      voiceListeners.delete(listenerKey);
    };

    try {
      const audioStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 2000, // Stop after 2s of silence (was 1.5s)
        },
      });

      const chunks = [];
      const opusDecoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });

      audioStream.pipe(opusDecoder);

      opusDecoder.on('data', (chunk) => {
        chunks.push(chunk);
      });

      // Handle decoder errors
      opusDecoder.on('error', (err) => {
        console.log('Opus decoder error:', err.message);
        cleanup();
      });

      opusDecoder.on('end', async () => {
        cleanup();

        // Need at least some audio data (lowered from 10 to 5)
        if (chunks.length < 5) {
          console.log(`🔇 Too short: ${chunks.length} chunks`);
          return;
        }

        const audioBuffer = Buffer.concat(chunks);

        // Convert to WAV format for Groq
        const wavBuffer = createWavBuffer(audioBuffer, 48000, 2);

        try {
          // Transcribe using Groq Whisper
          const transcription = await transcribeAudio(wavBuffer);

          if (!transcription || transcription.trim().length < 2) {
            console.log('🔇 Empty or too short transcription');
            return;
          }

          console.log(`🎤 Heard from user: "${transcription}"`);

          // Check for wake words or process as question
          const lowerText = transcription.toLowerCase().trim();

          // Conversational detection - respond to questions and direct speech
          const wakePatterns = [
            /\baxiom\b/i,                    // "axiom" anywhere
            /^hey\b/i,                       // "hey" at start
            /^hi\b/i,                        // "hi" at start
            /^ok\b/i,                        // "ok" at start
            /^yo\b/i,                        // "yo" at start
            /^yeah\b/i,                      // "yeah" at start
            /\bhey bot\b/i,                  // "hey bot"
            /\byou there\b/i,                // "you there"
            /\bbot\b/i,                      // "bot" anywhere
            /^hello\b/i,                     // "hello" at start
            /^excuse me\b/i,                 // "excuse me" at start
            /\?$/,                           // ends with question mark
            /\bwho\b.*\byou\b/i,             // "who ... you" (who are you, who created you)
            /\bwhat\b.*\byou\b/i,            // "what ... you" (what are you, what can you do)
            /\bcan you\b/i,                  // "can you..."
            /\bwill you\b/i,                 // "will you..."
            /\bare you\b/i,                  // "are you..."
            /\bdo you\b/i,                   // "do you..."
            /\btell me\b/i,                  // "tell me..."
            /\bwhat is\b/i,                  // "what is..."
            /\bwhat's\b/i,                   // "what's..."
            /\bhow do\b/i,                   // "how do..."
            /\bhow can\b/i,                  // "how can..."
            /\bwhy\b/i,                      // "why..." questions
            /\bwhen\b/i,                     // "when..." questions
            /\bwhere\b/i,                    // "where..." questions
          ];

          const hasWakeWord = wakePatterns.some(pattern => pattern.test(lowerText));

          if (hasWakeWord) {
            // Remove wake words and get the actual question
            // For conversational patterns, keep the full question
            let question = transcription
              .replace(/\b(hey|hi|ok|yo|yeah)?\s*axiom\b/gi, '')
              .replace(/^(hey|hi|ok|yo|yeah|hello)\s*/i, '')
              .replace(/^excuse me\s*/i, '')
              .replace(/\byou there\b/gi, '')
              .replace(/\bhey bot\b/gi, '')
              .trim();

            // If question is empty after cleanup, use original transcription
            if (question.length <= 2) {
              question = transcription.trim();
            }

            // If only wake word said, prompt for question
            if (question.length <= 2) {
              if (textChannel) {
                await textChannel.send(`👂 **Listening...** Say your question!`).catch(() => {});
              }
              await speakInVC(guildId, "Yes? What would you like to know?");
              return;
            }

            // Send confirmation to text channel
            if (textChannel) {
              const queueStatus = isBotSpeaking ? ' (queued)' : '';
              await textChannel.send(`🎤 **Voice:** "${transcription}"${queueStatus}`).catch(() => {});
            }

            // If bot is speaking, queue the response
            if (isBotSpeaking) {
              queueVoiceResponse(guildId, question, textChannel, userId);
              return;
            }

            // Get AI response
            const response = await askAI(question);

            if (!response) {
              console.log('❌ No AI response received');
              if (textChannel) {
                await textChannel.send(`❌ Sorry, I couldn't process that. Try again.`).catch(() => {});
              }
              return;
            }

            // Speak the response
            await speakInVC(guildId, response);

            // Also send to text channel
            if (textChannel) {
              let displayResponse = response;
              if (displayResponse.length > CONFIG.MAX_RESPONSE_LENGTH) {
                displayResponse = displayResponse.slice(0, CONFIG.MAX_RESPONSE_LENGTH - 30) + '\n\n*... (truncated)*';
              }
              await textChannel.send(`🔊 **Axiom:** ${displayResponse}`).catch(() => {});
            }
          } else {
            // No wake word - log but don't respond (optional: remove this else block to respond to everything)
            console.log(`🔇 No wake word detected in: "${transcription}"`);
          }
        } catch (err) {
          console.log('Transcription error:', err.message);
          cleanup();
          if (textChannel) {
            await textChannel.send(`⚠️ Voice processing error. Please try again.`).catch(() => {});
          }
        }
      });

      audioStream.on('error', (err) => {
        console.log('Audio stream error:', err.message);
        cleanup();
      });

      // Handle stream close without end event
      audioStream.on('close', () => {
        cleanup();
      });

    } catch (err) {
      cleanup();
      console.log('Voice listen error:', err.message);
    }
  });
}

// Create WAV buffer from raw PCM data
function createWavBuffer(pcmBuffer, sampleRate, channels) {
  const bytesPerSample = 2; // 16-bit
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const buffer = Buffer.alloc(fileSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // byte rate
  buffer.writeUInt16LE(channels * bytesPerSample, 32); // block align
  buffer.writeUInt16LE(bytesPerSample * 8, 34); // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

// Transcribe audio using Groq Whisper
async function transcribeAudio(wavBuffer) {
  try {
    // Save to temp file
    const tempFile = join(tmpdir(), `axiom_voice_${Date.now()}.wav`);
    const writeStream = createWriteStream(tempFile);
    writeStream.write(wavBuffer);
    writeStream.end();
    await new Promise(resolve => writeStream.on('finish', resolve));

    // Use Groq's transcription API
    const { createReadStream } = await import('fs');
    const transcription = await groq.audio.transcriptions.create({
      file: createReadStream(tempFile),
      model: 'whisper-large-v3-turbo',
      language: 'en',
    });

    // Clean up temp file
    try {
      if (existsSync(tempFile)) unlinkSync(tempFile);
    } catch (e) {}

    return transcription.text;
  } catch (error) {
    console.error('Groq transcription error:', error.message);
    return null;
  }
}

function leaveVC(guildId) {
  const connection = getVoiceConnection(guildId);
  if (connection) {
    connection.destroy();
    voiceConnections.delete(guildId);
    voiceListeners.delete(guildId);
    botSpeaking.delete(guildId);
    voiceResponseQueue.delete(guildId);
    return { success: true, message: '👋 Left the voice channel!' };
  }
  return { success: false, message: '❌ Not in a voice channel!' };
}

async function speakInVC(guildId, text) {
  const voiceData = voiceConnections.get(guildId);
  if (!voiceData) {
    return { success: false, message: '❌ Not in a voice channel! Use `/join` first.' };
  }

  try {
    // Mark bot as speaking to prevent listening during playback
    botSpeaking.set(guildId, true);

    // Generate TTS audio
    const audioBuffer = await textToSpeech(cleanTextForTTS(text));

    // Save to temp file (required for createAudioResource)
    const tempFile = join(tmpdir(), `axiom_tts_${Date.now()}.mp3`);
    const writeStream = createWriteStream(tempFile);
    writeStream.write(audioBuffer);
    writeStream.end();

    // Wait for file to be written
    await new Promise(resolve => writeStream.on('finish', resolve));

    // Create and play audio resource
    const resource = createAudioResource(tempFile);
    voiceData.player.play(resource);

    // Clean up temp file after playing and re-enable listening
    voiceData.player.once(AudioPlayerStatus.Idle, () => {
      // Re-enable listening after a short delay (prevent catching echo)
      setTimeout(() => {
        botSpeaking.set(guildId, false);
        // Process next item in queue if any
        processVoiceQueue(guildId);
      }, 500);

      try {
        if (existsSync(tempFile)) unlinkSync(tempFile);
      } catch (e) {
        console.log('Could not delete temp file:', e.message);
      }
    });

    // Fallback: clear speaking flag after 60 seconds max (in case Idle never fires)
    setTimeout(() => {
      if (botSpeaking.get(guildId)) {
        botSpeaking.set(guildId, false);
        processVoiceQueue(guildId);
      }
    }, 60000);

    return { success: true, message: '🔊 Speaking...' };
  } catch (error) {
    console.error('Speak error:', error);
    botSpeaking.set(guildId, false); // Ensure flag is cleared on error
    return { success: false, message: '❌ Failed to speak. Please try again.' };
  }
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
                  '**💬 Chat Commands**\n' +
                  '**/ask** - Ask anything\n' +
                  '**/speak** - Text to speech\n' +
                  '**/summarize** - Summarize text\n' +
                  '**/translate** - Translate text\n' +
                  '**/eli5** - Explain simply\n' +
                  '**/define** - Define a word\n\n' +
                  '**🎉 Fun Commands**\n' +
                  '**/joke** - Get a joke\n' +
                  '**/fact** - Random fact\n' +
                  '**/quote** - Inspiring quote\n' +
                  '**/roast** - Playful roast\n' +
                  '**/advice** - Get advice\n' +
                  '**/code** - Review code\n' +
                  '**/story** - Generate story\n\n' +
                  '**🔊 Voice Commands**\n' +
                  '**/join** - Join voice channel\n' +
                  '**/leave** - Leave voice channel\n' +
                  '**/say** - Speak in voice channel\n' +
                  '**/talk** - AI response in voice\n\n' +
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

      // Voice Commands
      case 'join':
        const joinResult = await joinVC(interaction);
        await interaction.editReply(joinResult.message);
        return;

      case 'leave':
        const leaveResult = leaveVC(interaction.guildId);
        await interaction.editReply(leaveResult.message);
        return;

      case 'say':
        const sayText = interaction.options.getString('text');
        const sayResult = await speakInVC(interaction.guildId, sayText);
        await interaction.editReply(sayResult.message);
        return;

      case 'talk':
        const question = interaction.options.getString('question');
        // First check if in voice channel
        if (!voiceConnections.has(interaction.guildId)) {
          // Try to join automatically
          const autoJoin = await joinVC(interaction);
          if (!autoJoin.success) {
            await interaction.editReply(autoJoin.message);
            return;
          }
          await interaction.editReply(`${autoJoin.message}\n\n🤔 Thinking...`);
        } else {
          await interaction.editReply('🤔 Thinking...');
        }

        // Get AI response
        const aiResponse = await askAI(question);

        // Speak it in voice channel
        const talkResult = await speakInVC(interaction.guildId, aiResponse);

        // Also show text response
        let displayResponse = aiResponse;
        if (displayResponse.length > CONFIG.MAX_RESPONSE_LENGTH) {
          displayResponse = displayResponse.slice(0, CONFIG.MAX_RESPONSE_LENGTH - 30) + '\n\n*... (truncated)*';
        }
        await interaction.editReply(`${talkResult.success ? '🔊' : '💬'} ${displayResponse}`);
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
  console.log('  • Voice channel commands (/join, /leave, /say, /talk)');
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

// Auto-leave when bot is alone in voice channel
discordClient.on('voiceStateUpdate', (oldState, newState) => {
  // Check if someone left a voice channel
  if (oldState.channelId && oldState.channelId !== newState.channelId) {
    const channel = oldState.channel;
    if (!channel) return;

    // Check if bot is in this channel
    const botVoiceData = voiceConnections.get(oldState.guild.id);
    if (!botVoiceData || botVoiceData.channelId !== oldState.channelId) return;

    // Count non-bot members in the channel
    const humanMembers = channel.members.filter(member => !member.user.bot).size;

    if (humanMembers === 0) {
      console.log(`👋 No users left in voice channel, leaving in 10 seconds...`);

      // Leave after 10 seconds (in case someone rejoins quickly)
      setTimeout(() => {
        // Re-check if still alone
        const currentChannel = oldState.guild.channels.cache.get(botVoiceData.channelId);
        if (currentChannel) {
          const currentHumans = currentChannel.members.filter(m => !m.user.bot).size;
          if (currentHumans === 0) {
            console.log(`👋 Auto-leaving empty voice channel`);
            leaveVC(oldState.guild.id);
          }
        }
      }, 10000);
    }
  }
});

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
