// =============================================================================
// Axiom Discord AI Bot - Ultimate Edition v2.0
// Features: Groq RAG, Web Search, Agents, Orpheus TTS, Voice, OCR, Memory
// Powered by groq-rag SDK
// =============================================================================

import 'dotenv/config';
import express from 'express';
import GroqRAG from 'groq-rag';
import { createWriteStream, unlinkSync, existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
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
  GROQ_CHAT_MODEL: 'llama-3.3-70b-versatile',

  // TTS Settings (Groq Orpheus TTS by Canopy Labs)
  TTS_MODEL: 'canopylabs/orpheus-v1-english',
  TTS_VOICE: 'troy',
  TTS_VOICES: ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'],
  TTS_WITH_AI: true, // Orpheus supports expressive directions like [cheerful], [whisper]

  // OCR.space API
  OCR_API_KEY: process.env.OCR_API_KEY,
  OCR_API_URL: 'https://api.ocr.space/parse/image',

  // Express
  PORT: process.env.PORT || 3000,

  // Bot settings
  COMMAND_PREFIX: '!',
  MAX_RESPONSE_LENGTH: 1900,
  MAX_TTS_LENGTH: 4000, // Orpheus TTS supports longer text
  ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp'],

  // Memory settings
  MAX_CONVERSATION_HISTORY: 10,
  DATA_DIR: process.env.DATA_DIR || './data',

  // Bot Credits
  CREDITS: {
    creators: ['Mithun Gowda B', 'Naren V'],
    team: 'NextGenXplorrers Team',
    version: '2.0.0',
    socials: {
      instagram: 'https://www.instagram.com/nexgenxplorerr',
      youtube: 'https://youtube.com/@nexgenxplorer',
      playstore: 'https://play.google.com/store/apps/dev?id=8262374975871504599',
      email: 'nxgextra@gmail.com',
    },
  },

  // System prompts
  PROMPTS: {
    default: `You are Axiom v2.0, an advanced AI assistant in Discord powered by groq-rag. You're witty, helpful, and extremely capable.

YOUR TOOLS & WHEN TO USE THEM:
1. /search - Use for CURRENT events, news, prices, weather, real-time data
2. /agent - Use for COMPLEX multi-step tasks requiring reasoning and tool use
3. /research - Use for DEEP dives into topics requiring multiple sources
4. /url - Use to ANALYZE specific web pages, articles, documentation
5. /fetch - Use to GET raw content from URLs
6. /recall - Use to QUERY the server's knowledge base (what users taught you)
7. /learn - Teach yourself new information for this server

CAPABILITIES:
- Real-time web search (DuckDuckGo, no API key needed)
- URL content analysis and summarization
- Autonomous agent with web_search, fetch_url, calculator, datetime tools
- Per-server RAG knowledge base with vector search
- 6 Orpheus TTS voices with expressive directions like [cheerful], [whisper]
- Whisper speech-to-text in voice channels
- Image OCR text extraction

BEHAVIOR GUIDELINES:
- For current info (news, prices, weather) → suggest /search
- For analyzing a link → suggest /url
- For complex research → suggest /research or /agent
- For server-specific info → check /recall first
- Always cite sources when using web data

ABOUT YOUR CREATORS:
- Created by: Mithun Gowda B and Naren V
- Team: NextGenXplorrers Team (NextGenX)
- Instagram: https://www.instagram.com/nexgenxplorerr
- YouTube: https://youtube.com/@nexgenxplorer
- Email: nxgextra@gmail.com

Be concise but thorough. Keep responses under 1800 characters unless more detail is needed.`,

    eli5: `You are Axiom. Explain like talking to a 5-year-old. Use simple words, fun examples, and analogies. Keep it short and engaging!`,

    summarize: `You are Axiom. Summarize the given text in 2-3 concise bullet points. Focus on key information only.`,

    translate: `You are Axiom, a translator. Translate the text to the requested language. Only provide the translation, nothing else.`,

    code: `You are Axiom, a senior code expert. Review the code, explain what it does, identify issues, suggest improvements, and rate code quality. Be thorough but concise.`,

    creative: `You are Axiom, a creative writer. Be imaginative, engaging, and produce compelling content.`,

    joke: `You are Axiom, a comedian. Tell a funny, original, clean joke. Keep it short and witty.`,

    fact: `You are Axiom. Share a surprising, lesser-known, and true fact. Be educational and engaging.`,

    quote: `You are Axiom. Share an inspiring quote with its author. Add a brief reflection on its meaning.`,

    define: `You are Axiom, a dictionary. Define the word clearly with: 1) Definition 2) Example sentence 3) Synonyms 4) Etymology if interesting.`,

    roast: `You are Axiom. Give a playful, clever roast. Be witty and creative, not mean-spirited!`,

    advice: `You are Axiom, a wise advisor. Give thoughtful, practical advice. Be supportive and constructive.`,

    agent: `You are Axiom Agent, an autonomous AI with these tools:
- web_search: Search the internet for current information
- fetch_url: Read and extract content from any URL
- calculator: Perform math calculations
- get_datetime: Get current date and time
- rag_query: Search the knowledge base (if initialized)

APPROACH:
1. Break down complex tasks into steps
2. Use web_search for current events, news, facts
3. Use fetch_url to read specific articles/docs
4. Use calculator for any math
5. Always cite your sources
6. Think step-by-step before acting

Provide comprehensive answers with sources.`,

    research: `You are Axiom Research Agent. Conduct thorough research using your tools:

RESEARCH PROCESS:
1. web_search for multiple perspectives on the topic
2. fetch_url to read key articles in depth
3. Synthesize information from multiple sources
4. Structure findings clearly

OUTPUT FORMAT:
- Executive Summary (2-3 sentences)
- Key Findings (bullet points)
- Details (organized by subtopic)
- Sources (numbered list with URLs)

Be thorough but concise. Always cite sources.`,
  },
};

// =============================================================================
// Ensure data directory exists
// =============================================================================

try {
  mkdirSync(CONFIG.DATA_DIR, { recursive: true });
} catch (e) {}

// =============================================================================
// Validate Environment Variables
// =============================================================================

const requiredEnvVars = ['DISCORD_TOKEN', 'GROQ_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
}

// =============================================================================
// Initialize Groq RAG Client
// =============================================================================

const groqClient = new GroqRAG({
  apiKey: CONFIG.GROQ_API_KEY,
});

// Per-guild RAG instances
const guildRAG = new Map();

// Conversation memory per channel
const conversationMemory = new Map();

// Per-guild voice settings
const guildVoiceSettings = new Map();

// =============================================================================
// Initialize Discord Client
// =============================================================================

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

// Voice state maps
const voiceConnections = new Map();
const voiceListeners = new Map();
const botSpeaking = new Map();
const voiceResponseQueue = new Map();

// =============================================================================
// Express Server
// =============================================================================

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('Axiom Bot v2.0 - Ultimate Edition'));

app.get('/health', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'healthy',
    version: CONFIG.CREDITS.version,
    uptime: Math.floor(process.uptime()),
    guilds: discordClient.guilds?.cache?.size || 0,
    features: ['RAG', 'WebSearch', 'Agent', 'Orpheus-TTS', 'Voice', 'OCR'],
  });
});

app.listen(CONFIG.PORT, () => console.log(`🌐 Express running on port ${CONFIG.PORT}`));

// =============================================================================
// Keep Alive - Auto Ping
// =============================================================================

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
if (RENDER_URL) {
  setInterval(() => {
    fetch(`${RENDER_URL}/health`)
      .then(() => console.log('🏓 Keep-alive ping sent'))
      .catch(() => {});
  }, 14 * 60 * 1000);
}

// =============================================================================
// Slash Commands Definition
// =============================================================================

const slashCommands = [
  // Chat Commands
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask Axiom anything')
    .addStringOption(opt => opt.setName('question').setDescription('Your question').setRequired(true)),

  new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search the web for real-time information')
    .addStringOption(opt => opt.setName('query').setDescription('What to search for').setRequired(true)),

  new SlashCommandBuilder()
    .setName('agent')
    .setDescription('Use AI agent for complex multi-step tasks')
    .addStringOption(opt => opt.setName('task').setDescription('Task for the agent').setRequired(true)),

  new SlashCommandBuilder()
    .setName('research')
    .setDescription('Deep research on a topic with sources')
    .addStringOption(opt => opt.setName('topic').setDescription('Topic to research').setRequired(true)),

  new SlashCommandBuilder()
    .setName('url')
    .setDescription('Analyze and chat about a URL')
    .addStringOption(opt => opt.setName('url').setDescription('URL to analyze').setRequired(true))
    .addStringOption(opt => opt.setName('question').setDescription('Question about the URL (optional)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('fetch')
    .setDescription('Fetch and display content from a URL')
    .addStringOption(opt => opt.setName('url').setDescription('URL to fetch').setRequired(true)),

  // RAG Commands
  new SlashCommandBuilder()
    .setName('learn')
    .setDescription('Teach Axiom new information for this server')
    .addStringOption(opt => opt.setName('content').setDescription('Information to learn').setRequired(true))
    .addStringOption(opt => opt.setName('source').setDescription('Source name (optional)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('learn-url')
    .setDescription('Learn information from a URL')
    .addStringOption(opt => opt.setName('url').setDescription('URL to learn from').setRequired(true)),

  new SlashCommandBuilder()
    .setName('recall')
    .setDescription('Query the knowledge base')
    .addStringOption(opt => opt.setName('query').setDescription('What to recall').setRequired(true)),

  new SlashCommandBuilder()
    .setName('forget')
    .setDescription('Clear the server knowledge base (Admin only)'),

  new SlashCommandBuilder()
    .setName('knowledge')
    .setDescription('Show knowledge base stats for this server'),

  // TTS Commands (Orpheus TTS by Canopy Labs)
  new SlashCommandBuilder()
    .setName('speak')
    .setDescription('Convert text to speech with Orpheus TTS')
    .addStringOption(opt => opt.setName('text').setDescription('Text to speak').setRequired(true))
    .addStringOption(opt =>
      opt.setName('voice').setDescription('Voice to use').setRequired(false)
        .addChoices(
          { name: 'Troy (Male, Default)', value: 'troy' },
          { name: 'Austin (Male)', value: 'austin' },
          { name: 'Daniel (Male)', value: 'daniel' },
          { name: 'Hannah (Female)', value: 'hannah' },
          { name: 'Diana (Female)', value: 'diana' },
          { name: 'Autumn (Female)', value: 'autumn' },
        )
    ),

  new SlashCommandBuilder()
    .setName('voice-set')
    .setDescription('Set default voice for this server')
    .addStringOption(opt =>
      opt.setName('voice').setDescription('Default voice').setRequired(true)
        .addChoices(
          { name: 'Troy (Male, Default)', value: 'troy' },
          { name: 'Austin (Male)', value: 'austin' },
          { name: 'Daniel (Male)', value: 'daniel' },
          { name: 'Hannah (Female)', value: 'hannah' },
          { name: 'Diana (Female)', value: 'diana' },
          { name: 'Autumn (Female)', value: 'autumn' },
        )
    ),

  // Classic Commands
  new SlashCommandBuilder()
    .setName('summarize')
    .setDescription('Summarize text')
    .addStringOption(opt => opt.setName('text').setDescription('Text to summarize').setRequired(true)),

  new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text')
    .addStringOption(opt => opt.setName('text').setDescription('Text to translate').setRequired(true))
    .addStringOption(opt => opt.setName('to').setDescription('Target language').setRequired(true)),

  new SlashCommandBuilder()
    .setName('eli5')
    .setDescription("Explain Like I'm 5")
    .addStringOption(opt => opt.setName('topic').setDescription('Topic to explain').setRequired(true)),

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
    .addStringOption(opt => opt.setName('topic').setDescription('What do you need advice on?').setRequired(true)),

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
  new SlashCommandBuilder().setName('join').setDescription('Join your voice channel'),
  new SlashCommandBuilder().setName('leave').setDescription('Leave the voice channel'),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Speak text in voice channel')
    .addStringOption(opt => opt.setName('text').setDescription('Text to speak').setRequired(true)),

  new SlashCommandBuilder()
    .setName('talk')
    .setDescription('Ask AI and hear response in voice channel')
    .addStringOption(opt => opt.setName('question').setDescription('Your question').setRequired(true)),

  // Memory Commands
  new SlashCommandBuilder()
    .setName('clear-memory')
    .setDescription('Clear conversation memory for this channel'),
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
// RAG Management Functions
// =============================================================================

async function getGuildRAG(guildId) {
  if (!guildRAG.has(guildId)) {
    const client = new GroqRAG({ apiKey: CONFIG.GROQ_API_KEY });
    await client.initRAG();

    // Try to load saved knowledge
    const dataFile = join(CONFIG.DATA_DIR, `rag_${guildId}.json`);
    try {
      if (existsSync(dataFile)) {
        const data = JSON.parse(readFileSync(dataFile, 'utf-8'));
        for (const doc of data.documents || []) {
          await client.rag.addDocument(doc.content, doc.metadata);
        }
        console.log(`📚 Loaded ${data.documents?.length || 0} docs for guild ${guildId}`);
      }
    } catch (e) {
      console.log(`Could not load RAG data for guild ${guildId}`);
    }

    guildRAG.set(guildId, { client, documents: [] });
  }
  return guildRAG.get(guildId);
}

async function saveGuildRAG(guildId) {
  const rag = guildRAG.get(guildId);
  if (!rag) return;

  const dataFile = join(CONFIG.DATA_DIR, `rag_${guildId}.json`);
  try {
    writeFileSync(dataFile, JSON.stringify({ documents: rag.documents }, null, 2));
  } catch (e) {
    console.log(`Could not save RAG data for guild ${guildId}`);
  }
}

// =============================================================================
// Conversation Memory Functions
// =============================================================================

function getConversationKey(channelId, userId) {
  return `${channelId}-${userId}`;
}

function getConversationHistory(channelId, userId) {
  const key = getConversationKey(channelId, userId);
  return conversationMemory.get(key) || [];
}

function addToConversationHistory(channelId, userId, role, content) {
  const key = getConversationKey(channelId, userId);
  const history = conversationMemory.get(key) || [];

  history.push({ role, content });

  // Keep only last N messages
  while (history.length > CONFIG.MAX_CONVERSATION_HISTORY * 2) {
    history.shift();
  }

  conversationMemory.set(key, history);
}

function clearConversationHistory(channelId, userId) {
  const key = getConversationKey(channelId, userId);
  conversationMemory.delete(key);
}

// =============================================================================
// AI Functions
// =============================================================================

// Detect if query needs time/date (use agent's get_datetime tool - handles all timezones)
function needsDateTime(query) {
  const patterns = [
    /\bwhat time\b/i,
    /\bwhat.* date\b/i,
    /\bcurrent time\b/i,
    /\btime in\b/i,
    /\btime at\b/i,
    /\bwhat day\b/i,
    /\btoday.* date\b/i,
    /\b(ist|pst|est|gmt|utc|cst|jst|aest|cet|bst)\b/i,  // timezone abbreviations
    /\btime\b.*\b(india|usa|uk|japan|china|australia|europe|america|asia|london|tokyo|paris|new york)\b/i,
  ];
  return patterns.some(p => p.test(query));
}

// Detect if query needs real-time data (web search)
function needsWebSearch(query) {
  // Time queries - agent's get_datetime handles those
  if (needsDateTime(query)) return false;

  const realTimePatterns = [
    /\b(weather|temperature|forecast)\b/i,
    /\b(news|headlines|breaking)\b/i,
    /\b(price|cost|stock|crypto|bitcoin|eth)\b.*\b(of|for|today|now|current)\b/i,
    /\b(who won|score|match|game)\b/i,
    /\b(latest|new|recent)\b.*\b(version|release|update)\b/i,
    /\bhow much is\b/i,
    /\bwhat is the .* (price|rate|score)\b/i,
    /\b(trending|viral|popular)\b/i,
    /\bexchange rate\b/i,
  ];

  return realTimePatterns.some(pattern => pattern.test(query));
}

async function askAI(prompt, systemPrompt = CONFIG.PROMPTS.default, channelId = null, userId = null) {
  // Auto-detect if time/date is needed - use agent's built-in get_datetime tool
  if (needsDateTime(prompt) && systemPrompt === CONFIG.PROMPTS.default) {
    console.log('🕐 Auto-triggering agent for time/date query');
    return runAgent(prompt);
  }

  // Auto-detect if web search is needed
  if (needsWebSearch(prompt) && systemPrompt === CONFIG.PROMPTS.default) {
    console.log('🔍 Auto-triggering web search for real-time query');
    return webSearchChat(prompt, channelId, userId);
  }

  const messages = [{ role: 'system', content: systemPrompt }];

  // Add conversation history if available
  if (channelId && userId) {
    const history = getConversationHistory(channelId, userId);
    messages.push(...history);
  }

  messages.push({ role: 'user', content: prompt });

  const response = await groqClient.complete({
    model: CONFIG.GROQ_CHAT_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
  });

  const reply = response.choices[0]?.message?.content || 'No response generated.';

  // Save to history
  if (channelId && userId) {
    addToConversationHistory(channelId, userId, 'user', prompt);
    addToConversationHistory(channelId, userId, 'assistant', reply);
  }

  return reply;
}

async function webSearchChat(query, channelId = null, userId = null) {
  try {
    const response = await groqClient.chat.withWebSearch({
      messages: [{ role: 'user', content: query }],
      model: CONFIG.GROQ_CHAT_MODEL,
      maxResults: 5,
      maxSnippetLength: 300,
    });

    let reply = response.content;

    // Add sources
    if (response.sources && response.sources.length > 0) {
      reply += '\n\n**Sources:**\n';
      response.sources.slice(0, 3).forEach((s, i) => {
        reply += `${i + 1}. [${s.title || 'Link'}](${s.url})\n`;
      });
    }

    // Save to history
    if (channelId && userId) {
      addToConversationHistory(channelId, userId, 'user', query);
      addToConversationHistory(channelId, userId, 'assistant', reply);
    }

    return reply;
  } catch (error) {
    console.error('Web search error:', error.message);
    // Fallback to regular chat
    return askAI(query, CONFIG.PROMPTS.default, channelId, userId);
  }
}

async function ragChat(guildId, query) {
  try {
    const rag = await getGuildRAG(guildId);

    const response = await rag.client.chat.withRAG({
      messages: [{ role: 'user', content: query }],
      model: CONFIG.GROQ_CHAT_MODEL,
      topK: 5,
      minScore: 0.3,
    });

    let reply = response.content;

    if (response.sources && response.sources.length > 0) {
      reply += '\n\n*Based on server knowledge base*';
    }

    return reply;
  } catch (error) {
    console.error('RAG chat error:', error.message);
    return null;
  }
}

async function runAgent(task) {
  try {
    const agent = await groqClient.createAgentWithBuiltins({
      model: CONFIG.GROQ_CHAT_MODEL,
      systemPrompt: CONFIG.PROMPTS.agent,
      verbose: false,
    });

    const result = await agent.run(task);

    let reply = result.output;

    if (result.toolCalls && result.toolCalls.length > 0) {
      reply += '\n\n**Tools used:** ' + result.toolCalls.map(t => `\`${t.name}\``).join(', ');
    }

    return reply;
  } catch (error) {
    console.error('Agent error:', error.message);
    return `Agent encountered an error: ${error.message}`;
  }
}

async function researchTopic(topic) {
  try {
    const agent = await groqClient.createAgentWithBuiltins({
      model: CONFIG.GROQ_CHAT_MODEL,
      systemPrompt: CONFIG.PROMPTS.research,
      verbose: false,
    });

    const result = await agent.run(
      `Research the following topic thoroughly. Search for multiple sources, analyze the information, and provide a comprehensive report with key findings and sources: "${topic}"`
    );

    return result.output;
  } catch (error) {
    console.error('Research error:', error.message);
    // Fallback to web search
    return webSearchChat(`Detailed information about: ${topic}`);
  }
}

async function urlChat(url, question = null) {
  try {
    const response = await groqClient.chat.withUrl({
      messages: [{ role: 'user', content: question || 'Summarize this page and highlight key points.' }],
      url: url,
      model: CONFIG.GROQ_CHAT_MODEL,
      maxContentLength: 8000,
    });

    let reply = response.content;

    if (response.source) {
      reply += `\n\n**Source:** [${response.source.title || 'Link'}](${url})`;
    }

    return reply;
  } catch (error) {
    console.error('URL chat error:', error.message);
    return `❌ Could not analyze URL: ${error.message}`;
  }
}

async function webFetch(url) {
  try {
    const result = await groqClient.web.fetch(url);

    let reply = `**📄 Fetched: ${result.title || url}**\n\n`;

    if (result.content) {
      const preview = result.content.slice(0, 1500);
      reply += preview;
      if (result.content.length > 1500) {
        reply += '\n\n*... (content truncated)*';
      }
    }

    return reply;
  } catch (error) {
    console.error('Web fetch error:', error.message);
    return `❌ Could not fetch URL: ${error.message}`;
  }
}

async function webSearch(query) {
  try {
    const results = await groqClient.web.search(query, { maxResults: 5 });

    let reply = `**🔍 Search Results for "${query}"**\n\n`;

    results.forEach((r, i) => {
      reply += `**${i + 1}. ${r.title}**\n`;
      reply += `${r.snippet}\n`;
      reply += `[${r.url}](${r.url})\n\n`;
    });

    return reply;
  } catch (error) {
    console.error('Web search error:', error.message);
    return `❌ Search failed: ${error.message}`;
  }
}

// =============================================================================
// OCR Function
// =============================================================================

async function extractTextFromImage(imageUrl) {
  if (!CONFIG.OCR_API_KEY) return null;

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
  return data.ParsedResults?.map(r => r.ParsedText).join('\n').trim() || '';
}

// =============================================================================
// Groq Orpheus TTS Function (Canopy Labs)
// =============================================================================

async function textToSpeech(text, voice = null, guildId = null) {
  // Get voice preference
  let selectedVoice = voice || guildVoiceSettings.get(guildId) || CONFIG.TTS_VOICE;

  // Validate voice
  if (!CONFIG.TTS_VOICES.includes(selectedVoice)) {
    selectedVoice = CONFIG.TTS_VOICE;
  }

  // Clean and truncate text
  const cleanText = cleanTextForTTS(text).slice(0, CONFIG.MAX_TTS_LENGTH);

  try {
    // Use Groq Orpheus TTS API
    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CONFIG.TTS_MODEL,
        voice: selectedVoice,
        input: cleanText,
        response_format: 'wav',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TTS API error: ${response.status} - ${error}`);
    }

    // Get audio buffer
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Groq TTS error:', error.message);
    throw error;
  }
}

function cleanTextForTTS(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, '. ')
    .trim();
}

function isValidImage(attachment) {
  if (!attachment) return false;
  if (attachment.contentType)
    return CONFIG.ALLOWED_IMAGE_TYPES.includes(attachment.contentType.toLowerCase());
  const ext = attachment.name?.toLowerCase().split('.').pop();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext);
}

// =============================================================================
// Voice Channel Functions
// =============================================================================

async function processVoiceQueue(guildId) {
  const queue = voiceResponseQueue.get(guildId);
  if (!queue || queue.length === 0 || botSpeaking.get(guildId)) return;

  const { question, textChannel, userId } = queue.shift();

  try {
    console.log(`🎯 Processing queued question from user ${userId}`);
    const response = await askAI(question);

    if (response) {
      await speakInVC(guildId, response);
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

function queueVoiceResponse(guildId, question, textChannel, userId) {
  if (!voiceResponseQueue.has(guildId)) {
    voiceResponseQueue.set(guildId, []);
  }

  const queue = voiceResponseQueue.get(guildId);
  if (queue.length >= 5) {
    console.log('🚫 Voice queue full, dropping oldest');
    queue.shift();
  }

  queue.push({ question, textChannel, userId });
  console.log(`📝 Queued response (${queue.length} in queue)`);
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

    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

    const player = createAudioPlayer();
    connection.subscribe(player);
    voiceConnections.set(interaction.guildId, { connection, player, channelId: voiceChannel.id });

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

    startVoiceListening(connection, interaction.guildId, interaction.channel);

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

function startVoiceListening(connection, guildId, textChannel) {
  const receiver = connection.receiver;

  receiver.speaking.on('start', async (userId) => {
    if (userId === discordClient.user.id) return;

    const isBotSpeaking = botSpeaking.get(guildId);
    const listenerKey = `${guildId}-${userId}`;
    if (voiceListeners.has(listenerKey)) return;

    voiceListeners.set(listenerKey, Date.now());

    const listenerTimeout = setTimeout(() => {
      if (voiceListeners.has(listenerKey)) {
        voiceListeners.delete(listenerKey);
      }
    }, 30000);

    const cleanup = () => {
      clearTimeout(listenerTimeout);
      voiceListeners.delete(listenerKey);
    };

    try {
      const audioStream = receiver.subscribe(userId, {
        end: { behavior: EndBehaviorType.AfterSilence, duration: 2000 },
      });

      const chunks = [];
      const opusDecoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });

      audioStream.pipe(opusDecoder);

      opusDecoder.on('data', (chunk) => chunks.push(chunk));
      opusDecoder.on('error', (err) => {
        console.log('Opus decoder error:', err.message);
        cleanup();
      });

      opusDecoder.on('end', async () => {
        cleanup();

        if (chunks.length < 5) return;

        const audioBuffer = Buffer.concat(chunks);
        const wavBuffer = createWavBuffer(audioBuffer, 48000, 2);

        try {
          const transcription = await transcribeAudio(wavBuffer);

          if (!transcription || transcription.trim().length < 2) return;

          console.log(`🎤 Heard: "${transcription}"`);

          const lowerText = transcription.toLowerCase().trim();
          const wakePatterns = [
            /\baxiom\b/i, /^hey\b/i, /^hi\b/i, /^ok\b/i, /^yo\b/i, /\bbot\b/i, /^hello\b/i,
            /\?$/, /\bcan you\b/i, /\btell me\b/i, /\bwhat is\b/i, /\bhow do\b/i, /\bwhy\b/i,
          ];

          const hasWakeWord = wakePatterns.some(pattern => pattern.test(lowerText));

          if (hasWakeWord) {
            let question = transcription
              .replace(/\b(hey|hi|ok|yo)?\s*axiom\b/gi, '')
              .replace(/^(hey|hi|ok|yo|hello)\s*/i, '')
              .trim();

            if (question.length <= 2) question = transcription.trim();

            if (question.length <= 2) {
              await speakInVC(guildId, "Yes? What would you like to know?");
              return;
            }

            if (textChannel) {
              const queueStatus = isBotSpeaking ? ' (queued)' : '';
              await textChannel.send(`🎤 **Voice:** "${transcription}"${queueStatus}`).catch(() => {});
            }

            if (isBotSpeaking) {
              queueVoiceResponse(guildId, question, textChannel, userId);
              return;
            }

            const response = await askAI(question);
            if (response) {
              await speakInVC(guildId, response);
              if (textChannel) {
                let displayResponse = response;
                if (displayResponse.length > CONFIG.MAX_RESPONSE_LENGTH) {
                  displayResponse = displayResponse.slice(0, CONFIG.MAX_RESPONSE_LENGTH - 30) + '\n\n*...*';
                }
                await textChannel.send(`🔊 **Axiom:** ${displayResponse}`).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.log('Transcription error:', err.message);
        }
      });

      audioStream.on('error', () => cleanup());
      audioStream.on('close', () => cleanup());
    } catch (err) {
      cleanup();
    }
  });
}

function createWavBuffer(pcmBuffer, sampleRate, channels) {
  const bytesPerSample = 2;
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;
  const buffer = Buffer.alloc(fileSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

async function transcribeAudio(wavBuffer) {
  try {
    const tempFile = join(tmpdir(), `axiom_voice_${Date.now()}.wav`);
    const writeStream = createWriteStream(tempFile);
    writeStream.write(wavBuffer);
    writeStream.end();
    await new Promise(resolve => writeStream.on('finish', resolve));

    // Use groq-rag's underlying Groq client for transcription
    const { createReadStream } = await import('fs');
    const transcription = await groqClient.client.audio.transcriptions.create({
      file: createReadStream(tempFile),
      model: 'whisper-large-v3-turbo',
      language: 'en',
    });

    try { if (existsSync(tempFile)) unlinkSync(tempFile); } catch (e) {}

    return transcription.text;
  } catch (error) {
    console.error('Transcription error:', error.message);
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
    botSpeaking.set(guildId, true);

    const audioBuffer = await textToSpeech(cleanTextForTTS(text), null, guildId);
    const tempFile = join(tmpdir(), `axiom_tts_${Date.now()}.mp3`);
    const writeStream = createWriteStream(tempFile);
    writeStream.write(audioBuffer);
    writeStream.end();

    await new Promise(resolve => writeStream.on('finish', resolve));

    const resource = createAudioResource(tempFile);
    voiceData.player.play(resource);

    voiceData.player.once(AudioPlayerStatus.Idle, () => {
      setTimeout(() => {
        botSpeaking.set(guildId, false);
        processVoiceQueue(guildId);
      }, 500);
      try { if (existsSync(tempFile)) unlinkSync(tempFile); } catch (e) {}
    });

    setTimeout(() => {
      if (botSpeaking.get(guildId)) {
        botSpeaking.set(guildId, false);
        processVoiceQueue(guildId);
      }
    }, 60000);

    return { success: true, message: '🔊 Speaking...' };
  } catch (error) {
    console.error('Speak error:', error);
    botSpeaking.set(guildId, false);
    return { success: false, message: '❌ Failed to speak. Please try again.' };
  }
}

// =============================================================================
// Message Context
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
      } catch (e) {}
    }
    return context;
  } catch (e) {
    return null;
  }
}

// =============================================================================
// Send Response
// =============================================================================

async function sendResponse(target, content, withTTS = false, guildId = null) {
  let response = content;
  if (response.length > CONFIG.MAX_RESPONSE_LENGTH) {
    response = response.slice(0, CONFIG.MAX_RESPONSE_LENGTH - 30) + '\n\n*... (truncated)*';
  }

  const payload = { content: response };

  if (withTTS && CONFIG.TTS_WITH_AI) {
    try {
      const audio = await textToSpeech(cleanTextForTTS(response), null, guildId);
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
// Message Handler
// =============================================================================

async function handleMessage(message) {
  if (message.author.bot) return;

  const botMentioned = message.mentions.has(discordClient.user);
  const content = message.content.replace(/<@!?\d+>/g, '').trim();
  const isCommand = message.content.startsWith(CONFIG.COMMAND_PREFIX);

  if (!botMentioned && !isCommand) return;

  await message.channel.sendTyping();
  const typingInterval = setInterval(() => message.channel.sendTyping().catch(() => {}), 5000);

  try {
    const refContext = await getReferencedContext(message);
    const imageAtt = message.attachments.find(a => isValidImage(a));
    let imageText = null;

    if (imageAtt) {
      try {
        imageText = await extractTextFromImage(imageAtt.url);
      } catch (e) {}
    }

    let prompt = '';
    if (refContext) {
      prompt += `[Replying to ${refContext.author}]: "${refContext.text}"\n`;
      if (refContext.image) prompt += `[Image text: "${refContext.image}"]\n`;
    }
    if (imageText) prompt += `[Attached image text: "${imageText}"]\n`;

    let userQuery = content;
    let commandType = 'default';
    let useWebSearch = false;
    let useAgent = false;

    if (isCommand) {
      const args = content.slice(CONFIG.COMMAND_PREFIX.length).trim().split(/\s+/);
      const cmd = args.shift()?.toLowerCase();

      switch (cmd) {
        case 'search':
          userQuery = args.join(' ');
          useWebSearch = true;
          break;
        case 'agent':
          userQuery = args.join(' ');
          useAgent = true;
          break;
        case 'ask':
          userQuery = args.join(' ');
          break;
        case 'speak':
          const ttsText = args.join(' ');
          if (ttsText) {
            const audio = await textToSpeech(ttsText, null, message.guildId);
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
          userQuery = `Give a playful roast for ${target?.username || 'this person'}`;
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
          await message.reply({ embeds: [createHelpEmbed()] });
          return;
        case 'about':
          await message.reply({ embeds: [createAboutEmbed()] });
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

    let response;
    if (useAgent) {
      response = await runAgent(prompt);
    } else if (useWebSearch) {
      response = await webSearchChat(prompt, message.channelId, message.author.id);
    } else {
      response = await askAI(prompt, CONFIG.PROMPTS[commandType] || CONFIG.PROMPTS.default, message.channelId, message.author.id);
    }

    await sendResponse(message, response, CONFIG.TTS_WITH_AI, message.guildId);
  } catch (error) {
    console.error('Message handler error:', error);
    await message.reply('❌ Something went wrong. Please try again.').catch(() => {});
  } finally {
    clearInterval(typingInterval);
  }
}

// =============================================================================
// Embed Builders
// =============================================================================

function createHelpEmbed() {
  return new EmbedBuilder()
    .setTitle('🤖 Axiom v2.0 Commands')
    .setColor(0x5865f2)
    .setDescription(
      '**🔍 AI & Search**\n' +
      '`/ask` - Ask anything\n' +
      '`/search` - Web search for real-time info\n' +
      '`/agent` - AI agent for complex tasks\n' +
      '`/research` - Deep research with sources\n\n' +
      '**🌐 Web & URL**\n' +
      '`/url` - Analyze any webpage\n' +
      '`/fetch` - Fetch raw URL content\n\n' +
      '**📚 Knowledge Base (RAG)**\n' +
      '`/learn` - Teach Axiom new info\n' +
      '`/learn-url` - Learn from a URL\n' +
      '`/recall` - Query knowledge base\n' +
      '`/knowledge` - View KB stats\n' +
      '`/forget` - Clear KB (Admin)\n\n' +
      '**🔊 Voice & TTS**\n' +
      '`/speak` - Text to speech (Orpheus)\n' +
      '`/voice-set` - Set default voice\n' +
      '`/join` `/leave` `/say` `/talk`\n\n' +
      '**✨ Utilities**\n' +
      '`/eli5` `/summarize` `/translate` `/define` `/code`\n\n' +
      '**🎉 Fun**\n' +
      '`/joke` `/fact` `/quote` `/roast` `/advice` `/story`'
    )
    .setFooter({ text: 'Powered by groq-rag & Orpheus TTS' });
}

function createAboutEmbed() {
  return new EmbedBuilder()
    .setTitle('🤖 About Axiom v2.0')
    .setColor(0x00d4ff)
    .setDescription('**Axiom** is an advanced AI-powered Discord bot with RAG knowledge base, real-time web search, autonomous agents, and high-quality Orpheus text-to-speech.')
    .addFields(
      { name: '👨‍💻 Created By', value: CONFIG.CREDITS.creators.join('\n'), inline: true },
      { name: '🏢 Team', value: CONFIG.CREDITS.team, inline: true },
      { name: '📦 Version', value: `v${CONFIG.CREDITS.version}`, inline: true },
      {
        name: '⚡ Powered By',
        value: '• **Groq RAG** (Knowledge Base)\n• **Groq LLM** (Llama 3.3 70B)\n• **Orpheus TTS** (6 Voices)\n• **Web Search** (Real-time)\n• **Agents** (Autonomous AI)',
        inline: false,
      },
      {
        name: '✨ Features',
        value: '• RAG Knowledge Base per Server\n• Real-time Web Search\n• Autonomous AI Agents\n• Conversation Memory\n• 19 TTS Voices\n• Voice Channel Support\n• Image OCR Analysis',
        inline: false,
      },
      {
        name: '🌐 Connect With Us',
        value: `📸 [Instagram](${CONFIG.CREDITS.socials.instagram})\n▶️ [YouTube](${CONFIG.CREDITS.socials.youtube})\n📱 [Play Store](${CONFIG.CREDITS.socials.playstore})\n📧 ${CONFIG.CREDITS.socials.email}`,
        inline: false,
      }
    )
    .setThumbnail(discordClient.user?.displayAvatarURL())
    .setFooter({ text: `Made with ❤️ by ${CONFIG.CREDITS.team}` })
    .setTimestamp();
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
      // AI Commands
      case 'ask':
        response = await askAI(
          interaction.options.getString('question'),
          CONFIG.PROMPTS.default,
          interaction.channelId,
          interaction.user.id
        );
        break;

      case 'search':
        response = await webSearchChat(
          interaction.options.getString('query'),
          interaction.channelId,
          interaction.user.id
        );
        withTTS = false;
        break;

      case 'agent':
        await interaction.editReply('🤖 Agent is working on your task...');
        response = await runAgent(interaction.options.getString('task'));
        withTTS = false;
        break;

      case 'research':
        await interaction.editReply('🔬 Researching... This may take a moment.');
        response = await researchTopic(interaction.options.getString('topic'));
        withTTS = false;
        break;

      case 'url':
        const analyzeUrl = interaction.options.getString('url');
        const urlQuestion = interaction.options.getString('question');
        await interaction.editReply('🌐 Analyzing URL...');
        response = await urlChat(analyzeUrl, urlQuestion);
        withTTS = false;
        break;

      case 'fetch':
        const fetchUrl = interaction.options.getString('url');
        await interaction.editReply('📥 Fetching content...');
        response = await webFetch(fetchUrl);
        withTTS = false;
        break;

      // RAG Commands
      case 'learn':
        const learnContent = interaction.options.getString('content');
        const source = interaction.options.getString('source') || 'user-input';

        try {
          const rag = await getGuildRAG(interaction.guildId);
          await rag.client.rag.addDocument(learnContent, { source, addedBy: interaction.user.username });
          rag.documents.push({ content: learnContent, metadata: { source, addedBy: interaction.user.username } });
          await saveGuildRAG(interaction.guildId);
          response = `✅ Learned new information! (Source: ${source})`;
        } catch (e) {
          response = `❌ Failed to learn: ${e.message}`;
        }
        withTTS = false;
        break;

      case 'learn-url':
        const url = interaction.options.getString('url');
        try {
          await interaction.editReply('📖 Reading URL...');
          const rag = await getGuildRAG(interaction.guildId);
          await rag.client.rag.addUrl(url);
          rag.documents.push({ content: `[URL Content from ${url}]`, metadata: { source: url } });
          await saveGuildRAG(interaction.guildId);
          response = `✅ Learned from URL: ${url}`;
        } catch (e) {
          response = `❌ Failed to learn from URL: ${e.message}`;
        }
        withTTS = false;
        break;

      case 'recall':
        const query = interaction.options.getString('query');
        const ragResponse = await ragChat(interaction.guildId, query);
        response = ragResponse || '❌ No relevant information found in knowledge base.';
        withTTS = false;
        break;

      case 'forget':
        if (!interaction.member.permissions.has('Administrator')) {
          response = '❌ Only administrators can clear the knowledge base.';
        } else {
          try {
            const rag = await getGuildRAG(interaction.guildId);
            await rag.client.rag.clear();
            rag.documents = [];
            await saveGuildRAG(interaction.guildId);
            response = '🗑️ Knowledge base cleared!';
          } catch (e) {
            response = `❌ Failed to clear: ${e.message}`;
          }
        }
        withTTS = false;
        break;

      case 'knowledge':
        const kbRag = await getGuildRAG(interaction.guildId);
        response = `📚 **Knowledge Base Stats**\n• Documents: ${kbRag.documents.length}\n• Server: ${interaction.guild.name}`;
        withTTS = false;
        break;

      // TTS Commands
      case 'speak':
        const text = interaction.options.getString('text');
        const voice = interaction.options.getString('voice');
        try {
          const audio = await textToSpeech(text, voice, interaction.guildId);
          await interaction.editReply({
            content: `🔊 Voice: ${voice || guildVoiceSettings.get(interaction.guildId) || CONFIG.TTS_VOICE}`,
            files: [new AttachmentBuilder(audio, { name: 'speech.mp3' })],
          });
        } catch (e) {
          await interaction.editReply(`❌ TTS failed: ${e.message}`);
        }
        return;

      case 'voice-set':
        const newVoice = interaction.options.getString('voice');
        guildVoiceSettings.set(interaction.guildId, newVoice);
        response = `✅ Default voice set to **${newVoice}**`;
        withTTS = false;
        break;

      // Classic Commands
      case 'summarize':
        response = await askAI(interaction.options.getString('text'), CONFIG.PROMPTS.summarize);
        break;

      case 'translate':
        const toTranslate = interaction.options.getString('text');
        const targetLang = interaction.options.getString('to');
        response = await askAI(`Translate to ${targetLang}: "${toTranslate}"`, CONFIG.PROMPTS.translate);
        break;

      case 'eli5':
        response = await askAI(interaction.options.getString('topic'), CONFIG.PROMPTS.eli5);
        break;

      case 'define':
        response = await askAI(`Define: ${interaction.options.getString('word')}`, CONFIG.PROMPTS.define);
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
        withTTS = false;
        break;

      case 'story':
        response = await askAI(`Write a short story: ${interaction.options.getString('prompt')}`, CONFIG.PROMPTS.creative);
        break;

      case 'help':
        await interaction.editReply({ embeds: [createHelpEmbed()] });
        return;

      case 'about':
        await interaction.editReply({ embeds: [createAboutEmbed()] });
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
        if (!voiceConnections.has(interaction.guildId)) {
          const autoJoin = await joinVC(interaction);
          if (!autoJoin.success) {
            await interaction.editReply(autoJoin.message);
            return;
          }
          await interaction.editReply(`${autoJoin.message}\n\n🤔 Thinking...`);
        } else {
          await interaction.editReply('🤔 Thinking...');
        }

        const aiResponse = await askAI(question, CONFIG.PROMPTS.default, interaction.channelId, interaction.user.id);
        const talkResult = await speakInVC(interaction.guildId, aiResponse);

        let displayResponse = aiResponse;
        if (displayResponse.length > CONFIG.MAX_RESPONSE_LENGTH) {
          displayResponse = displayResponse.slice(0, CONFIG.MAX_RESPONSE_LENGTH - 30) + '\n\n*...*';
        }
        await interaction.editReply(`${talkResult.success ? '🔊' : '💬'} ${displayResponse}`);
        return;

      // Memory Commands
      case 'clear-memory':
        clearConversationHistory(interaction.channelId, interaction.user.id);
        response = '🧹 Conversation memory cleared!';
        withTTS = false;
        break;
    }

    await sendResponse(interaction, response, withTTS, interaction.guildId);
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
  console.log(`✅ Axiom Bot v2.0 logged in as: ${discordClient.user.tag}`);
  console.log(`📊 Serving ${discordClient.guilds.cache.size} server(s)`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 Features:');
  console.log('  • Groq RAG - Per-server knowledge base');
  console.log('  • Web Search - Real-time information');
  console.log('  • AI Agents - Autonomous task execution');
  console.log('  • Orpheus TTS - 6 expressive voices');
  console.log('  • Voice Channels - Listen & respond');
  console.log('  • Conversation Memory - Context awareness');
  console.log('  • Image OCR - Text extraction');
  console.log('═══════════════════════════════════════════════════════════════');

  discordClient.user.setActivity('/help | Axiom v2.0', { type: 0 });
  await registerSlashCommands();
});

discordClient.on('messageCreate', handleMessage);
discordClient.on('interactionCreate', handleSlashCommand);
discordClient.on('error', console.error);

// Auto-leave empty voice channels
discordClient.on('voiceStateUpdate', (oldState, newState) => {
  if (oldState.channelId && oldState.channelId !== newState.channelId) {
    const channel = oldState.channel;
    if (!channel) return;

    const botVoiceData = voiceConnections.get(oldState.guild.id);
    if (!botVoiceData || botVoiceData.channelId !== oldState.channelId) return;

    const humanMembers = channel.members.filter(member => !member.user.bot).size;

    if (humanMembers === 0) {
      console.log(`👋 No users left in voice channel, leaving in 10 seconds...`);

      setTimeout(() => {
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
  console.log('\n🛑 Shutting down gracefully...');
  discordClient.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  discordClient.destroy();
  process.exit(0);
});

// =============================================================================
// Start Bot
// =============================================================================

console.log('🚀 Starting Axiom Bot v2.0 - Ultimate Edition...\n');
discordClient.login(CONFIG.DISCORD_TOKEN);
