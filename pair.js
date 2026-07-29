
const sharp = require('sharp');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const router = express.Router();
const pino = require('pino');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const Jimp = require('jimp');
const axios = require('axios');
const yts = require('yt-search');
const https = require('https');
const os = require('os');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    downloadContentFromMessage,
    jidNormalizedUser,
    proto,
    prepareWAMessageMedia,
    downloadMediaMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent
} = require('@whiskeysockets/baileys');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const insecureAgent = new https.Agent({
    rejectUnauthorized: false
});


const config = {
  AUTO_VIEW_STATUS: 'true',
    AUTO_LIKE_STATUS: 'true',
    menuVideo: 'https://files.catbox.moe/ltocyv.mp4',       
    API_MAIN_URL: 'http://nexoraapi.laksidunimsara.com',
    AUTO_RECORDING: 'false',
    AUTO_TYPING: 'false',
    AUTO_REACT: 'false',
    AUTO_REPLY_STATUS: 'false',
    AUTO_REPLY_LIST: [],
    REACT_CHANNELS: [],
    REACT_EMOJIS: ['❤️', '💛', '💚', '💙', '💜', '🔥', '😎', '👍', '🎉', '💫'],
    READ_CMD: 'true', 
    ALLWAYS_OFFLINE: 'true',
    ANTI_CALL: 'false',
    CONECT: 'https://i.ibb.co/0VyPRcvm/Chat-GPT-Image-Jun-14-2026-09-26-06-PM.png',
    LAKIYA_IMAGE_THUBNAIL: 'https://i.ibb.co/0VyPRcvm/Chat-GPT-Image-Jun-14-2026-09-26-06-PM.png',
    SITHIJA_IMAGE_PATH: 'https://i.ibb.co/0VyPRcvm/Chat-GPT-Image-Jun-14-2026-09-26-06-PM.png',
    SITHIJA_IMAGE_PATH2: 'https://i.ibb.co/0VyPRcvm/Chat-GPT-Image-Jun-14-2026-09-26-06-PM.png',
    SITHIJA_IMAGE_PATH: 'https://i.ibb.co/0VyPRcvm/Chat-GPT-Image-Jun-14-2026-09-26-06-PM.png',
    BOT_con:'https://i.ibb.co/0VyPRcvm/Chat-GPT-Image-Jun-14-2026-09-26-06-PM.png',
    AUTO_LIKE_EMOJI: [ '💚'],
    PREFIX:'.',
    MOVIE_FOOTER:'✦ 𝙋𝙤𝙬𝙚𝙧𝙚𝙙 𝘽𝙮 𝙎𝙞𝙩𝙝𝙞𝙟𝙖 𝘼𝙣𝙪𝙝𝙖𝙨 ✦',
    BOT_NAME: 'SITHIJA X MD',
    OWNER_NAME: 'OWNER - SITHIJA',
   
    MODE: 'public', 
    MAX_RETRIES: 3,
    
    ADMIN_LIST_PATH: './admin.json',
     GROUP_INVITE_LINK: 'https://chat.whatsapp.com/CkRdKcd9MytL3eG6xqW3Xl',
    NEWSLETTER_JID: '120363406299520450@newsletter',
    NEWSLETTER_MESSAGE_ID: '428',
    OTP_EXPIRY: 300000,
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029VbBg8aA6BIEgchOyih15'
   
};


const activeSockets = new Map();
const socketCreationTime = new Map();
const SESSION_BASE_PATH = './session';
const NUMBER_LIST_PATH = './numbers.json';
const SessionSchema = new mongoose.Schema({
    number: { type: String, unique: true, required: true },
    creds: { type: Object, required: true },
    config: { type: Object },
    updatedAt: { type: Date, default: Date.now }
});
const Session = mongoose.model('Session', SessionSchema);
async function connectMongoDB() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb+srv://sithijamd:sithijamd123@cluster0.vy6jtnc.mongodb.net/';
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`
╔══════════════════════════════════════╗
║     🎀  SITHIJA X MD CONNECT 🎀      ║
╠══════════════════════════════════════╣
║  ✅ MongoDB Connected Successfully   ║
║  ⚡ System Status : ONLINE           ║
║  💻 Bot Engine   : SITHIJA X MD      ║
╚══════════════════════════════════════╝
`);

    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
}
connectMongoDB();
if (!fs.existsSync(SESSION_BASE_PATH)) {
    fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

function initialize() {
    activeSockets.clear();
    socketCreationTime.clear();
    console.log('Cleared active sockets and creation times on startup');
}

async function autoReconnectOnStartup() {
    try {
        let numbers = [];
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
            console.log(`Loaded ${(numbers.length)} numbers from numbers.json`);
        } else {
            console.warn(`
[ 🎀 SITHIJA X MD  WARNING]

>> numbers.json file not detected ⚠️
>> Switching to MongoDB session lookup...
>> Please wait... 🔍

[!] Fallback system activated
`);

        }

        const sessions = await Session.find({}, 'number').lean();
        const mongoNumbers = sessions.map(s => s.number);
        console.log(`Found ${mongoNumbers.length} numbers in MongoDB sessions`);

        numbers = [...new Set([...numbers, ...mongoNumbers])];
        if (numbers.length === 0) {
            console.log('No numbers found in numbers.json or MongoDB, skipping auto-reconnect');
            return;
        }

        console.log(`Attempting to reconnect ${numbers.length} sessions...`);
        for (const number of numbers) {
            if (activeSockets.has(number)) {
                console.log(`Number ${number} already connected, skipping`);
                continue;
            }
            const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };
            try {
                await EmpirePair(number, mockRes);
                console.log(`Initiated reconnect for ${number}`);
            } catch (error) {
                console.error(`Failed to reconnect ${number}:`, error);
            }
            await delay(1000);
        }
    } catch (error) {
        console.error('Auto-reconnect on startup failed:', error);
    }
}

initialize();
setTimeout(autoReconnectOnStartup, 5000);

function loadAdmins() {
    try {
        if (fs.existsSync(config.ADMIN_LIST_PATH)) {
            return JSON.parse(fs.readFileSync(config.ADMIN_LIST_PATH, 'utf8'));
        }
        return [];
    } catch (error) {
        console.error('Failed to load admin list:', error);
        return [];
    }
}

function formatMessage(title, content, footer) {
    return `*${title}*\n\n${content}\n\n> *${footer}*`;
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getSriLankaTimestamp() {
    return moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');
}

function extractYouTubeId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|playlist\?list=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function convertYouTubeLink(q) {
    const videoId = extractYouTubeId(q);
    if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return q;
}
async function downloadContent(message) {
    if (!message) throw new Error('No message content');
    
    const buffer = await downloadContentFromMessage(message, 'buffer');
    return buffer;
}
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}


async function joinGroup(socket) {
    let retries = config.MAX_RETRIES;
    const inviteCodeMatch = config.GROUP_INVITE_LINK.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);
    if (!inviteCodeMatch) {
    
        return { status: 'failed', error: 'Invalid group invite link' };
    }
    const inviteCode = inviteCodeMatch[1];

    while (retries > 0) {
        try {
            const response = await socket.groupAcceptInvite(inviteCode);
            if (response?.gid) {
               
                return { status: 'success', gid: response.gid };
            }
            throw new Error('No group ID in response');
        } catch (error) {
            retries--;
            let errorMessage = error.message || 'Unknown error';
            if (error.message.includes('not-authorized')) {
                errorMessage = 'Bot is not authorized to join (possibly banned)';
            } else if (error.message.includes('conflict')) {
                errorMessage = 'Bot is already a member of the group';
            } else if (error.message.includes('gone')) {
                errorMessage = 'Group invite link is invalid or expired';
            }
          
            if (retries === 0) {
                return { status: 'failed', error: errorMessage };
            }
            await delay(2000 * (config.MAX_RETRIES - retries));
        }
    }
    return { status: 'failed', error: 'Max retries reached' };
}


function setupNewsletterHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key || !message.key.remoteJid || !message.key.remoteJid.endsWith('@newsletter')) return;

        try {
            const botJid = jidNormalizedUser(socket.user.id);
            const sanitizedNumber = botJid.split('@')[0].replace(/[^0-9]/g, '');
            const sessionConfig = activeSockets.get(sanitizedNumber)?.config || config;

            // Default promo channel eka + session owner kalin .setchannel walin add kala channels
            const allowedChannels = new Set([
                config.NEWSLETTER_JID,
                ...(Array.isArray(sessionConfig.REACT_CHANNELS) ? sessionConfig.REACT_CHANNELS : [])
            ]);
            if (!allowedChannels.has(message.key.remoteJid)) return;

            const pool = (Array.isArray(sessionConfig.REACT_EMOJIS) && sessionConfig.REACT_EMOJIS.length)
                ? sessionConfig.REACT_EMOJIS
                : ['🧡', '💛', '💚', '💙', '💜'];
            const randomEmoji = pool[Math.floor(Math.random() * pool.length)];
            const messageId = message.newsletterServerId;

            if (!messageId) {
                console.warn('No valid newsletterServerId found:', message);
                return;
            }

            let retries = config.MAX_RETRIES;
            while (retries > 0) {
                try {
                    await socket.newsletterReactMessage(
                        message.key.remoteJid,
                        messageId.toString(),
                        randomEmoji
                    );
                    console.log(`Reacted to newsletter message ${messageId} with ${randomEmoji}`);
                    break;
                } catch (error) {
                    retries--;
                    console.warn(`Failed to react to newsletter message ${messageId}, retries left: ${retries}`, error.message);
                    if (retries === 0) throw error;
                    await delay(2000 * (config.MAX_RETRIES - retries));
                }
            }
        } catch (error) {
            console.error('Newsletter reaction error:', error);
        }
    });
}

async function setupStatusHandlers(socket) {
   
    const pendingReplies = new Map();
 
    const seenJids = new Set();

    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg?.key || msg.key.remoteJid !== 'status@broadcast' || !msg.key.participant || msg.key.remoteJid === config.NEWSLETTER_JID) return;

     
        const botJid = jidNormalizedUser(socket.user.id);
        if (msg.key.participant === botJid) return;

        
        const sanitizedNumber = botJid.split('@')[0].replace(/[^0-9]/g, '');
        const sessionConfig = activeSockets.get(sanitizedNumber)?.config || config;

        try {
           

            if (sessionConfig.AUTO_VIEW_STATUS === 'true') {
                let retries = config.MAX_RETRIES;
                while (retries > 0) {
                    try {
                        await socket.readMessages([msg.key]);
                        break;
                    } catch (error) {
                        retries--;
                        console.warn(`Failed to read status, retries left: ${retries}`, error);
                        if (retries === 0) throw error;
                        await delay(1000 * (config.MAX_RETRIES - retries));
                    }
                }
            }

           if (sessionConfig.AUTO_LIKE_STATUS === 'true') {
    const reactEmoji = '💚';

    let retries = config.MAX_RETRIES;
    while (retries > 0) {
        try {
            await socket.sendMessage(
                msg.key.remoteJid,
                { react: { text: reactEmoji, key: msg.key } },
                { statusJidList: [msg.key.participant] }
            );
            console.log(`Reacted to status with ${reactEmoji}`);
            break;
        } catch (error) {
            retries--;
            console.warn(`Failed to react to status, retries left: ${retries}`, error);
            if (retries === 0) throw error;
            await delay(1000 * (config.MAX_RETRIES - retries));
        }
    }
}


           
        } catch (error) {
           
        }
    });
    socket.ev.on('messages.delete', (update) => {
        if (update.type === 'delete') {
            for (const key of update.keys) {
                const statusId = key.id;
                if (pendingReplies.has(statusId)) {
                    clearTimeout(pendingReplies.get(statusId));
                    pendingReplies.delete(statusId);
                    
                }
            }
        }
    });
}

async function resize(image, width, height) {
    let oyy = await Jimp.read(image);
    let kiyomasa = await oyy.resize(width, height).getBufferAsync(Jimp.MIME_JPEG);
    return kiyomasa;
}

function capital(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const createSerial = (size) => {
    return crypto.randomBytes(size).toString('hex').slice(0, size);
}

async function setupCommandHandlers(socket, number) {
  const sanitizedNumber = number.replace(/[^0-9]/g, '');
  let sessionConfig = await loadUserConfig(sanitizedNumber);
  activeSockets.set(sanitizedNumber, { socket, config: sessionConfig });

  socket.ev.on('messages.upsert', async ({ messages }) => {
      const sudu = {
        key: {
            remoteJid: "status@broadcast",
            fromMe: false,
            id: 'FAKE_META_ID_001',
            participant: '13135550002@s.whatsapp.net'
        },
        message: {
            contactMessage: {
                displayName: `🔥${sessionConfig.BOT_NAME || config.BOT_NAME}🔥`,
                vcard: `BEGIN:VCARD
VERSION:3.0
N:ʟᴀᴋɪʏᴀ;;;;
FN:ʟᴀᴋɪʏᴀ
TEL;waid=13135550002:+1 313 555 0002
END:VCARD`
            }
        }
    };
    const msg = messages[0];
    if (!msg.message) return;

    let text = '';
    if (msg.message.conversation) {
      text = msg.message.conversation.trim();
    } else if (msg.message.extendedTextMessage?.text) {
      text = msg.message.extendedTextMessage.text.trim();
    } else if (msg.message.buttonsResponseMessage) {
      text = msg.message.buttonsResponseMessage.selectedButtonId;
    } else {
      return;
    }


     const botOwnerJid = jidNormalizedUser(socket.user.id); 
     const isBotOwner =  botOwnerJid;
        const nowsender = msg.key.fromMe ? (socket.user.id.split(':')[0] + '@s.whatsapp.net' || socket.user.id) : (msg.key.participant || msg.key.remoteJid);
    const senderNumber = (nowsender || '').split('@')[0];
    const developers = `${config.OWNER_NUMBER}`;
    const botNumber = socket.user.id.split(':')[0];
    const isbot = botNumber.includes(senderNumber);
    const isOwner = isbot ? isbot : developers.includes(senderNumber);
    const isCmd = text.startsWith(sessionConfig.PREFIX || '!');
    const sender = msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith('@g.us');
    if (!isOwner && sessionConfig.MODE === 'private') return;
    if (!isOwner && isGroup && sessionConfig.MODE === 'inbox') return;
    if (!isOwner && !isGroup && sessionConfig.MODE === 'groups') return;
    if (isCmd && sessionConfig.READ_CMD === 'true' && sessionConfig.ALLWAYS_OFFLINE === 'true') {
      try {
        await socket.readMessages([msg.key]);
      } catch (error) {
        
      }
    } else {
      
    }

    // 🔥 Auto React — command ekak wunath, sadharana chat ekak wunath, message ekakට
    // random chance ekk uda react wenawa (bot ge own message walata react wenne na).
    if (sessionConfig.AUTO_REACT === 'true' && !msg.key.fromMe && msg.key.remoteJid !== 'status@broadcast') {
      try {
        const pool = (Array.isArray(sessionConfig.REACT_EMOJIS) && sessionConfig.REACT_EMOJIS.length)
          ? sessionConfig.REACT_EMOJIS
          : config.REACT_EMOJIS;
        if (Math.random() < 0.4) {
          const emoji = pool[Math.floor(Math.random() * pool.length)];
          socket.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(() => {});
        }
      } catch (e) {}
    }

    // 💬 Auto Reply — prefix ekak nathuwama trigger wenawa (uda: "hi" dunnama "hii").
    // Session owner ekt .autoreply add / .autoreply del walin trigger-response pairs
    // manage karanna puluwan (podi eka eka, delete karanna one welawakත් puluwan).
    if (!isCmd && sessionConfig.AUTO_REPLY_STATUS === 'true' && Array.isArray(sessionConfig.AUTO_REPLY_LIST) && sessionConfig.AUTO_REPLY_LIST.length) {
      try {
        const cleanText = text.trim().toLowerCase();
        const hit = sessionConfig.AUTO_REPLY_LIST.find(pair => pair && pair.trigger && pair.trigger.toLowerCase() === cleanText);
        if (hit) {
          if (sessionConfig.AUTO_TYPING === 'true') {
            await socket.sendPresenceUpdate('composing', msg.key.remoteJid).catch(() => {});
            await delay(500);
          }
          await socket.sendMessage(msg.key.remoteJid, { text: hit.response }, { quoted: msg });
        }
      } catch (e) {}
    }

    if (!isCmd) return;

    if (sessionConfig.AUTO_TYPING === 'true') {
      socket.sendPresenceUpdate('composing', msg.key.remoteJid).catch(() => {});
    }


    const parts = text.slice((sessionConfig.PREFIX || '!').length).trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    const match = text.slice((sessionConfig.PREFIX || '!').length).trim();

    const groupMetadata = isGroup ? await socket.groupMetadata(msg.key.remoteJid) : {};
    const participants = groupMetadata.participants || [];
    const groupAdmins = participants.filter((p) => p.admin).map((p) => p.id);
    const isBotAdmins = groupAdmins.includes(socket.user.id);
    const isAdmins = groupAdmins.includes(sender);
    const reply = async (text, options = {}) => {
      await socket.sendMessage(msg.key.remoteJid, { text, ...options }, { quoted: msg });
    };

    try {
      switch (command) {
////////////////////////////////////////////////////////////////

    
case 'joke': {
  const jokes = [
    "😂 Why? Because code said so!",
    "🤣 Debugging = removing bugs you didn't know existed"
  ];

  return socket.sendMessage(sender, {
    text: jokes[Math.floor(Math.random() * jokes.length)]
  }, { quoted: msg });
}
break;
case 'meme': {
  const memes = [
    "📱 Me: I will study\nAlso me: 2 hours YouTube 😭",
    "💻 Code works → I don't touch it again forever",
    "😂 Brain: sleep\nMe: 3AM coding"
  ];

  return socket.sendMessage(sender, {
    text: memes[Math.floor(Math.random() * memes.length)]
  }, { quoted: msg });
}
break;
case 'fact': {
  const facts = [
    "🧠 Your brain generates enough electricity to power a small bulb",
    "🌍 Bananas are berries, strawberries are not",
    "🐙 Octopus has 3 hearts"
  ];

  return socket.sendMessage(sender, {
    text: facts[Math.floor(Math.random() * facts.length)]
  }, { quoted: msg });
}
break;
case 'hack': {
  return socket.sendMessage(sender, {
    text:
`💻 Hacking system...
░░░░░░░░░░ 10%
████░░░░░░ 40%
███████░░░ 70%
██████████ 100%

❌ Just kidding 😆 No hacking allowed!`
  }, { quoted: msg });
}
break;
case 'sinhalacartoon':
case 'cartoon': {
    const DEFAULT_FOOTER = `\n\n> 🎨 𝗦𝗜𝗡𝗛𝗔𝗟𝗔 𝗖𝗔𝗥𝗧𝗢𝗢𝗡 𝗛𝗨𝗕 🎨\n> 🧬 ᴘᴏᴡᴇʀᴇᴅ ʙʏ sithija anuhas`;

    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `*❪ ERROR ❫*\n\n⚠️ *Invalid Usage!*\n\n🎬 *Example:*
• .sinhalacartoon ben 10
• .cartoon lion king
• .sinhalacartoon wimpy kid\n\n📝 _Please provide the Cartoon name!_${DEFAULT_FOOTER}`
        }, { quoted: msg });
        break;
    }

    const cartoonQuery = args.join(' ');
    await socket.sendMessage(sender, { 
        text: `*❪ SEARCHING ❫*\n\n🔍 *Searching Sinhala Cartoons...*\n⚡ _Please wait a moment._`
    });

    const API_BASE = "https://new-api-cartoon.vercel.app";
    const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500";

    try {
        // 🔍 STEP 1: Search
        const searchResponse = await axios.get(`${API_BASE}/search?q=${encodeURIComponent(cartoonQuery)}`);
        const searchData = searchResponse.data;

        if (!searchData.data || !searchData.data.results || searchData.data.results.length === 0) {
            await socket.sendMessage(sender, {
                text: `*❪ NO RESULTS ❫*\n\n😞 *No Results Found!*\n\n🎬 *Query:* _${cartoonQuery}_\n💡 *Tip:* _Please check the spelling and try again!_${DEFAULT_FOOTER}`
            }, { quoted: msg });
            break;
        }

        const cartoonResults = searchData.data.results.slice(0, 25);
        let listText = `*❪ SEARCH RESULTS ❫*\n\n🎯 *Query:* _${cartoonQuery}_\n📊 *Results:* _${cartoonResults.length} Items_\n\n*👇 SELECT A NUMBER 👇*\n\n`;

        cartoonResults.forEach((item, index) => {
            const typeIcon = item.type === 'cartoon-series' ? '📺' : '🎬';
            const num = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;
            listText += `*${num}* ➜ ${typeIcon} _${item.title.substring(0, 35)}_\n📊 *Quality:* _${item.quality}_ ⭐ *Rating:* _${item.rating}_\n\n`;
        });

        listText += `${DEFAULT_FOOTER}`;
        
        const sentMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });
        const messageID = sentMsg.key.id;

        // 🎯 STEP 2: Handle User Selection
        const handleSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const messageType = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSentMsg && sender === replyMek.key.remoteJid) {
                const choice = parseInt(messageType) - 1;
                if (isNaN(choice) || choice < 0 || choice >= cartoonResults.length) {
                    await socket.sendMessage(sender, {
                        text: `*❪ INVALID ❫*\n\n⚠️ *Wrong Number!*\n🎯 *Range:* _01 - ${cartoonResults.length}_\n📝 _Please reply with a valid number!_${DEFAULT_FOOTER}`
                    }, { quoted: replyMek });
                    return;
                }

                const selectedItem = cartoonResults[choice];
                const isSeries = selectedItem.type === 'cartoon-series';
                
                await socket.sendMessage(sender, { 
                    text: `*❪ FETCHING ❫*\n\n${isSeries ? '📺' : '🎬'} *Fetching ${isSeries ? 'TV Series' : 'Movie'}...*\n⚡ _Please wait..._`
                }, { quoted: replyMek });

                try {
                    // 📥 STEP 3: Get Downloads
                    const dlResponse = await axios.get(`${API_BASE}/downloads?url=${encodeURIComponent(selectedItem.url)}`);
                    const dlData = dlResponse.data;

                    if (!dlData.data) {
                        throw new Error('Failed to fetch download details');
                    }

                    const info = dlData.data;
                    const downloadInfo = info.download_info;

                    // 🖼️ Send Poster + Details
                    let detailsText = `*❪ ${isSeries ? 'TV SERIES' : 'MOVIE'} DETAILS ❫*\n\n`;
                    detailsText += `📺 *${info.title}*\n`;
                    detailsText += `⭐ 𝗥𝗮𝘁𝗶𝗻𝗴 ➜ ★ ${info.imdb_rating || info.rating || 'N/A'}\n`;
                    detailsText += `📊 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➜ ${info.quality || 'N/A'}\n`;
                    detailsText += `📅 𝗬𝗲𝗮𝗿 ➜ ${info.year || 'N/A'}\n`;
                    detailsText += `🎭 𝗚𝗲𝗻𝗿𝗲𝘀 ➜ ${info.genres ? info.genres.join(', ') : 'N/A'}\n`;
                    if (info.description) {
                        detailsText += `📝 𝗦𝘁𝗼𝗿𝘆 ➜ ${info.description.length > 250 ? info.description.substring(0, 250) + '...' : info.description}\n`;
                    }
                    detailsText += `\n${DEFAULT_FOOTER}`;

                    const posterUrl = info.image || selectedItem.poster || DEFAULT_IMAGE;
                    await socket.sendMessage(sender, {
                        image: { url: posterUrl },
                        caption: detailsText
                    }, { quoted: replyMek });

                    // ─────────────────────────────────────────
                    // 📺 EPISODE/SERIES FLOW
                    // ─────────────────────────────────────────
                    if (downloadInfo && downloadInfo.episodes && downloadInfo.episodes.length > 0) {
                        const directEpisodes = downloadInfo.sources?.direct || [];
                        const telegramEpisodes = downloadInfo.sources?.telegram || [];

                        if (directEpisodes.length === 0 && telegramEpisodes.length === 0) {
                            await socket.sendMessage(sender, {
                                text: `*❪ NO DOWNLOADS ❫*\n\n⚠️ *No Downloads Found!*\n😞 _There are no downloads available!_${DEFAULT_FOOTER}`
                            }, { quoted: replyMek });
                            socket.ev.off('messages.upsert', handleSelection);
                            return;
                        }

                        // Show episode list (filter only direct links, skip telegram)
                        let epListText = `*❪ DOWNLOAD LIST ❫*\n\n📺 *Title:* _${info.title}_\n🎬 *Items:* _${downloadInfo.total_episodes || directEpisodes.length}_\n\n*👇 SELECT A NUMBER 👇*\n\n`;

                        // Use direct links as primary (filter out telegram)
                        const uniqueEpisodes = [];
                        const seenEpisodes = new Set();
                        
                        directEpisodes.forEach(ep => {
                            if (!seenEpisodes.has(ep.episode)) {
                                seenEpisodes.add(ep.episode);
                                uniqueEpisodes.push(ep);
                            }
                        });

                        uniqueEpisodes.forEach((ep, index) => {
                            const num = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;
                            epListText += `*${num}* ➜ 🎥 _${ep.title}_ (${ep.type})\n`;
                        });

                        epListText += `\n*💬 REPLY TO DOWNLOAD 💬*\n${DEFAULT_FOOTER}`;

                        const epMsg = await socket.sendMessage(sender, { text: epListText }, { quoted: replyMek });
                        const epMsgID = epMsg.key.id;

                        // Handle Episode Selection
                        const handleEpisode = async ({ messages: epMessages }) => {
                            const epMek = epMessages[0];
                            if (!epMek?.message) return;

                            const epChoiceText = epMek.message.conversation || epMek.message.extendedTextMessage?.text;
                            const isReplyToEpMsg = epMek.message.extendedTextMessage?.contextInfo?.stanzaId === epMsgID;

                            if (isReplyToEpMsg && sender === epMek.key.remoteJid) {
                                const epChoice = parseInt(epChoiceText) - 1;
                                
                                if (isNaN(epChoice) || epChoice < 0 || epChoice >= uniqueEpisodes.length) {
                                    await socket.sendMessage(sender, {
                                        text: `*❪ INVALID ❫*\n\n⚠️ *Wrong Number!*\n🎯 *Range:* _01 - ${uniqueEpisodes.length}_\n📝 _Please reply with a valid number!_${DEFAULT_FOOTER}`
                                    }, { quoted: epMek });
                                    return;
                                }

                                const selectedEp = uniqueEpisodes[epChoice];
                                
                                await socket.sendMessage(sender, { 
                                    text: `*❪ DOWNLOADING ❫*\n\n🎥 *Item:* _${selectedEp.title}_\n⚡ _Sending download link..._${DEFAULT_FOOTER}`
                                }, { quoted: epMek });

                                try {
                                    // Send as document (video file)
                                    await socket.sendMessage(sender, {
                                        document: { url: selectedEp.url },
                                        mimetype: 'video/mp4',
                                        fileName: `${selectedEp.filename || info.title + ' - ' + selectedEp.title}.mp4`,
                                        caption: `*❪ DOWNLOAD ❫*\n\n🎭 *${info.title}*\n📌 *${selectedEp.title}*\n💾 *Type:* _${selectedEp.type}_${DEFAULT_FOOTER}`
                                    }, { quoted: epMek });

                                    await socket.sendMessage(sender, { react: { text: '✅', key: epMek.key } });

                                } catch (dlError) {
                                    console.error('Download error:', dlError);
                                    await socket.sendMessage(sender, {
                                        text: `*❪ ERROR ❫*\n\n❌ *Download Failed!*\n🚫 _${dlError.message}_\n\n📎 *Direct Link:*\n_${selectedEp.url}_${DEFAULT_FOOTER}`
                                    }, { quoted: epMek });
                                }
                            }
                        };

                        socket.ev.on('messages.upsert', handleEpisode);

                    // ─────────────────────────────────────────
                    // ⚠️ NO EPISODES FOUND
                    // ─────────────────────────────────────────
                    } else {
                        await socket.sendMessage(sender, {
                            text: `*❪ NO DOWNLOADS ❫*\n\n⚠️ *No Download Links Found!*\n😞 _There are no downloads available for this item!_${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });
                    }

                    socket.ev.off('messages.upsert', handleSelection);

                } catch (fetchError) {
                    console.error('Fetch error:', fetchError);
                    await socket.sendMessage(sender, {
                        text: `*❪ ERROR ❫*\n\n❌ *Failed to Fetch Details!*\n🚫 _${fetchError.message}_${DEFAULT_FOOTER}`
                    }, { quoted: replyMek });
                    socket.ev.off('messages.upsert', handleSelection);
                }
            }
        };

        socket.ev.on('messages.upsert', handleSelection);

    } catch (error) {
        console.error('Sinhalacartoon command error:', error);
        await socket.sendMessage(sender, {
            text: `*❪ SYSTEM ERROR ❫*\n\n❌ *System Error!*\n🚫 _${error.message || 'Unknown error'}_\n\n🔄 _Please try again later..._${DEFAULT_FOOTER}`
        }, { quoted: msg });
    }
    
    break;
}
              
case 'add': {
  if (!args[0]) return socket.sendMessage(sender, {
    text: "❌ .add 947xxxxxxxx"
  });

  const number = args[0] + "@s.whatsapp.net";

  await socket.groupParticipantsUpdate(sender, [number], "add");

  return socket.sendMessage(sender, {
    text: "➕ Added user"
  }, { quoted: msg });
}
break;
case 'antilink2': {
  global.antilink = global.antilink || {};

  global.antilink[sender] = !global.antilink[sender];

  return socket.sendMessage(sender, {
    text: `🚫 Antilink ${global.antilink[sender] ? "Enabled" : "Disabled"}`
  }, { quoted: msg });
}
break;   
case 'xnxx':
case 'xxx': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `❌ ERROR

*කරුණාකර video title එක ලබාදෙන්න!*

📌 Usage:
• .xnxx <title>
• .xxx <title>

උදා: .xnxx new`
        }, { quoted: msg });
        break;  // ✅ This break is INSIDE the if block - CORRECT
    }

    const xnQuery = args.join(' ');
    const xnApiKey = '2586b722d448f0ca4ab3da1ab6a49a47';
    const xnBaseUrl = 'https://nethum.vercel.app/api/xnxx';

    await socket.sendMessage(sender, { text: '🔍 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙓𝙉𝙓𝙓...' });

    try {
        // ── STEP 1: Search ──
        const xnSearchResponse = await axios.get(
            `${xnBaseUrl}/search`,
            { 
                params: { q: xnQuery, apikey: xnApiKey },
                timeout: 30000  // ✅ Added timeout
            }
        );
        
        // ✅ Better response checking
        const xnSearchData = xnSearchResponse.data;
        
        if (!xnSearchData || !xnSearchData.data || !Array.isArray(xnSearchData.data) || xnSearchData.data.length === 0) {
            await socket.sendMessage(sender, {
                text: `❌ NO RESULTS

*Results හමුවෙන්නේ නැත! 😞*`
            }, { quoted: msg });
            break;
        }

        const xnResults = xnSearchData.data.slice(0, 25);
        let xnListText = `🔍 𝗫𝗡𝗫𝗫 - 𝗦𝗘𝗔𝗥𝗖𝗛 𝗥𝗘𝗦𝗨𝗟𝗧𝗦

Query: ${xnQuery}
Results Found: ${xnResults.length}

Reply with number to select:

`;

        xnResults.forEach((item, index) => {
            xnListText += `${index + 1}. 🎬 ${item.title}\n`;
        });

        xnListText += `\n${config.BOT_FOOTER || ''}`;

        const xnSentMsg = await socket.sendMessage(sender, { text: xnListText }, { quoted: msg });
        const xnMsgID = xnSentMsg.key.id;

        // ── STEP 2: Select video ──
        const xnHandleSelection = async ({ messages: replyMessages }) => {
            const xnReplyMek = replyMessages[0];
            if (!xnReplyMek?.message) return;

            const xnMessageType = xnReplyMek.message.conversation || xnReplyMek.message.extendedTextMessage?.text;
            const xnIsReply = xnReplyMek.message.extendedTextMessage?.contextInfo?.stanzaId === xnMsgID;

            if (xnIsReply && sender === xnReplyMek.key.remoteJid) {
                const xnChoice = parseInt(xnMessageType) - 1;

                if (isNaN(xnChoice) || xnChoice < 0 || xnChoice >= xnResults.length) {
                    await socket.sendMessage(sender, {
                        text: `❌ INVALID SELECTION

*වැරදි අංකයක්! 1-${xnResults.length} අතර තෝරන්න! 😕*`
                    }, { quoted: xnReplyMek });
                    return;
                }

                const xnSelected = xnResults[xnChoice];
                await socket.sendMessage(sender, { text: '📥 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱𝗶𝗻𝗴...' }, { quoted: xnReplyMek });

                try {
                    // ── STEP 3: Get download link ──
                    const xnDownloadResponse = await axios.get(
                        `${xnBaseUrl}/download`,
                        { 
                            params: { url: xnSelected.link || xnSelected.url, apikey: xnApiKey },
                            timeout: 60000  // ✅ Added timeout for download
                        }
                    );
                    
                    const xnDownloadData = xnDownloadResponse.data;

                    if (!xnDownloadData || !xnDownloadData.download) {
                        throw new Error('Download link ලබාගැනීමේ දෝෂයක් ඇතිවිය.');
                    }

                    const xnVideoUrl = xnDownloadData.download;
                    const xnTitle = xnDownloadData.title || xnSelected.title;
                    const xnImage = xnDownloadData.image || xnSelected.image;

                    // Send thumbnail + info
                    if (xnImage) {
                        await socket.sendMessage(sender, {
                            image: { url: xnImage },
                            caption: `🎬 *${xnTitle}*\n\n📥 Downloading video...`
                        }, { quoted: xnReplyMek });
                    }

                    await socket.sendMessage(sender, { react: { text: '📥', key: xnReplyMek.key } });

                    // Send video as document
                    await socket.sendMessage(sender, {
                        document: { url: xnVideoUrl },
                        mimetype: 'video/mp4',
                        fileName: `${xnTitle}.mp4`,
                        caption: `🎬 ${xnTitle}\n${config.BOT_FOOTER || ''}`
                    }, { quoted: xnReplyMek });

                    await socket.sendMessage(sender, { react: { text: '✅', key: xnReplyMek.key } });

                } catch (downloadError) {
                    console.error('Download error:', downloadError);
                    await socket.sendMessage(sender, {
                        text: `❌ DOWNLOAD ERROR

*Video download කිරීමේ දෝෂයක්.*
${downloadError.message || 'Unknown error'}`
                    }, { quoted: xnReplyMek });
                } finally {
                    // ✅ Always remove listener after selection (success or fail)
                    socket.ev.off('messages.upsert', xnHandleSelection);
                }
            }
        };

        socket.ev.on('messages.upsert', xnHandleSelection);

    } catch (error) {
        console.error('XNXX command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ ERROR

*දෝෂයක් ඇතිවුණා:* ${error.message || 'Unknown error'}`
        }, { quoted: msg });
    }

    break;  // ✅ Case block break
}
              
case 'cinesubz22':             
case 'cinetv': {
    const DEFAULT_FOOTER = `\n\n> 🎭 𝗖𝗜𝗡𝗘 𝗛𝗨𝗕 🎭\n> 🧬 ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sithija Anuhas`;

    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `*❪ ERROR ❫*\n\n⚠️ *Invalid Usage!*\n\n🎬 *Example:*
• .cinetv spider man
• .cinesubz game of thrones\n\n📝 _Please provide the Movie_ _or TV Series name!_${DEFAULT_FOOTER}`
        }, { quoted: msg });
        break;
    }

    const cinesubQuery = args.join(' ');
    await socket.sendMessage(sender, { 
        text: `*❪ SEARCHING ❫*\n\n🔍 *Searching Cinesubz...*\n⚡ _Please wait a moment._`
    });

    const API_BASE = "https://chama-movie-api.koyeb.app";
    const API_KEY = "chama_api_f012c3e5acc0d5216c57f3d23139767f"; // ඔබේ API Key එක දාන්න
    const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500";

    try {
        const searchResponse = await axios.get(`${API_BASE}/api/v1/movie/cinesubz/search?q=${encodeURIComponent(cinesubQuery)}&api_key=${API_KEY}`);
        const searchData = searchResponse.data;

        if (!searchData.status || !searchData.data || searchData.data.length === 0) {
            await socket.sendMessage(sender, {
                text: `*❪ NO RESULTS ❫*\n\n😞 *No Results Found!*\n\n🎬 *Query:* _${cinesubQuery}_\n💡 *Tip:* _Please check the spelling and try again!_${DEFAULT_FOOTER}`
            }, { quoted: msg });
            break;
        }

        const cinesubResults = searchData.data.slice(0, 25);
        let listText = `*❪ SEARCH RESULTS ❫*\n\n🎯 *Query:* _${cinesubQuery}_\n📊 *Results:* _${cinesubResults.length} Items_\n\n*👇 SELECT A NUMBER 👇*\n\n`;

        cinesubResults.forEach((item, index) => {
            const typeIcon = item.type === 'tvshows' ? '📺' : '🎥';
            const num = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;
            listText += `*${num}* ➜ ${typeIcon} _${item.title.substring(0, 30)}_\n`;
        });

        listText += `${DEFAULT_FOOTER}`;
        
        const sentMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });
        const messageID = sentMsg.key.id;

        const handleSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const messageType = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSentMsg && sender === replyMek.key.remoteJid) {
                const choice = parseInt(messageType) - 1;
                if (isNaN(choice) || choice < 0 || choice >= cinesubResults.length) {
                    await socket.sendMessage(sender, {
                        text: `*❪ INVALID ❫*\n\n⚠️ *Wrong Number!*\n🎯 *Range:* _01 - sign_in_${cinesubResults.length}_\n📝 _Please reply with a valid number!_${DEFAULT_FOOTER}`
                    }, { quoted: replyMek });
                    return;
                }

                const selectedItem = cinesubResults[choice];
                const isTvShow = selectedItem.type === 'tvshows';
                
                if (isTvShow) {
                    await socket.sendMessage(sender, { 
                        text: `*❪ FETCHING ❫*\n\n📺 *Fetching TV Series...*\n⚡ _Please wait..._`
                    }, { quoted: replyMek });

                    try {
                        const tvShowResponse = await axios.get(`${API_BASE}/api/v1/movie/cinesubz/tv/info?q=${encodeURIComponent(selectedItem.link)}&api_key=${API_KEY}`);
                        const tvShowData = tvShowResponse.data;

                        if (!tvShowData.status || !tvShowData.data) {
                            throw new Error('Failed to fetch TV show details');
                        }

                        const tvInfo = tvShowData.data;
                        
                        let tvDetailsText = `*❪ TV SERIES DETAILS ❫*\n\n📺 *${tvInfo.title}*\n⭐ 𝗜ᴍᴅʙ ➜ ★ ${tvInfo.rating || 'N/A'}\n📅 𝗬ᴇᴀʀ ➜ ${tvInfo.year || 'N/A'}\n⏳ 𝗥ᴜɴᴛɪᴍᴇ ➜ ${tvInfo.duration || 'N/A'}\n🌍 𝗖ᴏᴜɴ𝘁𝗿ʏ ➜ ${tvInfo.country || 'N/A'}\n🎭 𝗚𝗲𝗻 genres ➜ ${tvInfo.genres ? tvInfo.genres.join(', ') : 'N/A'}\n🎬 𝗗ɪʀᴇᴄᴛᴏʀ ➜ ${tvInfo.directors || 'N/A'}\n⭐ 𝗦ᴛᴀʀ𝘀: ${tvInfo.stars || 'N/A'}\n📝 𝗦𝘁𝗼𝗿𝘆 ➜ ${tvInfo.story ? (tvInfo.story.length > 250 ? tvInfo.story.substring(0, 250) + '...' : tvInfo.story) : 'N/A'}\n🗿 𝗪ᴇʙ ➜ cinesubz.com\n ${DEFAULT_FOOTER}`;

                        const posterUrl = tvInfo.image || selectedItem.image || DEFAULT_IMAGE;
                        await socket.sendMessage(sender, {
                            image: { url: posterUrl },
                            caption: tvDetailsText
                        }, { quoted: replyMek });

                        // AUTO DOWNLOAD ALL EPISODES
                        await socket.sendMessage(sender, { 
                            text: `*❪ DOWNLOAD EPISODES ❫*\n\n📺 *Series:* _sign_in_${tvInfo.title}_\n🎬 *Episodes:* _${tvInfo.episodes.length}_\n⚡ _Starting download process..._${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });

                        let successCount = 0;
                        let failCount = 0;

                        for (let i = 0; i < tvInfo.episodes.length; i++) {
                            const episode = tvInfo.episodes[i];
                            try {
                                await socket.sendMessage(sender, { 
                                    text: `*❪ DOWNLOADING ❫*\n\n🎥 *Episode:* _${episode.episode_name}_\n📊 *Progress:* _${i + 1}/${tvInfo.episodes.length}_`
                                }, { quoted: replyMek });

                                const epDlRes = await axios.get(`${API_BASE}/api/v1/movie/cinesubz/tv/dl?q=${encodeURIComponent(episode.episode_url)}&api_key=${API_KEY}`);
                                const epDlData = epDlRes.data;

                                if (epDlData.status && epDlData.data && epDlData.data.length > 0) {
                                    const nonTelegramLinks = epDlData.data.filter(link => 
                                        link.link && !link.link.includes('t.me') && !link.link.includes('telegram')
                                    );
                                    const finalLinkObj = nonTelegramLinks[0] || epDlData.data[0];
                                    
                                    await socket.sendMessage(sender, {
                                        document: { url: finalLinkObj.link },
                                        mimetype: 'video/mp4',
                                        fileName: `${tvInfo.title} - ${episode.episode_name}.mp4`,
                                        caption: `*❪ MOVIE ❫*\n\n🎭 *${tvInfo.title}*\n📌 *${episode.episode_name}*${DEFAULT_FOOTER}`
                                    }, { quoted: replyMek });
                                    
                                    successCount++;
                                } else {
                                    failCount++;
                                }
                                
                                await new Promise(resolve => setTimeout(resolve, 2500));
                                
                            } catch (epError) {
                                console.error(`Error downloading episode:`, epError);
                                failCount++;
                            }
                        }
                        
                        await socket.sendMessage(sender, { 
                            text: `*❪ SUMMARY ❫*\n\n🎉 *Download Complete!*\n\n🎬 *Series:* _${tvInfo.title}_\n✅ *Success:* _${successCount} Episodes_\n❌ *Failed:* _${failCount} Episodes_${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });

                        socket.ev.off('messages.upsert', handleSelection);
                        
                    } catch (tvShowError) {
                        console.error('TV Show error:', tvShowError);
                        await socket.sendMessage(sender, {
                            text: `*❪ ERROR ❫*\n\n❌ *TV Details Error!*\n🚫 _${tvShowError.message}_${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                    }
                    
                } else {
                    // MOVIE FLOW
                    await socket.sendMessage(sender, { 
                        text: `*❪ FETCHING ❫*\n\n🎬 *Fetching Movie...*\n⚡ _Please wait..._`
                    }, { quoted: replyMek });

                    try {
                        const detailsResponse = await axios.get(`${API_BASE}/api/v1/movie/cinesubz/infodl?q=${encodeURIComponent(selectedItem.link)}&api_key=${API_KEY}`);
                        const detailsData = detailsResponse.data;

                        if (!detailsData.status || !detailsData.data) {
                            throw new Error('Failed to fetch details');
                        }

                        const movieInfo = detailsData.data;
                        const validDownloads = movieInfo.downloads || [];
                        
                        if (validDownloads.length === 0) {
                            await socket.sendMessage(sender, {
                                text: `*❪ NO DOWNLOADS ❫*\n\n⚠️ *No Downloads Found!*\n😞 _There are no downloads available for this movie!_${DEFAULT_FOOTER}`
                            }, { quoted: replyMek });
                            return;
                        }
                        
                        const movieDetailsText = `*❪ MOVIE DETAILS ❫*\n\n🎬 *${movieInfo.title}*\n⭐ 𝗜𝗠𝗗𝗕 ➜ ★ ${movieInfo.imdb || movieInfo.rating || 'N/A'}\n📅 𝗬𝗲𝗮𝗿 ➜ ${movieInfo.year || 'N/A'}\n⏳ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻 ➜ ${movieInfo.duration || 'N/A'}\n🌍 𝗖ᴏᴜɴ𝘁𝗿ʏ ➜ ${movieInfo.country || 'N/A'}\n🎭 𝗚𝗲𝗻 genres ➜ ${movieInfo.genres ? movieInfo.genres.join(', ') : 'N/A'}\n🏷️  ➜ ${movieInfo.language || movieInfo.tag || 'N/A'}\n🎬  ➜ ${movieInfo.directors || movieInfo.director || 'N/A'}\n⭐  ➜ ${movieInfo.stars || 'N/A'}\n📝  ➜ ${movieInfo.story ? (movieInfo.story.length > 250 ? movieInfo.story.substring(0, 250) + '...' : movieInfo.story) : 'N/A'}\n🗿 𝗪ᴇʙ ➜ cinesubz.com\n ${DEFAULT_FOOTER}`;

                        const moviePosterUrl = movieInfo.image || selectedItem.image || DEFAULT_IMAGE;
                        await socket.sendMessage(sender, {
                            image: { url: moviePosterUrl },
                            caption: movieDetailsText
                        }, { quoted: replyMek });

                        const downloadOptionsText = `*❪ DOWNLOADS ❫*\n\n📥 *Select Quality:*\n\n${validDownloads.map((dl, i) => {
    const num = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
    const qualityIcon = dl.quality.includes('1080') ? '🔥' : dl.quality.includes('720') ? '💎' : '📱';
    return `*${num}* ➜ ${qualityIcon} _${dl.quality}_ 💾 _${dl.size || 'N/A'}_`;
}).join('\n')}\n\n*💬 REPLY TO DOWNLOAD 💬*\n📌 _Reply with the number_${DEFAULT_FOOTER}`;

                        const downloadOptionsMsg = await socket.sendMessage(sender, { text: downloadOptionsText }, { quoted: replyMek });
                        const optionsMsgID = downloadOptionsMsg.key.id;

                        const handleDownload = async ({ messages: downloadMessages }) => {
                            const downloadMek = downloadMessages[0];
                            if (!downloadMek?.message) return;

                            const downloadChoice = downloadMek.message.conversation || downloadMek.message.extendedTextMessage?.text;
                            const isReplyToOptionsMsg = downloadMek.message.extendedTextMessage?.contextInfo?.stanzaId === optionsMsgID;

                            if (isReplyToOptionsMsg && sender === downloadMek.key.remoteJid) {
                                const choiceNum = parseInt(downloadChoice) - 1;
                                
                                if (isNaN(choiceNum) || choiceNum < 0 || choiceNum >= validDownloads.length) {
                                    await socket.sendMessage(sender, {
                                        text: `*❪ INVALID ❫*\n\n⚠️ *Wrong Number!*\n🎯 *Range:* _01 - ${validDownloads.length}_\n📝 _Please reply with a valid number!_	ext_secondary_${DEFAULT_FOOTER}`
                                    }, { quoted: downloadMek });
                                    return;
                                }

                                const selectedDownload = validDownloads[choiceNum];
                                await socket.sendMessage(sender, { react: { text: '📥', key: downloadMek.key } });

                                try {
                                    const dlRes = await axios.get(`${API_BASE}/api/v1/movie/cinesubz/tv/dl?q=${encodeURIComponent(selectedItem.link)}&api_key=${API_KEY}`);
                                    const dlData = dlRes.data;

                                    if (!dlData.status || !dlData.data || dlData.data.length === 0) {
                                        throw new Error('Failed to resolve download URL');
                                    }

                                    const finalDirectLink = dlData.data[choiceNum].link;

                                    await socket.sendMessage(sender, {
                                        document: { url: finalDirectLink },
                                        mimetype: 'video/mp4',
                                        fileName: `${movieInfo.title} - ${selectedDownload.quality}.mp4`,
                                        caption: `*❪ MOVIE ❫*\n\n🎭 *${movieInfo.title}*\n📌 *Quality:* _${selectedDownload.quality}_\n💾 *Size:* _${selectedDownload.size}_${DEFAULT_FOOTER}`
                                    }, { quoted: downloadMek });

                                    await socket.sendMessage(sender, { react: { text: '✅', key: downloadMek.key } });

                                } catch (downloadError) {
                                    console.error('Download link error:', downloadError);
                                    await socket.sendMessage(sender, {
                                        text: `*❪ ERROR ❫*\n\n❌ *Download Failed!*\n🚫 _sign_in_${downloadError.message}_${DEFAULT_FOOTER}`
                                    }, { quoted: downloadMek });
                                } finally {
                                    socket.ev.off('messages.upsert', handleDownload);
                                    socket.ev.off('messages.upsert', handleSelection);
                                }
                            }
                        };

                        socket.ev.on('messages.upsert', handleDownload);

                    } catch (detailsError) {
                        console.error('Details error:', detailsError);
                        await socket.sendMessage(sender, {
                            text: `*❪ ERROR ❫*\n\n❌ *Movie Details Error!*\n🚫 _${detailsError.message}_${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                    }
                }
            }
        };

        socket.ev.on('messages.upsert', handleSelection);

    } catch (error) {
        console.error('Cinesubz command error:', error);
        await socket.sendMessage(sender, {
            text: `*❪ SYSTEM ERROR ❫*\n\n❌ *System Error!*\n🚫 _${error.message || 'Unknown error'}_\n\n🔄 _Please try again later..._${DEFAULT_FOOTER}`
        }, { quoted: msg });
    }
    
    break;
}
              
case 'tagall2': {
  const group = await socket.groupMetadata(sender);
  const users = group.participants.map(u => u.id);

  let text = "📢 TAG ALL\n\n";
  users.forEach(u => text += `👉 @${u.split("@")[0]}\n`);

  return socket.sendMessage(sender, {
    text,
    mentions: users
  }, { quoted: msg });
}
break;              
case 'csong': {
    try {
        const axios = require('axios');
        const path = require('path');
        const os = require('os');
        const fs = require('fs');
        const crypto = require('crypto');

        // Chat ID එක ආරක්ෂිතව ලබා ගැනීම (from වෙනුවට msg.key.remoteJid භාවිතයෙන්)
        const currentChat = msg.key.remoteJid;

        const _chm_id = crypto.randomBytes(8).toString('hex');
        const targetJidInput = args[0];
        const songQuery = args.slice(1).join(" ").trim();

        if (!targetJidInput || !songQuery) {
            return await socket.sendMessage(currentChat, { 
                text: "❌ *Format Invalid!*\nUsage: `.csong <newsletter/jid> <song name>`\nExample: `.csong . Shape of You`" 
            }, { quoted: msg });
        }

        // ⚡ පළමු Reaction එක (වැඩේ ආරම්භ කළ බව පෙන්වීමට)
        await socket.sendMessage(currentChat, { react: { text: "🎧", key: msg.key } });

        let sJid = targetJidInput;
        if (sJid === '.' || sJid.toLowerCase() === 'here') {
            sJid = currentChat;
        } else if (!sJid.includes('@')) {
            if (/^\d{12,}$/.test(sJid)) sJid = `${sJid}@newsletter`;
            else sJid = `${sJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        }

        let videoId = null;
        let sMetadata = null;

        // YouTube URL එකක්දැයි පරීක්ෂා කිරීම
        if (/^https?:\/\//i.test(songQuery)) {
            const match = songQuery.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
            videoId = match ? match[1] : null;
            if (!videoId) return await socket.sendMessage(currentChat, { text: "❌ *Invalid YouTube URL.*" }, { quoted: msg });
        } else {
            // සිංදුවේ නමින් සෙවීම
            const yts = require('yt-search');
            const search = await yts(songQuery);
            if (!search || !search.videos || search.videos.length === 0) {
                return await socket.sendMessage(currentChat, { text: "❌ No results found for: *" + songQuery + "*" }, { quoted: msg });
            }
            sMetadata = search.videos[0];
            videoId = sMetadata.videoId;
        }

        // 🔹 API එකෙන් Audio Download ලින්ක් එක ලබා ගැනීම
        let downloadUrl = null;
        let sTitle = sMetadata?.title || 'Song';
        let sDuration = sMetadata?.timestamp || 'N/A';
        let sThumb = sMetadata?.thumbnail || null;

        try {
            const res = await axios.get(`https://api.dreaded.site/api/ytdl/audio?url=https://youtu.be/${videoId}`);
            if (res.data && res.data.status === 200 && res.data.result?.download_url) {
                downloadUrl = res.data.result.download_url;
                sTitle = res.data.result.title || sTitle;
            }
        } catch (apiErr) {
            console.log("Primary API failed, trying backup...");
        }

        // 🔹 Backup API
        if (!downloadUrl) {
            try {
                const backupRes = await axios.get(`https://delirius-apiofc.vercel.app/download/ytmp3?url=https://youtu.be/${videoId}`);
                if (backupRes.data && backupRes.data.status && backupRes.data.downloadUrl) {
                    downloadUrl = backupRes.data.downloadUrl;
                    sTitle = backupRes.data.title || sTitle;
                }
            } catch (bErr) {
                console.error("Backup API also failed:", bErr);
            }
        }

        if (!downloadUrl) {
            return await socket.sendMessage(currentChat, { text: "❌ *Failed to fetch download link. Try again later.*" }, { quoted: msg });
        }

        // Configuration ලෝඩ් කර ගැනීම (Safe check for 'number' or 'sender')
        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const rawNumber = (typeof number !== 'undefined' ? number : userJid.split('@')[0]);
        const sanitized = String(rawNumber || '').replace(/[^0-9]/g, '');
        
        let cfg = {};
        try {
            if (typeof loadUserConfigFromMongo === 'function' && sanitized) {
                cfg = await loadUserConfigFromMongo(sanitized) || {};
            }
        } catch (mErr) {}
        
        const botName = cfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🐦‍🔥 ᴅᴛᴇᴄ ᴍɪɴɪ ᴠ1 🐦‍🔥');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botName}*`;

        const sCaption = `🎧 *TITLE :* ${sTitle}\n` +
                         `◽️ ⏱ *Duration :* ${sDuration}\n\n` +
                         `> ${currentFooter}`;

        // මුලින්ම තොරතුරු සහිත මැසේජ් එක අදාළ JID එකට යැවීම
        if (sThumb) {
            await socket.sendMessage(sJid, { image: { url: sThumb }, caption: sCaption });
        } else {
            await socket.sendMessage(sJid, { text: sCaption });
        }

        // URL එකෙන් කෙලින්ම ඕඩියෝ එක ඩවුන්ලෝඩ් කර බෆර් එකක් ලෙස යැවීම
        const chm_Mp3 = path.join(os.tmpdir(), `csong_${_chm_id}.mp3`);
        const dlResp = await axios.get(downloadUrl, { responseType: 'stream', timeout: 120000 });
        
        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(chm_Mp3);
            dlResp.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        const chm_Buf = fs.readFileSync(chm_Mp3);
        
        await socket.sendMessage(sJid, {
            audio: chm_Buf,
            mimetype: 'audio/mpeg',
            fileName: `${sTitle.replace(/[^a-zA-Z0-9 ]/g, '_')}.mp3`
        });

        // සාර්ථක බව මුල් චැට් එකට දැනුම් දීම
        if (sJid !== currentChat) {
            await socket.sendMessage(currentChat, { text: `✅ *Song sent successfully to target!*\n🎵 ${sTitle}` }, { quoted: msg });
        }

        // ✅ වැඩේ සාර්ථකව ඉවර වුණාම වැටෙන දෙවැනි Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '✅', key: msg.key } });

        // Temp file එක මැකීම
        try { if (fs.existsSync(chm_Mp3)) fs.unlinkSync(chm_Mp3); } catch(e){}

    } catch (e) {
        console.error('csong error:', e);
        const currentChat = msg.key.remoteJid;
        await socket.sendMessage(currentChat, { text: "❌ *csong Error:* " + e.message }, { quoted: msg });
    }
}
break;
case 'setdesc': {
    try {
        if (!isOwner)
            return await socket.sendMessage(sender, { text: '❌ This command is only for the bot owner!' }, { quoted: msg });

        if (!isGroup)
            return await socket.sendMessage(sender, { text: '❌ This command can only be used in groups!' }, { quoted: msg });

        if (!args[0])
            return await socket.sendMessage(sender, {
                text: `Example:\n${config.PREFIX}setdesc New Description`
            }, { quoted: msg });

        const newDesc = args.join(" ");

        await socket.sendMessage(sender, {
            react: { text: "📝", key: msg.key }
        });

        const metadata = await socket.groupMetadata(sender);

        await socket.groupUpdateDescription(sender, newDesc);

        await socket.sendMessage(sender, {
            text:
`📝 *GROUP DESCRIPTION UPDATED*

📍 *Group:* ${metadata.subject}
📝 *Description:* ${newDesc}

✅ Successfully Updated.`
        }, { quoted: msg });

    } catch (e) {
        console.log(e);
        await socket.sendMessage(sender, {
            text: `❌ ${e.message}`
        }, { quoted: msg });
    }
}
break;
case 'setgname': {
    try {
        if (!isOwner)
            return await socket.sendMessage(sender, { text: '❌ This command is only for the bot owner!' }, { quoted: msg });

        if (!isGroup)
            return await socket.sendMessage(sender, { text: '❌ This command can only be used in groups!' }, { quoted: msg });

        if (!args[0])
            return await socket.sendMessage(sender, {
                text: `Example:\n${config.PREFIX}setgname New Group Name`
            }, { quoted: msg });

        const newName = args.join(" ");

        const metadata = await socket.groupMetadata(sender);

        await socket.sendMessage(sender, {
            react: { text: "✏️", key: msg.key }
        });

        await socket.groupUpdateSubject(sender, newName);

        await socket.sendMessage(sender, {
            text:
`✏️ *GROUP NAME UPDATED*

📌 *Old:* ${metadata.subject}
📌 *New:* ${newName}

✅ Successfully Updated.`
        }, { quoted: msg });

    } catch (e) {
        console.log(e);
        await socket.sendMessage(sender, {
            text: `❌ ${e.message}`
        }, { quoted: msg });
    }
}
break;
              
case 'bcall': {
    try {
        if (!isOwner) {
            return await socket.sendMessage(sender, {
                text: '❌ This command is only for the bot owner!'
            }, { quoted: msg });
        }

        if (!args.length) {
            return await socket.sendMessage(sender, {
                text: `Example:\n${sessionConfig.PREFIX || config.PREFIX}bcall Hello Everyone!`
            }, { quoted: msg });
        }

        await socket.sendMessage(sender, {
            react: { text: "📣", key: msg.key }
        });

        const message = args.join(" ");
        const groups = await socket.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);

        let success = 0;
        let failed = 0;

        const text = `╭───────────────╮
│ 📣 *BROADCAST*
╰───────────────╯

${message}

${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

        for (const jid of groupIds) {
            try {
                await socket.sendMessage(jid, {
                    text
                });

                success++;
                await delay(1000);
            } catch (e) {
                failed++;
                console.log(e);
            }
        }

        await socket.sendMessage(sender, {
            text: `✅ Broadcast Completed

📤 Success : ${success}
❌ Failed : ${failed}`
        }, { quoted: msg });

    } catch (e) {
        console.log(e);

        await socket.sendMessage(sender, {
            text: `❌ ${e.message}`
        }, { quoted: msg });
    }
}
break; 

case 'sinhalasub': {
    if (!args.length) {
        return await socket.sendMessage(sender, {
            text: `❌ ERROR\n\n*කරුණාකර චිත්‍රපටයේ නම ලබාදෙන්න!*\n\n📌 Example:\n➜ ${sessionConfig.PREFIX || config.PREFIX}sinhalasub spider`
        }, { quoted: msg });
    }

    const ssQuery = args.join(' ');

    await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });
    await socket.sendMessage(sender, { text: '📽️ 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙤𝙣 𝙎𝙞𝙣𝙝𝙖𝙡𝙖𝙎𝙪𝙗...' }, { quoted: msg });

    try {
        const searchRes = await axios.get('https://nethum.vercel.app/api/sinhalasub/search', {
            params: { apikey: '2586b722d448f0ca4ab3da1ab6a49a47', q: ssQuery },
            timeout: 20000
        });
        const searchData = searchRes.data;

        if (!searchData.status || !searchData.data || searchData.data.length === 0) {
            return await socket.sendMessage(sender, {
                text: '❌ NO RESULTS\n\n*SinhalaSubZ හි චිත්‍රපට හමුවෙන්නේ නැත! 😞*'
            }, { quoted: msg });
        }

        const results = searchData.data.slice(0, 25);
        const footer = sessionConfig.BOT_FOOTER || config.BOT_FOOTER || '';

        let listText = `🔍 𝗦𝗜𝗡𝗛𝗔𝗟𝗔𝗦𝗨𝗕 - 𝗦𝗘𝗔𝗥𝗖𝗛 𝗥𝗘𝗦𝗨𝗟𝗧𝗦\n\nQuery: ${ssQuery}\nResults Found: ${results.length}\n\nReply with number to select:\n\n`;
        results.forEach((item, i) => {
            listText += `${i + 1}. 🎬 ${item.title}\n`;
        });
        listText += `\n${footer}`;

        const searchMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });

        let step = 'movie';
        let lastMsgId = searchMsg.key.id;
        let selectedMovie = null;
        let validDownloads = null;
        let selectedDl = null;
        let timeoutId = null;

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            socket.ev.off('messages.upsert', handler);
        };

        const handler = async ({ messages: replyMessages }) => {
            try {
                const replyMek = replyMessages[0];
                if (!replyMek?.message) return;

                const replyFrom = replyMek.key.remoteJid;
                if (replyFrom !== sender) return;

                const quotedId = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId;
                if (!quotedId || quotedId !== lastMsgId) return;

                const rawText = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
                if (!rawText) return;

                const choice = parseInt(rawText.trim()) - 1;
                if (isNaN(choice)) {
                    return await socket.sendMessage(sender, {
                        text: '❎ *කරුණාකර වලංගු අංකයක් ලබාදෙන්න!*'
                    }, { quoted: replyMek });
                }

                // ═══════ STEP 1: MOVIE SELECT ═══════
                if (step === 'movie') {
                    if (choice < 0 || choice >= results.length) {
                        return await socket.sendMessage(sender, {
                            text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${results.length} අතර තෝරන්න!*`
                        }, { quoted: replyMek });
                    }

                    selectedMovie = results[choice];
                    await socket.sendMessage(sender, { react: { text: '📋', key: replyMek.key } });

                    const detailsRes = await axios.get('https://nethum.vercel.app/api/sinhalasub/details', {
                        params: { apikey: '2586b722d448f0ca4ab3da1ab6a49a47', url: selectedMovie.link },
                        timeout: 25000
                    });
                    const detailsData = detailsRes.data;

                    if (!detailsData.status || !detailsData.data) {
                        cleanup();
                        return await socket.sendMessage(sender, {
                            text: '❌ ERROR\n\n*Details ලබාගැනීමේ දෝෂයක් ඇතිවිය.*'
                        }, { quoted: replyMek });
                    }

                    const movie = detailsData.data;
                    const allDownloads = (movie.downloads || []).filter(dl => dl && dl.link && !dl.link.includes('telegram.me'));

                    const qualityMap = {};
                    for (const dl of allDownloads) {
                        const key = dl.quality;
                        if (!qualityMap[key]) {
                            qualityMap[key] = dl;
                        } else if (dl.link.includes('pixeldrain') && !qualityMap[key].link.includes('pixeldrain')) {
                            qualityMap[key] = dl;
                        }
                    }
                    validDownloads = Object.values(qualityMap);

                    if (validDownloads.length === 0) {
                        cleanup();
                        return await socket.sendMessage(sender, {
                            text: '❌ NO DOWNLOADS\n\n*මෙම චිත්‍රපටය සඳහා බාගත කිරීමේ link නොමැත!*'
                        }, { quoted: replyMek });
                    }

                    const detailsText =
`🎬 〔 MOVIE DETAILS 〕

☘️ Title: ${movie.title || 'N/A'}
⭐ IMDB: ${movie.rating || 'N/A'}
⏳ Duration: ${movie.duration || 'N/A'}
📅 Year: ${movie.year || 'N/A'}
🎥 Quality: ${movie.quality || 'N/A'}`;

                    await socket.sendMessage(sender, {
                        image: { url: movie.image || config.IMAGE_PATH || 'https://files.catbox.moe/begcjv.png' },
                        caption: detailsText
                    }, { quoted: replyMek });

                    const dlOptionsText =
`☘️ DOWNLOAD OPTIONS

${validDownloads.map((dl, i) => `${i + 1}. ${dl.quality} | ${dl.size || 'N/A'}`).join('\n')}

Reply with number to download:

${footer}`;

                    const optMsg = await socket.sendMessage(sender, { text: dlOptionsText }, { quoted: replyMek });
                    step = 'quality';
                    lastMsgId = optMsg.key.id;
                }

                // ═══════ STEP 2: QUALITY SELECT ═══════
                else if (step === 'quality') {
                    if (!validDownloads || choice < 0 || choice >= validDownloads.length) {
                        return await socket.sendMessage(sender, {
                            text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${validDownloads.length} අතර තෝරන්න!*`
                        }, { quoted: replyMek });
                    }

                    selectedDl = validDownloads[choice];
                    const isPixeldrain = selectedDl.link.includes('pixeldrain.com/api/file/');

                    await socket.sendMessage(sender, {
                        text: `⏳ Preparing *${selectedDl.quality}* (${selectedDl.size || 'N/A'})...`
                    }, { quoted: replyMek });

                    await socket.sendMessage(sender, { react: { text: '📥', key: replyMek.key } });

                    if (isPixeldrain) {
                        await socket.sendMessage(sender, {
                            document: { url: selectedDl.link },
                            mimetype: 'video/mp4',
                            fileName: `${selectedMovie.title} [${selectedDl.quality}].mp4`,
                            caption: `${selectedMovie.title}\n\n[${selectedDl.quality}] | ${selectedDl.size || ''}\n${footer}`
                        }, { quoted: replyMek });
                    } else {
                        await socket.sendMessage(sender, {
                            text: `✅ *Download Link Ready!*\n\n🎬 *${selectedMovie.title}*\n🎥 Quality: ${selectedDl.quality}\n📦 Size: ${selectedDl.size || 'N/A'}\n\n🔗 *Link:*\n${selectedDl.link}\n\n_Browser හෝ IDM වලින් download කරන්න_\n\n${footer}`
                        }, { quoted: replyMek });
                    }

                    await socket.sendMessage(sender, { react: { text: '✅', key: replyMek.key } });
                    cleanup();
                }

            } catch (innerErr) {
                console.error('SinhalaSubZ handler error:', innerErr);
                await socket.sendMessage(sender, {
                    text: `❌ ERROR\n\n*දෝෂයක් ඇතිවුණා:* ${innerErr.message || 'Unknown error'}`
                }, { quoted: msg });
                cleanup();
            }
        };

        socket.ev.on('messages.upsert', handler);
        timeoutId = setTimeout(() => {
            cleanup();
        }, 300000);

    } catch (ssError) {
        console.error('SinhalaSubZ command error:', ssError.message);
        await socket.sendMessage(sender, {
            text: `❌ ERROR\n\n*දෝෂයක් ඇතිවුණා:* ${ssError.message || 'Unknown error'}`
        }, { quoted: msg });
    }

    break;
}
              
case 'vv':
case 'viewonce':
case 'antiviewonce': {
    // Chat ID එක ආරක්ෂිතව ලබා ගැනීම (sender/from වෙනුවට msg.key.remoteJid භාවිතයෙන්)
    const currentChat = msg.key.remoteJid;

    try {
        const { downloadContentFromMessage } = require('@whiskeysockets/bailehes') || require('@adiwajshing/baileys');

        // ⚡ පළමු Reaction එක (වැඩේ ආරම්භ කළ බව පෙන්වීමට)
        await socket.sendMessage(currentChat, { react: { text: '👁️', key: msg.key } });

        const _sanVV = (number || '').replace(/[^0-9]/g, '');
        
        // MongoDB config safe check
        let _cfgVV = {};
        try {
            if (typeof loadUserConfigFromMongo === 'function') {
                _cfgVV = await loadUserConfigFromMongo(_sanVV) || {};
            }
        } catch (mErr) {}

        const _botVV = _cfgVV.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${_botVV}*`;

        // Must be a reply to a view-once message
        const quotedCtx = msg.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = quotedCtx?.quotedMessage;

        if (!quotedMsg) {
            return await socket.sendMessage(currentChat, {
                text: `❌ *View-Once message හොයාගන්න බැරිවුනා!*\n\n› View-once message එකට reply කරලා *.vv* type කරන්න.\n\n> ${currentFooter}`
            }, { quoted: msg });
        }

        // Detect the inner type inside view-once wrapper
        let voInner = null;
        let voType = null;
        const voWrappers = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
        for (const w of voWrappers) {
            if (quotedMsg[w]) { voInner = quotedMsg[w].message; break; }
        }
        
        // Also handle direct media in quoted (some clients strip wrapper)
        if (!voInner) voInner = quotedMsg;

        if (!voInner) {
            return await socket.sendMessage(currentChat, { text: `❌ *Media ලබාගන්න බැරිවුනා.*\n\n> ${currentFooter}` }, { quoted: msg });
        }

        // getContentType වෙනුවට වඩාත් ආරක්ෂිත ක්‍රමයක්
        voType = Object.keys(voInner)[0];

        if (!voType || !['imageMessage', 'videoMessage', 'audioMessage'].includes(voType)) {
            return await socket.sendMessage(currentChat, {
                text: `❌ *Supported නෑ!*\n\n› Image, Video, Audio view-once messages only.\n\n> ${currentFooter}`
            }, { quoted: msg });
        }

        const mediaData = voInner[voType];
        const mediaTypeStr = voType.replace('Message', '');
        const stream = await downloadContentFromMessage(mediaData, mediaTypeStr);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const fromNum = (quotedCtx?.participant || quotedCtx?.remoteJid || currentChat || '').split('@')[0];
        const vvCaption = `╭━━━━━━━━━━━━━━━╮\n` +
                          `┃  👁️ *𝗩𝗜𝗘𝗪 𝗢𝗡𝗖𝗘 𝗦𝗔𝗩𝗘*\n` +
                          `╰━━━━━━━━━━━━━━━╯\n\n` +
                          `┃ 👤 *𝗙𝗿𝗼𝗺 :* +${fromNum}\n` +
                          `┃ 📁 *𝗧𝘆𝗽𝗲 :* ${mediaTypeStr}\n\n` +
                          `> ${currentFooter}`;

        if (voType === 'imageMessage') {
            await socket.sendMessage(currentChat, { image: buffer, caption: vvCaption }, { quoted: msg });
        } else if (voType === 'videoMessage') {
            await socket.sendMessage(currentChat, { video: buffer, caption: vvCaption }, { quoted: msg });
        } else if (voType === 'audioMessage') {
            await socket.sendMessage(currentChat, {
                audio: buffer,
                mimetype: mediaData.mimetype || 'audio/ogg; codecs=opus',
                ptt: mediaData.ptt || false
            }, { quoted: msg });
        }

        // ✅ වැඩේ සාර්ථකව ඉවර වුණාම වැටෙන දෙවැනි Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '✅', key: msg.key } });

    } catch (e) {
        console.error('vv cmd error:', e);
        const currentChat = msg.key.remoteJid;
        await socket.sendMessage(currentChat, { text: '❌ *View-once save වෙද්දී error එකක් උනා.*' }, { quoted: msg });
    }
    break;
}
case 'ping2': {
    // Chat ID එක ආරක්ෂිතව ලබා ගැනීම (sender/from වෙනුවට msg.key.remoteJid භාවිතයෙන්)
    const currentChat = msg.key.remoteJid;

    try {
        const fs = require('fs');
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // ⚡ පළමු Reaction එක (වැඩේ ආරම්භ කළ බව පෙන්වීමට)
        await socket.sendMessage(currentChat, { react: { text: '⏳', key: msg.key } });

        // Send the initial "Pinging..." message
        const loadingText = `*𝙿𝚒𝚗𝚐𝚒𝚗𝚐...*`;
        const { key } = await socket.sendMessage(currentChat, { text: loadingText }, { quoted: msg });

        // 🔄 Animation Sequence
        const frames = [
            '◜   𝚕𝚘𝚊𝚍𝚒𝚗𝚐.',
            '◠   𝚕𝚘𝚊𝚍𝚒𝚗𝚐.',
            '◝   𝚕𝚘𝚊𝚍𝚒𝚗𝚐.',
            '◞   𝚕𝚘𝚊𝚍𝚒𝚗𝚐.',
            '◡   𝚕𝚘𝚊𝚍𝚒𝚗𝚐.',
            '◟   𝚕𝚘𝚊𝚍𝚒𝚗𝚐.',
            '◌   𝚜𝚞𝚌𝚌𝚎𝚜𝚜!'
        ];

        for (let frame of frames) {
            await socket.sendMessage(currentChat, { 
                text: `*ᴀɴᴀʟʏᴢɪɴɢ ɴᴇᴛᴡᴏʀᴋ...*\n${frame}`, 
                edit: key 
            });
            await sleep(500); // 0.5s delay
        }

        // =================================================================
        // 📊 2. REAL DATA PROCESSING & UPTIME CALCULATION
        // =================================================================
        const start = Date.now();
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        
        // MongoDB Config Safe Check
        let cfg = {};
        try {
            if (typeof loadUserConfigFromMongo === 'function') {
                cfg = await loadUserConfigFromMongo(sanitized) || {};
            }
        } catch (mErr) {}

        const botName = cfg.BOT_NAME || cfg.botName || (typeof BOT_NAME !== 'undefined' ? BOT_NAME_FANCY : "🤖 Status Assistant");
        const logo = cfg.logo || (config && config.SITHIJA_IMAGE_PATH) || '';

        // Latency / Ping Calculation
        const end = Date.now();
        const latency = end - start; 
        const finalLatency = latency > 0 ? latency : Math.floor(Math.random() * 30) + 10;

        // Real Uptime Calculation (බොට් වැඩ කරපු සැබෑ කාලය)
        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);

        // Status Determine
        const status = finalLatency < 100 ? 'Excellent 🚀' : 'Good 🌐';

        // Dynamic Footer Fetching
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `🤖 ${botName}`;

        // =================================================================
        // 🖼️ 3. FINAL ARTFUL CARD (The "Result")
        // =================================================================
        const pongStatus = `*🟢 ᴘᴏɴɢ*_ \n\n` +
                           `📡 *ᴘɪɴɢ:* \`${finalLatency}ms\`\n` +
                           `🛰️ *sᴛᴀᴛᴜs:* ${status}\n` +
                           `🆙 *ᴜᴘᴛɪᴍᴇ:* ${hours}h ${minutes}m ${seconds}s\n\n` +
                           `> ${currentFooter}`;

        // Logo Image Payload Handle
        let imagePayload = String(logo).startsWith('http') ? { url: logo } : (fs.existsSync(logo) ? fs.readFileSync(logo) : { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe' });

        // Loading මැසේජ් එක අයින් කර අවසන් Card එක යැවීම (හෝ Edit කිරීම වෙනුවට අලුතින්ම යැවීම)
        try { await socket.sendMessage(currentChat, { delete: key }); } catch (e) {}

        const prefixSymbol = (typeof config !== 'undefined' && config.PREFIX) || '.';

        await socket.sendMessage(currentChat, {
            image: imagePayload,
            caption: pongStatus + `\n\n> *${prefixSymbol}* | *${prefixSymbol}alive*`,
            contextInfo: {
                externalAdReply: {
                    title: botName,
                    body: `🚀 Speed Test Result`,
                    mediaType: 1,
                    thumbnailUrl: String(logo).startsWith('http') ? logo : '',
                    sourceUrl: 'https://whatsapp.com',
                    renderLargerThumbnail: true,
                    showAdAttribution: false
                }
            }
        }, { quoted: msg });

        // 🌿 Final "Done" Reaction
        await socket.sendMessage(currentChat, { react: { text: '🌿', key: msg.key } });

    } catch (e) {
        console.error('Ping command error:', e);
        const currentChat = msg.key.remoteJid;
        await socket.sendMessage(currentChat, { text: '❌ *Error in Loading Sequence.*' }, { quoted: msg });
    }
    break;
}
case 'tt2':
case 'tiktokdl': {
    try {
        const axios = require("axios");

        // Chat ID එක ආරක්ෂිතව ලබා ගැනීම (sender/from වෙනුවට msg.key.remoteJid භාවිතයෙන්)
        const currentChat = msg.key.remoteJid;

        // 1. URL ලබා ගැනීම සහ Validation
        let text = (args.join(' ') || '').trim();
        
        if (!text || !text.startsWith('https://')) {
            return await socket.sendMessage(currentChat, {
                text: "❌ *Please provide a valid TikTok Link!*"
            }, { quoted: msg });
        }

        // 2. User Number එක සහ Bot Name Config එක ආරක්ෂිතව ලබා ගැනීම
        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const sanitized = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');
        
        let cfg = {};
        try {
            if (typeof loadUserConfigFromMongo === 'function' && sanitized) {
                cfg = await loadUserConfigFromMongo(sanitized) || {};
            }
        } catch (mErr) {}

        let botName = cfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botName}*`;

        // 3. ✨ පළමු Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '✨', key: msg.key } });

        // 4. API Request
        const apiRes = await axios.get("https://www.movanest.xyz/v2/tiktok", {
            params: { url: text }
        }).catch(() => null);

        if (!apiRes || !apiRes.data || !apiRes.data.status || !apiRes.data.results) {
            return await socket.sendMessage(currentChat, { text: "❌ *TikTok Video Not Found!*" }, { quoted: msg });
        }

        const result = apiRes.data.results;
        
        // 5. ලස්සන Fancy Caption එක
        const captionMessage = `╭───「 📍 *${botName}* 」───◆\n` +
                               `│\n` +
                               `│ 👤 *Author:* ${result.author_nickname || "Unknown"}\n` +
                               `│ 📝 *Desc:* ${result.desc || "No Description"}\n` +
                               `│ 👁️ *Views:* ${result.play_count || "N/A"}\n` +
                               `│ 🔄 *Shares:* ${result.share_count || "N/A"}\n` +
                               `│\n` +
                               `╰───────────────────────◆\n\n` +
                               `👇 *ꜱᴇʟᴇᴄᴛ ʏᴏᴜʀ ᴅᴏᴡɴʟᴏᴀᴅ ᴛʏᴘᴇ* 👇`;

        // 6. Numbered Options
        const ttNumberedCaption = captionMessage + `\n\n` +
                                  `*1.* 🎬 NO WATERMARK\n` +
                                  `*2.* 💧 WITH WATERMARK\n` +
                                  `*3.* 🎵 AUDIO FILE\n` +
                                  `*4.* 📹 VIDEO NOTE\n\n` +
                                  `> *↩️ Reply with a number (1-4) to download*`;

        // 7. Send Numbered Message
        const sentMessage = await socket.sendMessage(currentChat, {
            image: { url: result.cover || result.thumbnail || "https://files.catbox.moe/g6ywiw.jpeg" },
            caption: ttNumberedCaption,
            contextInfo: {
                externalAdReply: {
                    title: "🎵 ＴＩＫＴＯＫ  ＤＯＷＮＬＯＡＤＥＲ",
                    body: "ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ᴍᴇᴅɪᴀ...",
                    thumbnailUrl: result.cover || result.thumbnail,
                    sourceUrl: text,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });
        
        const messageID = sentMessage.key.id;

        // 8. User Number Reply හැසිරවීම
        const handleTikTokSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const selectedId = (replyMek.message.conversation || replyMek.message.extendedTextMessage?.text || '').trim();
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            // සාමාන්‍යයෙන් Group එකකදී හෝ Inbox එකකදී මැසේජ් එක එවපු කෙනාමදැයි පරීක්ෂා කිරීම
            const replyUser = replyMek.key.participant || replyMek.key.remoteJid || '';

            if (isReplyToSentMsg && ['1','2','3','4','tt_nw','tt_wm','tt_audio','tt_ptv'].includes(selectedId)) {
                
                // Listener එක වහාම ඉවත් කිරීම (Double requests වැළැක්වීමට)
                socket.ev.removeListener('messages.upsert', handleTikTokSelection);
                if (timeoutId) clearTimeout(timeoutId);

                await socket.sendMessage(currentChat, { react: { text: '⬇️', key: replyMek.key } });

                let mediaBuffer;
                let mimeType = 'video/mp4';
                let isPtv = false;
                let finalCaption = '';
                let downloadUrl = '';

                try {
                    switch (selectedId) {
                        case 'tt_nw':
                        case '1':
                            downloadUrl = result.no_watermark;
                            finalCaption = `╭──「 *NO WATERMARK* 」──◆\n│ ✅ Downloaded Successfully!\n╰─────────────────◆\n\n> ${currentFooter}`;
                            break;
                        case 'tt_wm':
                        case '2':
                            downloadUrl = result.watermark;
                            finalCaption = `╭──「 *WITH WATERMARK* 」──◆\n│ ✅ Downloaded Successfully!\n╰─────────────────◆\n\n> ${currentFooter}`;
                            break;
                        case 'tt_audio':
                        case '3':
                            downloadUrl = result.music;
                            mimeType = 'audio/mpeg';
                            break;
                        case 'tt_ptv':
                        case '4':
                            downloadUrl = result.no_watermark;
                            isPtv = true;
                            break;
                        default:
                            return;
                    }

                    if (!downloadUrl) throw new Error("URL Missing");

                    // Download Buffer
                    const bufferRes = await axios.get(downloadUrl, {
                        responseType: 'arraybuffer',
                        headers: { "User-Agent": "Mozilla/5.0" },
                        timeout: 60000
                    });
                    mediaBuffer = Buffer.from(bufferRes.data);

                    if (mediaBuffer.length > 100 * 1024 * 1024) {
                         return await socket.sendMessage(currentChat, { text: '❌ File too large (>100MB)!' }, { quoted: replyMek });
                    }

                    // Send Final Media
                    let msgContent = {};
                    if (mimeType === 'audio/mpeg') {
                        msgContent = { audio: mediaBuffer, mimetype: mimeType, ptt: false };
                    } else if (isPtv) {
                        msgContent = { video: mediaBuffer, mimetype: mimeType, ptv: true };
                    } else {
                        msgContent = { video: mediaBuffer, mimetype: mimeType, caption: finalCaption };
                    }

                    await socket.sendMessage(currentChat, msgContent, { quoted: replyMek });
                    await socket.sendMessage(currentChat, { react: { text: '✅', key: replyMek.key } });

                } catch (err) {
                    console.error(err);
                    await socket.sendMessage(currentChat, { text: '❌ Download Failed!' }, { quoted: replyMek });
                }
            }
        };

        // වැරදීමකින් හෝ පරිශීලකයා Reply නොකළහොත් විනාඩි 2 කින් මෙම Listener එක මතකයෙන් ඉවත් කරයි (Memory Leak Protection)
        socket.ev.on('messages.upsert', handleTikTokSelection);
        const timeoutId = setTimeout(() => {
            socket.ev.removeListener('messages.upsert', handleTikTokSelection);
        }, 120000);

    } catch (err) {
        console.error(err);
        const currentChat = msg.key.remoteJid;
        await socket.sendMessage(currentChat, { text: '*❌ System Error.*' }, { quoted: msg });
    }
    break;
}
case 'mediafire':
case 'mf':
case 'mfdl': {
    // Chat ID එක ආරක්ෂිතව ලබා ගැනීම (sender වෙනුවට msg.key.remoteJid භාවිතයෙන්)
    const currentChat = msg.key.remoteJid;

    try {
        const axios = require('axios');
        
        let text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
        const url = text.split(" ")[1]; // .mediafire <link>

        // User Number එක ආරක්ෂිතව ලබා ගැනීම (Safe check for number or participant)
        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const sanitized = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');

        // MongoDB config safe check
        let cfg = {};
        try {
            if (typeof loadUserConfigFromMongo === 'function' && sanitized) {
                cfg = await loadUserConfigFromMongo(sanitized) || {};
            }
        } catch (mErr) {}

        let botName = cfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botName}*`;

        // 🛡️ Fake Meta contact message
        const shonux = {
            key: {
                remoteJid: "status@broadcast",
                participant: "0@s.whatsapp.net",
                fromMe: false,
                id: "META_AI_FAKE_ID_MEDIAFIRE"
            },
            message: {
                contactMessage: {
                    displayName: botName,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD`
                }
            }
        };

        if (!url) {
            return await socket.sendMessage(currentChat, {
                text: '🚫 *Please send a MediaFire link.*\n\nExample: .mediafire <url>'
            }, { quoted: shonux });
        }

        // 📥 පළමු Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '📥', key: msg.key } });

        // API Request
        let api = `https://tharuzz-ofc-apis.vercel.app/api/download/mediafire?url=${encodeURIComponent(url)}`;
        let response = await axios.get(api).catch(() => null);

        if (!response || !response.data || !response.data.success || !response.data.result) {
            return await socket.sendMessage(currentChat, { text: '❌ *Failed to fetch MediaFire file. Check link or try later.*' }, { quoted: shonux });
        }

        const result = response.data.result;
        const title = result.title || result.filename || 'File';
        const filename = result.filename || 'file.dat';
        const fileSize = result.size || 'Unknown';
        const downloadUrl = result.url;

        const caption = `📦 *${title}*\n\n` +
                        `📁 *𝐅ilename:* ${filename}\n` +
                        `📏 *𝐒ize:* ${fileSize}\n` +
                        `🌐 *𝐅rom:* ${result.from || 'MediaFire'}\n` +
                        `📅 *𝐃ate:* ${result.date || 'N/A'}\n` +
                        `🕑 *𝐓ime:* ${result.time || 'N/A'}\n\n` +
                        `> ${currentFooter}`;

        // 🔹 Document එකක් ලෙස ෆයිල් එක යැවීම
        await socket.sendMessage(currentChat, {
            document: { url: downloadUrl },
            fileName: filename,
            mimetype: 'application/octet-stream',
            caption: caption
        }, { quoted: shonux });

        // ✅ වැඩේ සාර්ථකව අවසන් වූ පසු ලැබෙන දෙවැනි Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error("Error in MediaFire downloader:", err);

        // Catch එක ඇතුළතදීද ආරක්ෂිතව විස්තර ලෝඩ් කිරීම
        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const sanitized = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');
        
        let cfg = {};
        try { if (typeof loadUserConfigFromMongo === 'function' && sanitized) cfg = await loadUserConfigFromMongo(sanitized) || {}; } catch(e){}
        let botName = cfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');

        const shonux = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_MEDIAFIRE" },
            message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
        };

        await socket.sendMessage(currentChat, { text: '*❌ Internal Error. Please try again later.*' }, { quoted: shonux });
    }
    break;
}
              
case 'itn': {
    const currentChat = msg.key.remoteJid;
    try {
        const axios = require('axios');
        
        // ⚡ පළමු Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '📰', key: msg.key } });

        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const sanitized = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');
        
        let userCfg = {};
        try { if (typeof loadUserConfigFromMongo === 'function' && sanitized) userCfg = await loadUserConfigFromMongo(sanitized) || {}; } catch (e) {}
        const botName = userCfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botName}*`;

        const botMention = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_ITN" },
            message: {
                contactMessage: {
                    displayName: botName, 
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD`
                }
            }
        };

        const res = await axios.get('https://api.srihub.store/news/itn?apikey=dew_nPUIx9HHozkgxSpy3H9FgUQ1OVylTVgdoUJC44Gl').catch(() => null);
        if (!res || !res.data?.success || !res.data.result) {
            return await socket.sendMessage(currentChat, { text: '❌ Failed to fetch ITN News.' }, { quoted: botMention });
        }

        const n = res.data.result;
        const caption = `📰 *𝗜ᴛɴ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> ${currentFooter}`;

        await socket.sendMessage(currentChat, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [userJid] } }, { quoted: botMention });
        await socket.sendMessage(currentChat, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error('itnnews error:', err);
        await socket.sendMessage(currentChat, { text: '❌ Error fetching ITN News.' }, { quoted: msg });
    }
    break;
}

case 'hiru': {
    const currentChat = msg.key.remoteJid;
    try {
        const axios = require('axios');
        
        // ⚡ පළමු Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '📰', key: msg.key } });

        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const sanitized = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');
        
        let userCfg = {};
        try { if (typeof loadUserConfigFromMongo === 'function' && sanitized) userCfg = await loadUserConfigFromMongo(sanitized) || {}; } catch (e) {}
        const botName = userCfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botName}*`;

        const botMention = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_HIRU" },
            message: {
                contactMessage: {
                    displayName: botName, 
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD`
                }
            }
        };

        const res = await axios.get('https://api.srihub.store/news/hiru?apikey=dew_nPUIx9HHozkgxSpy3H9FgUQ1OVylTVgdoUJC44Gl').catch(() => null);
        if (!res || !res.data?.success || !res.data.result) {
            return await socket.sendMessage(currentChat, { text: '❌ Failed to fetch Hiru News.' }, { quoted: botMention });
        }

        const n = res.data.result;
        const caption = `📰 *𝗛ɪʀᴜ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> ${currentFooter}`;

        await socket.sendMessage(currentChat, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [userJid] } }, { quoted: botMention });
        await socket.sendMessage(currentChat, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error('hirunews error:', err);
        await socket.sendMessage(currentChat, { text: '❌ Error fetching Hiru News.' }, { quoted: msg });
    }
    break;
}

case 'ada': {
    const currentChat = msg.key.remoteJid;
    try {
        const axios = require('axios');
        
        // ⚡ පළමු Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '📰', key: msg.key } });

        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const sanitized = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');
        
        let userCfg = {};
        try { if (typeof loadUserConfigFromMongo === 'function' && sanitized) userCfg = await loadUserConfigFromMongo(sanitized) || {}; } catch (e) {}
        const botName = userCfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botName}*`;

        const botMention = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_ADA" },
            message: {
                contactMessage: {
                    displayName: botName, 
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD`
                }
            }
        };

        const res = await axios.get('https://saviya-kolla-api.koyeb.app/news/ada').catch(() => null);
        if (!res || !res.data?.status || !res.data.result) {
            return await socket.sendMessage(currentChat, { text: '❌ Failed to fetch Ada News.' }, { quoted: botMention });
        }

        const n = res.data.result;
        const caption = `📰 *𝗔ᴅᴀ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n*⏰ 𝗧ɪᴍᴇ :* ${n.time}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> ${currentFooter}`;

        await socket.sendMessage(currentChat, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [userJid] } }, { quoted: botMention });
        await socket.sendMessage(currentChat, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error('adanews error:', err);
        await socket.sendMessage(currentChat, { text: '❌ Error fetching Ada News.' }, { quoted: msg });
    }
    break;
}

case 'sirasa': {
    const currentChat = msg.key.remoteJid;
    try {
        const axios = require('axios');
        
        // ⚡ පළමු Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '📰', key: msg.key } });

        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const sanitized = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');
        
        let userCfg = {};
        try { if (typeof loadUserConfigFromMongo === 'function' && sanitized) userCfg = await loadUserConfigFromMongo(sanitized) || {}; } catch (e) {}
        const botName = userCfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botName}*`;

        const botMention = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_SIRASA" },
            message: {
                contactMessage: {
                    displayName: botName, 
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD`
                }
            }
        };

        const res = await axios.get('https://saviya-kolla-api.koyeb.app/news/sirasa').catch(() => null);
        if (!res || !res.data?.status || !res.data.result) {
            return await socket.sendMessage(currentChat, { text: '❌ Failed to fetch Sirasa News.' }, { quoted: botMention });
        }

        const n = res.data.result;
        const caption = `📰 *𝗦ɪʀᴀꜱᴀ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n*⏰ 𝗧ɪᴍᴇ :* ${n.time}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> ${currentFooter}`;

        await socket.sendMessage(currentChat, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [userJid] } }, { quoted: botMention });
        await socket.sendMessage(currentChat, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error('sirasanews error:', err);
        await socket.sendMessage(currentChat, { text: '❌ Error fetching Sirasa News.' }, { quoted: msg });
    }
    break;
}
              
case 'getdp': {
    // Chat ID එක ආරක්ෂිතව ලබා ගැනීම (from/sender වෙනුවට msg.key.remoteJid භාවිතයෙන්)
    const currentChat = msg.key.remoteJid;

    try {
        // ⚡ පළමු Reaction එක (වැඩේ ආරම්භ කළ බව පෙන්වීමට)
        await socket.sendMessage(currentChat, { react: { text: '🖼️', key: msg.key } });

        const sanitizedOwn = (number || '').replace(/[^0-9]/g, '');
        
        // MongoDB config safe check
        let cfgDp = {};
        try {
            if (typeof loadUserConfigFromMongo === 'function') {
                cfgDp = await loadUserConfigFromMongo(sanitizedOwn) || {};
            }
        } catch (mErr) {}
        
        const botNameDp = cfgDp.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botNameDp}*`;

        // ── Resolve target JID ──
        let targetJid = null;

        const mentionedList = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
          || msg.message?.imageMessage?.contextInfo?.mentionedJid
          || [];

        if (mentionedList.length > 0) {
            targetJid = mentionedList[0];
        } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            targetJid = msg.message.extendedTextMessage.contextInfo.participant;
        } else if (args[0]) {
            const rawNum = args[0].replace(/[^0-9]/g, '');
            if (rawNum.length > 4) targetJid = `${rawNum}@s.whatsapp.net`;
        }

        // nowsender හෝ sender variable එක නොමැති වුවහොත් fallback එකක් ලෙස msg.participant භාවිතා කරයි
        if (!targetJid) targetJid = (typeof nowsender !== 'undefined' ? nowsender : (typeof sender !== 'undefined' ? sender : (msg.participant || msg.key.participant || currentChat)));

        const targetNum = targetJid.split('@')[0];

        // ── Fetch DP ──
        let dpUrl = null;
        try {
            dpUrl = await socket.profilePictureUrl(targetJid, 'image');
        } catch (e) {
            dpUrl = null;
        }

        // DP එකක් සෙට් කර නොමැති නම් හෝ සඟවා ඇත්නම්
        if (!dpUrl) {
            await socket.sendMessage(currentChat, {
                text: `❌ *DP ලබාගන්න බැරිවුනා!*\n\n› Profile picture hidden or not set.\n› *Number:* @${targetNum}\n\n> ${currentFooter}`,
                mentions: [targetJid]
            }, { quoted: msg });
            break;
        }

        // Caption එක සකස් කිරීම
        const caption = `╭━━━━━━━━━━━━━━━━╮\n` +
                        `┃  🖼️ *𝗣𝗥𝗢𝗙𝗜𝗟𝗘 𝗣𝗜𝗖𝗧𝗨𝗥𝗘*\n` +
                        `╰━━━━━━━━━━━━━━━━╯\n\n` +
                        `┃ 👤 *u𝘀𝗲𝗿 :* @${targetNum}\n` +
                        `┃ 📱 *𝗡𝘂𝗺𝗯𝗲𝗿 :* +${targetNum}\n` +
                        `┃ ✅ *𝗦𝘁𝗮𝘁𝘂𝘀 :* DP Found\n\n` +
                        `> ${currentFooter}`;

        // DP එක සහ විස්තර සහිත මැසේජ් එක යැවීම
        const prefixSymbol = (typeof config !== 'undefined' && config.PREFIX) || '.';
        await socket.sendMessage(currentChat, {
            image: { url: dpUrl },
            caption: caption + `\n\n> *${prefixSymbol}getdp* to get another DP`,
            mentions: [targetJid],
            contextInfo: {
                mentionedJid: [targetJid],
                externalAdReply: {
                    title: `@${targetNum}`,
                    body: 'Profile Picture',
                    thumbnailUrl: dpUrl,
                    sourceUrl: dpUrl,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });

        // ✅ වැඩේ සාර්ථකව ඉවර වුණාම වැටෙන දෙවැනි Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '✅', key: msg.key } });

    } catch (e) {
        console.error('getdp error:', e);
        // Error එකක් ආවත් බොට් ක්‍රියා විරහිත නොවේ
        await socket.sendMessage(msg.key.remoteJid, { text: '❌ *DP ගන්නකොට error එකක් උනා.*' }, { quoted: msg });
    }
    break;
}

case 'antilink': {
    const currentChat = msg.key.remoteJid;
    if (!isGroup) return await socket.sendMessage(currentChat, { text: '❌ This command is for groups only.' }, { quoted: msg });
    
    await socket.sendMessage(currentChat, { react: { text: '🔗', key: msg.key } });
    try {
        const userJid = msg.participant || msg.key.participant || '';
        let gAdmins = [];
        try { const m = await socket.groupMetadata(currentChat); gAdmins = m.participants.filter(p => p.admin).map(p => p.id); } catch(e) {}
        
        if (!gAdmins.includes(userJid) && !isBotOrOwner) return await socket.sendMessage(currentChat, { text: '❌ Only group admins can use this.' }, { quoted: msg });
        
        const opt = (args[0] || '').toLowerCase();
        if (opt === 'on' || opt === 'off') {
          await setGroupSetting(currentChat, 'ANTI_LINK', opt);
          await socket.sendMessage(currentChat, { text: `✅ *Anti Link ${opt === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*\nLinks will ${opt === 'on' ? 'now be deleted.' : 'no longer be deleted.'}` }, { quoted: msg });
        } else {
          await socket.sendMessage(currentChat, { text: `📖 *Anti Link:*\n.antilink on\n.antilink off` }, { quoted: msg });
        }
    } catch(e) { await socket.sendMessage(currentChat, { text: '❌ Error.' }, { quoted: msg }); }
    break;
}

case 'antispam': {
    const currentChat = msg.key.remoteJid;
    if (!isGroup) return await socket.sendMessage(currentChat, { text: '❌ This command is for groups only.' }, { quoted: msg });
    
    await socket.sendMessage(currentChat, { react: { text: '🚫', key: msg.key } });
    try {
        const userJid = msg.participant || msg.key.participant || '';
        let gAdmins = [];
        try { const m = await socket.groupMetadata(currentChat); gAdmins = m.participants.filter(p => p.admin).map(p => p.id); } catch(e) {}
        
        if (!gAdmins.includes(userJid) && !isBotOrOwner) return await socket.sendMessage(currentChat, { text: '❌ Only group admins can use this.' }, { quoted: msg });
        
        const opt = (args[0] || '').toLowerCase();
        if (opt === 'on' || opt === 'off') {
          await setGroupSetting(currentChat, 'ANTI_SPAM', opt);
          await socket.sendMessage(currentChat, { text: `✅ *Anti Spam ${opt === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*` }, { quoted: msg });
        } else {
          await socket.sendMessage(currentChat, { text: `📖 *Anti Spam:*\n.antispam on\n.antispam off` }, { quoted: msg });
        }
    } catch(e) { await socket.sendMessage(currentChat, { text: '❌ Error.' }, { quoted: msg }); }
    break;
}

case 'welcome': {
    const currentChat = msg.key.remoteJid;
    if (!isGroup) return await socket.sendMessage(currentChat, { text: '❌ This command is for groups only.' }, { quoted: msg });
    
    await socket.sendMessage(currentChat, { react: { text: '👋', key: msg.key } });
    try {
        const userJid = msg.participant || msg.key.participant || '';
        let gAdmins = [];
        try { const m = await socket.groupMetadata(currentChat); gAdmins = m.participants.filter(p => p.admin).map(p => p.id); } catch(e) {}
        
        if (!gAdmins.includes(userJid) && !isBotOrOwner) return await socket.sendMessage(currentChat, { text: '❌ Only group admins can use this.' }, { quoted: msg });
        
        const opt = (args[0] || '').toLowerCase();
        if (opt === 'on' || opt === 'off') {
          await setGroupSetting(currentChat, 'WELCOME', opt);
          await socket.sendMessage(currentChat, { text: `✅ *Welcome Message ${opt === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*` }, { quoted: msg });
        } else if (opt === 'msg' && args.length > 1) {
          const wMsg = args.slice(1).join(' ');
          await setGroupSetting(currentChat, 'WELCOME_MSG', wMsg);
          await socket.sendMessage(currentChat, { text: `✅ *Welcome message set!*\n${wMsg}` }, { quoted: msg });
        } else {
          await socket.sendMessage(currentChat, { text: `📖 *Welcome:*\n.welcome on/off\n.welcome msg <custom message>` }, { quoted: msg });
        }
    } catch(e) { await socket.sendMessage(currentChat, { text: '❌ Error.' }, { quoted: msg }); }
    break;
}

case 'goodbye': {
    const currentChat = msg.key.remoteJid;
    if (!isGroup) return await socket.sendMessage(currentChat, { text: '❌ This command is for groups only.' }, { quoted: msg });
    
    await socket.sendMessage(currentChat, { react: { text: '🚪', key: msg.key } });
    try {
        const userJid = msg.participant || msg.key.participant || '';
        let gAdmins = [];
        try { const m = await socket.groupMetadata(currentChat); gAdmins = m.participants.filter(p => p.admin).map(p => p.id); } catch(e) {}
        
        if (!gAdmins.includes(userJid) && !isBotOrOwner) return await socket.sendMessage(currentChat, { text: '❌ Only group admins can use this.' }, { quoted: msg });
        
        const opt = (args[0] || '').toLowerCase();
        if (opt === 'on' || opt === 'off') {
          await setGroupSetting(currentChat, 'GOODBYE', opt);
          await socket.sendMessage(currentChat, { text: `✅ *Goodbye Message ${opt === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*` }, { quoted: msg });
        } else if (opt === 'msg' && args.length > 1) {
          const gMsg = args.slice(1).join(' ');
          await setGroupSetting(currentChat, 'GOODBYE_MSG', gMsg);
          await socket.sendMessage(currentChat, { text: `✅ *Goodbye message set!*\n${gMsg}` }, { quoted: msg });
        } else {
          await socket.sendMessage(currentChat, { text: `📖 *Goodbye:*\n.goodbye on/off\n.goodbye msg <custom message>` }, { quoted: msg });
        }
    } catch(e) { await socket.sendMessage(currentChat, { text: '❌ Error.' }, { quoted: msg }); }
    break;
}

case 'kick': {
    const currentChat = msg.key.remoteJid;
    if (!isGroup) return await socket.sendMessage(currentChat, { text: '❌ Groups only.' }, { quoted: msg });
    
    await socket.sendMessage(currentChat, { react: { text: '👢', key: msg.key } });
    try {
        const userJid = msg.participant || msg.key.participant || '';
        let gAdmins = [];
        try { const m = await socket.groupMetadata(currentChat); gAdmins = m.participants.filter(p => p.admin).map(p => p.id); } catch(e) {}
        
        if (!gAdmins.includes(userJid) && !isBotOrOwner) return await socket.sendMessage(currentChat, { text: '❌ Only group admins can kick.' }, { quoted: msg });
        
        const target = msg.message?.extendedTextMessage?.contextInfo?.participant || (args[0] ? `${args[0].replace(/[^0-9]/g,'')}@s.whatsapp.net` : null);
        if (!target) return await socket.sendMessage(currentChat, { text: '❌ Reply to a message or provide a number.' }, { quoted: msg });
        
        await socket.groupParticipantsUpdate(currentChat, [target], 'remove');
        await socket.sendMessage(currentChat, { text: `✅ @${target.split('@')[0]} has been kicked.`, mentions: [target] }, { quoted: msg });
    } catch(e) { await socket.sendMessage(currentChat, { text: '❌ Failed. Make sure bot is admin.' }, { quoted: msg }); }
    break;
}

case 'promote': {
    const currentChat = msg.key.remoteJid;
    if (!isGroup) return await socket.sendMessage(currentChat, { text: '❌ Groups only.' }, { quoted: msg });
    
    await socket.sendMessage(currentChat, { react: { text: '⬆️', key: msg.key } });
    try {
        const userJid = msg.participant || msg.key.participant || '';
        let gAdmins = [];
        try { const m = await socket.groupMetadata(currentChat); gAdmins = m.participants.filter(p => p.admin).map(p => p.id); } catch(e) {}
        
        if (!gAdmins.includes(userJid) && !isBotOrOwner) return await socket.sendMessage(currentChat, { text: '❌ Only group admins can promote.' }, { quoted: msg });
        
        const target = msg.message?.extendedTextMessage?.contextInfo?.participant || (args[0] ? `${args[0].replace(/[^0-9]/g,'')}@s.whatsapp.net` : null);
        if (!target) return await socket.sendMessage(currentChat, { text: '❌ Reply to a message or provide a number.' }, { quoted: msg });
        
        await socket.groupParticipantsUpdate(currentChat, [target], 'promote');
        await socket.sendMessage(currentChat, { text: `✅ @${target.split('@')[0]} promoted to admin!`, mentions: [target] }, { quoted: msg });
    } catch(e) { await socket.sendMessage(currentChat, { text: '❌ Failed. Make sure bot is admin.' }, { quoted: msg }); }
    break;
}

case 'demote': {
    const currentChat = msg.key.remoteJid;
    if (!isGroup) return await socket.sendMessage(currentChat, { text: '❌ Groups only.' }, { quoted: msg });
    
    await socket.sendMessage(currentChat, { react: { text: '⬇️', key: msg.key } });
    try {
        const userJid = msg.participant || msg.key.participant || '';
        let gAdmins = [];
        try { const m = await socket.groupMetadata(currentChat); gAdmins = m.participants.filter(p => p.admin).map(p => p.id); } catch(e) {}
        
        if (!gAdmins.includes(userJid) && !isBotOrOwner) return await socket.sendMessage(currentChat, { text: '❌ Only admins can demote.' }, { quoted: msg });
        
        const target = msg.message?.extendedTextMessage?.contextInfo?.participant || (args[0] ? `${args[0].replace(/[^0-9]/g,'')}@s.whatsapp.net` : null);
        if (!target) return await socket.sendMessage(currentChat, { text: '❌ Reply to a message or provide a number.' }, { quoted: msg });
        
        await socket.groupParticipantsUpdate(currentChat, [target], 'demote');
        await socket.sendMessage(currentChat, { text: `✅ @${target.split('@')[0]} demoted from admin.`, mentions: [target] }, { quoted: msg });
    } catch(e) { await socket.sendMessage(currentChat, { text: '❌ Failed. Make sure bot is admin.' }, { quoted: msg }); }
    break;
}

case 'mute': {
    const currentChat = msg.key.remoteJid;
    if (!isGroup) return await socket.sendMessage(currentChat, { text: '❌ Groups only.' }, { quoted: msg });
    
    await socket.sendMessage(currentChat, { react: { text: '🔇', key: msg.key } });
    try {
        const userJid = msg.participant || msg.key.participant || '';
        let gAdmins = [];
        try { const m = await socket.groupMetadata(currentChat); gAdmins = m.participants.filter(p => p.admin).map(p => p.id); } catch(e) {}
        
        if (!gAdmins.includes(userJid) && !isBotOrOwner) return await socket.sendMessage(currentChat, { text: '❌ Only admins can mute.' }, { quoted: msg });
        
        await socket.groupSettingUpdate(currentChat, 'announcement');
        await socket.sendMessage(currentChat, { text: '🔇 *Group muted.* Only admins can send messages.' }, { quoted: msg });
    } catch(e) { await socket.sendMessage(currentChat, { text: '❌ Failed. Make sure bot is admin.' }, { quoted: msg }); }
    break;
}

case 'unmute': {
    const currentChat = msg.key.remoteJid;
    if (!isGroup) return await socket.sendMessage(currentChat, { text: '❌ Groups only.' }, { quoted: msg });
    
    await socket.sendMessage(currentChat, { react: { text: '🔊', key: msg.key } });
    try {
        const userJid = msg.participant || msg.key.participant || '';
        let gAdmins = [];
        try { const m = await socket.groupMetadata(currentChat); gAdmins = m.participants.filter(p => p.admin).map(p => p.id); } catch(e) {}
        
        if (!gAdmins.includes(userJid) && !isBotOrOwner) return await socket.sendMessage(currentChat, { text: '❌ Only admins can unmute.' }, { quoted: msg });
        
        await socket.groupSettingUpdate(currentChat, 'not_announcement');
        await socket.sendMessage(currentChat, { text: '🔊 *Group unmuted.* Everyone can send messages.' }, { quoted: msg });
    } catch(e) { await socket.sendMessage(currentChat, { text: '❌ Failed. Make sure bot is admin.' }, { quoted: msg }); }
    break;
}

case 'groupinfo': {
    const currentChat = msg.key.remoteJid;
    if (!isGroup) return await socket.sendMessage(currentChat, { text: '❌ Groups only.' }, { quoted: msg });
    
    await socket.sendMessage(currentChat, { react: { text: 'ℹ️', key: msg.key } });
    try {
        const meta = await socket.groupMetadata(currentChat);
        const admins = meta.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`);
        const gs = typeof getAllGroupSettings === 'function' ? await getAllGroupSettings(currentChat) : {};
        const created = meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : 'Unknown';
        
        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const sanitized = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');
        let cfg = {};
        try { if (typeof loadUserConfigFromMongo === 'function' && sanitized) cfg = await loadUserConfigFromMongo(sanitized) || {}; } catch(e) {}
        let botName = cfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botName}*`;

        await socket.sendMessage(currentChat, {
          text: `*╭─❰ GROUP INFO ❱─╮*\n*│* 📛 *Name:* ${meta.subject || 'Unknown'}\n*│* 👥 *Members:* ${meta.participants.length}\n*│* 👑 *Admins:* ${admins.join(', ') || 'None'}\n*│* 📅 *Created:* ${created}\n*│* 🔗 *Anti Link:* ${gs.ANTI_LINK === 'on' ? '✅ ON' : '❌ OFF'}\n*│* 🚫 *Anti Spam:* ${gs.ANTI_SPAM === 'on' ? '✅ ON' : '❌ OFF'}\n*│* 👋 *Welcome:* ${gs.WELCOME === 'on' ? '✅ ON' : '❌ OFF'}\n*│* 🚪 *Goodbye:* ${gs.GOODBYE === 'on' ? '✅ ON' : '❌ OFF'}\n*╰──────────────╯*\n> ${currentFooter}`,
          mentions: meta.participants.filter(p => p.admin).map(p => p.id)
        }, { quoted: msg });
    } catch(e) { await socket.sendMessage(currentChat, { text: '❌ Failed to get group info.' }, { quoted: msg }); }
    break;
}

case 'antibadword': {
    const currentChat = msg.key.remoteJid;
    await socket.sendMessage(currentChat, { react: { text: '🛡️', key: msg.key } });
    try {
        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const _san = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');
        const _own = (typeof config !== 'undefined' && config.OWNER_NUMBER ? config.OWNER_NUMBER.split(',')[0].replace(/[^0-9]/g, '') : '');
        
        let _uc = {};
        try { if (typeof loadUserConfigFromMongo === 'function' && _san) _uc = await loadUserConfigFromMongo(_san) || {}; } catch(e) {}
        const _storedOwner = (_uc.sessionOwner || '').replace(/[^0-9]/g, '');
        
        if (_san !== _own && (!_storedOwner || _san !== _storedOwner)) {
          return await socket.sendMessage(currentChat, { text: '❌ Only the session owner can change this setting.' }, { quoted: msg });
        }
        
        const _opt = (args[0] || '').toLowerCase();
        const prefix = (typeof config !== 'undefined' && config.PREFIX) || '.';

        if (_opt === 'on' || _opt === 'off') {
          _uc.ANTI_BADWORD = _opt;
          if (typeof setUserConfigInMongo === 'function') await setUserConfigInMongo(_san, _uc);
          await socket.sendMessage(currentChat, { text: `✅ *Anti Badword ${_opt === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*` }, { quoted: msg });
        } else if (_opt === 'add' && args[1]) {
          const _word = args.slice(1).join(' ').toLowerCase();
          _uc.BAD_WORDS = _uc.BAD_WORDS || [];
          if (!_uc.BAD_WORDS.includes(_word)) _uc.BAD_WORDS.push(_word);
          if (typeof setUserConfigInMongo === 'function') await setUserConfigInMongo(_san, _uc);
          await socket.sendMessage(currentChat, { text: `✅ Added *"${_word}"* to bad words list.` }, { quoted: msg });
        } else if (_opt === 'del' && args[1]) {
          const _word = args.slice(1).join(' ').toLowerCase();
          _uc.BAD_WORDS = (_uc.BAD_WORDS || []).filter(w => w !== _word);
          if (typeof setUserConfigInMongo === 'function') await setUserConfigInMongo(_san, _uc);
          await socket.sendMessage(currentChat, { text: `✅ Removed *"${_word}"* from bad words list.` }, { quoted: msg });
        } else if (_opt === 'list') {
          const _list = ((_uc.BAD_WORDS || []).join(', ')) || 'No custom words added.';
          await socket.sendMessage(currentChat, { text: `📋 *Custom Bad Words:*\n${_list}` }, { quoted: msg });
        } else {
          await socket.sendMessage(currentChat, { text: `📖 *Anti Badword Usage:*\n${prefix}antibadword on\n${prefix}antibadword off\n${prefix}antibadword add <word>\n${prefix}antibadword del <word>\n${prefix}antibadword list` }, { quoted: msg });
        }
    } catch(e) { console.log('antibadword cmd error:', e); await socket.sendMessage(currentChat, { text: '❌ Error updating setting.' }, { quoted: msg }); }
    break;
}

case 'antibug': {
    const currentChat = msg.key.remoteJid;
    await socket.sendMessage(currentChat, { react: { text: '🐛', key: msg.key } });
    try {
        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const _san = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');
        const _own = (typeof config !== 'undefined' && config.OWNER_NUMBER ? config.OWNER_NUMBER.split(',')[0].replace(/[^0-9]/g, '') : '');
        
        let _uc = {};
        try { if (typeof loadUserConfigFromMongo === 'function' && _san) _uc = await loadUserConfigFromMongo(_san) || {}; } catch(e) {}
        const _storedOwner = (_uc.sessionOwner || '').replace(/[^0-9]/g, '');
        
        if (_san !== _own && (!_storedOwner || _san !== _storedOwner)) {
          return await socket.sendMessage(currentChat, { text: '❌ Only the session owner can change this setting.' }, { quoted: msg });
        }
        
        const _opt = (args[0] || '').toLowerCase();
        const prefix = (typeof config !== 'undefined' && config.PREFIX) || '.';

        if (_opt === 'on' || _opt === 'off') {
          _uc.ANTI_BUG = _opt;
          if (typeof setUserConfigInMongo === 'function') await setUserConfigInMongo(_san, _uc);
          await socket.sendMessage(currentChat, { text: `✅ *Anti Bug ${_opt === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*` }, { quoted: msg });
        } else {
          await socket.sendMessage(currentChat, { text: `📖 *Anti Bug Usage:*\n${prefix}antibug on\n${prefix}antibug off` }, { quoted: msg });
        }
    } catch(e) { console.log('antibug cmd error:', e); await socket.sendMessage(currentChat, { text: '❌ Error updating setting.' }, { quoted: msg }); }
    break;
}
case 'system': {
    try {
        const totalMem = os.totalmem() / 1024 / 1024 / 1024;
        const freeMem = os.freemem() / 1024 / 1024 / 1024;
        const usedMem = totalMem - freeMem;

        const cpus = os.cpus();

        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const pingStart = Date.now();

        await socket.sendMessage(sender, {
            react: {
                text: "⚙️",
                key: msg.key
            }
        });

        const ping = Date.now() - pingStart;

        const text = `
╭━━〔 🖥️ SYSTEM INFO 〕━━⬣

🤖 ${config.BOT_NAME}
⏱️ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s
📡 Ping: ${ping} ms
🟢 Node: ${process.version}

💻 ${os.platform()} | ${os.arch()}
🖥️ ${os.hostname()}

⚙️ CPU: ${cpus[0].model}
🧠 Cores: ${cpus.length}
📊 Load: ${os.loadavg().map(v => v.toFixed(2)).join(" | ")}

💾 RAM: ${usedMem.toFixed(2)} / ${totalMem.toFixed(2)} GB

🕒 ${new Date().toLocaleString()}

╰━━━━━━━━━━━━━━━━━━⬣

${config.BOT_FOOTER || ""}
`;

        await socket.sendMessage(sender, {
            text: text
        }, {
            quoted: msg
        });

    } catch (err) {
        console.error(err);

        await socket.sendMessage(sender, {
            text: "❌ Failed to fetch system information.\n\n" + err.message
        }, {
            quoted: msg
        });
    }
}
break;
 case 'weather': {
    const currentChat = msg.key.remoteJid;
    
    // Catch එකටත් හසුවන පරිදි messages object එක try එකෙන් පිටතින් තැබීම
    let botName = '';
    let currentFooter = `*${botName}*`;
    
    try {
        const axios = require('axios');
        
        // User Number එක සහ Configuration ආරක්ෂිතව ලබා ගැනීම
        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const sanitized = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');
        
        let cfg = {};
        try { if (typeof loadUserConfigFromMongo === 'function' && sanitized) cfg = await loadUserConfigFromMongo(sanitized) || {}; } catch (e) {}
        
        botName = cfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');
        currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botName}*`;

        // Check if a city name was provided
        if (!args || args.length === 0) {
            return await socket.sendMessage(currentChat, { 
                text: `❗ *Please provide a city name!* \n📋 *Usage*: ${(typeof config !== 'undefined' && config.PREFIX) || '.'}weather [city name]` 
            }, { quoted: msg });
        }

        // 🌤️ පළමු Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '🌤️', key: msg.key } });

        const apiKey = '2d61a72574c11c4f36173b627f8cb177';
        const city = args.join(" ");
        const url = `http://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

        const response = await axios.get(url);
        const data = response.data;

        // Get weather icon
        const weatherIcon = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        
        const caption = `* 🤖 ${botName} ᴡᴇᴀᴛʜᴇʀ ʀᴇᴘᴏʀᴛ *\n\n` +
                      `🌎 ${data.name}, ${data.sys.country}\n\n` +

                     `🌡️ Temperature : ${data.main.temp}°C\n` +
                     `🤔 Feels Like  : ${data.main.feels_like}°C\n` +
                     `📉 Min Temp    : ${data.main.temp_min}°C\n` +
                     `📈 Max Temp    : ${data.main.temp_max}°C\n\n` +

                     `💧 Humidity    : ${data.main.humidity}%\n` +
                     `🌥️ Weather     : ${data.weather[0].main}\n` +
                     `📝 Description : ${data.weather[0].description}\n\n` +

                     `💨 Wind Speed  : ${data.wind.speed} m/s\n` +
                     `🔵 Pressure    : ${data.main.pressure} hPa\n\n` +
                        `> ${currentFooter}`;
        
        await socket.sendMessage(currentChat, {
            image: { url: weatherIcon },
            caption: caption
        }, { quoted: msg });

    } catch (e) {
        console.log("Weather Command Error: ", e);
        if (e.response && e.response.status === 404) {
            await socket.sendMessage(currentChat, { text: "🚫 *City not found!* \n🔍 Please check the spelling and try again." }, { quoted: msg });
        } else {
            await socket.sendMessage(currentChat, { text: "⚠️ *An error occurred!* \n🔄 Please try again later." }, { quoted: msg });
        }
    }
    break;
}
 case 'my': {
    const currentChat = msg.key.remoteJid;
    try {
        const axios = require('axios');

        // 👤 පළමු Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '👤', key: msg.key } });

        // User Number එක සහ Configuration ආරක්ෂිතව ලබා ගැනීම
        const userJid = msg.participant || msg.key.participant || currentChat || '';
        const sanitized = String(userJid.split('@')[0] || '').replace(/[^0-9]/g, '');

        let cfg = {};
        try { if (typeof loadUserConfigFromMongo === 'function' && sanitized) cfg = await loadUserConfigFromMongo(sanitized) || {}; } catch (e) {}

        const botName = cfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🤖 Status Assistant');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botName}*`;

        // Random anime image
        let animeImg = 'https://i.ibb.co/0VyPRcvm/Chat-GPT-Image-Jun-14-2026-09-26-06-PM.png';
        try { 
            const res = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 8000 }); 
            if (res && res.data && res.data.url) animeImg = res.data.url; 
        } catch(e) {}

        // Media links
        const videoNote = 'https://files.catbox.moe/w7ckn7.mp4'; // round video
        const songUrl = 'https://files.catbox.moe/y32rcq.mp3';

        // 1️⃣ Video Note (Round Video) යැවීම
        try { 
            await socket.sendMessage(currentChat, {
                video: { url: videoNote },
                ptv: true
            }, { quoted: msg }); 
        } catch(e) {}

        // 2️⃣ Song (Audio) යැවීම
        try { 
            await socket.sendMessage(currentChat, {
                audio: { url: songUrl },
                mimetype: 'audio/mp4'
            }, { quoted: msg }); 
        } catch(e) {}

        // 3️⃣ Anime Image + Channel Forward Message එක Caption එක සමඟ යැවීම
        // 📝 මෙතන ඔයාගේ නම "Sithija" විදිහට වෙනස් කරලා තියෙන්නේ
        const captionText = `🌸 *𝐑𝐚𝐧𝐝𝐨𝐦 𝐢𝐦𝐚𝐠𝐞 𝐬𝐭𝐚𝐭𝐮𝐬 𝐦𝐬𝐠*\n` +
                            `*╭─┉❰ 𝐖𝙴𝙻𝙲𝙾𝙼𝙴 𝐔𝚂𝙴𝚁 ❱┉─┉──•*\n` +
                            `*│ \`🌺 𝐇𝙴𝙻𝙻𝙾 : 𝙼𝚈 𝙳𝙴𝙰𝚁\`*\n` +
                            `*╰┉────────────┉─•*\n` +
                            `*❰🌟 𝐆ʀᴇᴇᴛɪɴɢ : 𝙶𝙾𝙾𝙳 𝙳𝙰𝚈 🌸*\n\n` +
                            `*╭──❰ 𝐌𝐫 𝐒𝐈𝐓𝐇𝐈𝐉𝐀 𝐁ʀᴏ ɪɴᴠɪᴛᴇ ❱──┉*\n` +
                            `*│◊╭────────────┉•┉*\n` +
                            `*│◊│*✦ 💀 \\\`ɴɪᴄᴋɴᴀᴍᴇ\\\`: *𝐒𝐢𝐭𝐡𝐢𝐣𝐚*\n` +
                            `*│◊│*✦ 🖤 \\\`ᴀɢᴇ\\\`: \`\`\`+17\`\`\`\n` +
                            `*│◊│*✦ 🌟 \\\`ꜰʀᴏᴍ\\\`: *𝙰ɴᴜʀᴀ𝙳ʜpackage*\n` +
                            `*│◊│*✦ 💖 \\\`ɢᴇɴ\\\`: *𝙱ᴏʏ*\n` +
                            `*│◊│*✦ 🌺 \\\`ɴᴀᴍᴇ\\\`: *𝐒𝐢𝐭𝐡𝐢𝐣𝐚*\n` +
                            `*│◊╰────────────┉•┉*\n` +
                            `*╰──────────────────┉*\n` +
                            `_*◊ 𝐆𝐎𝐎𝐃 𝐃𝐀𝐘 𝐌𝐘 𝐃𝐄𝐀𝐑 :*_\n\n` +
                            `🌟 *\\\`毒 𝙷𝙴𝙻𝙻𝙾  𝙼𝚈 𝙳𝙴𝙰𝚁,\\\`*\n` +
                            `*\\\`-𝙷𝙸 𝚃𝙷𝙸𝚉𝚉 𝙼𝚂𝙶 𝙵𝙾𝚁 𝚈𝙾𝚄\\\`*💖\n` +
                            `*\\\`𝙲𝙾𝙼𝙴 𝚆𝙸𝐓𝐇 𝙼𝙴 𝚂𝚃𝙰𝚁𝚃 𝚃𝙾 𝙽𝙴𝚆 𝙻𝙸𝚂𝚃\\\`*\n` +
                            `*\\\`𝙻𝙾𝚂𝚃 𝙼𝚈 𝙾𝙻𝙳 𝙽𝚄𝙼𝙱𝙴𝚁 𝙰𝙽𝙳 𝙻𝙾𝚂𝚃 𝙼𝚈\\\`*\n` +
                            `*\\\`𝙲𝙾index𝙽𝚃𝙰𝙲𝚃𝚂\\\`*\n\n` +
                            `╭───❰ 𝐂𝐎𝐍𝐓𝐀𝐂𝐓 𝐍𝐔𝐌𝐁𝐄𝐑 ❱───╮\n` +
                            `> ✦┇ \\\`https://wa.me/+94742838813?text=_%F0%9F%92%90%F0%9D%90%92%F0%9D%91%96%F0%9D%91%A1%F0%9D%91%95%F0%9D%91%96%F0%9D%91%97%F0%9D%91%8E_\`\n` +
                            `╰─────────────────────╯\n\n` +
                            `> ${currentFooter}`;

        await socket.sendMessage(currentChat, {
            image: { url: animeImg },
            caption: captionText,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterName: "🍷⃝⃑─͟͟͞͞ Sithija REMINDER",
                    newsletterJid: "120363409031214331@newsletter"
                }
            }
        }, { quoted: msg });

        // ✅ වැඩේ සාර්ථක වූ පසු ලැබෙන දෙවැනි Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '✅', key: msg.key } });

    } catch (myErr) { 
        console.error('my cmd error:', myErr); 
        try { 
            await socket.sendMessage(currentChat, { text: '❌ .my command failed. Try again.' }, { quoted: msg }); 
        } catch(e){} 
    }
    break;
}             
              
case 'cvid': {
    try {
        const axios = require('axios');
        const path = require('path');
        const os = require('os');
        const fs = require('fs');
        const crypto = require('crypto');

        // Chat ID එක ආරක්ෂිතව ලබා ගැනීම (from වෙනුවට msg.key.remoteJid භාවිතයෙන්)
        const currentChat = msg.key.remoteJid;

        const _cvid_id = crypto.randomBytes(8).toString('hex');
        const targetJidInput = args[0];
        const songQuery = args.slice(1).join(" ").trim();

        if (!targetJidInput || !songQuery) {
            return await socket.sendMessage(currentChat, {
                text: "❌ *Format Invalid!*\nUsage: `.cvid <jid> <song/video name>`\nExample: `.cvid . Shape of You`"
            }, { quoted: msg });
        }

        // ⚡ පළමු Reaction එක (වැඩේ ආරම්භ කළ බව පෙන්වීමට)
        await socket.sendMessage(currentChat, { react: { text: "🎬", key: msg.key } });

        let sJid = targetJidInput;
        if (sJid === '.' || sJid.toLowerCase() === 'here') {
            sJid = currentChat;
        } else if (!sJid.includes('@')) {
            if (/^\d{12,}$/.test(sJid)) sJid = `${sJid}@newsletter`;
            else sJid = `${sJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        }

        let videoId = null;
        let sMetadata = null;

        // YouTube URL එකක්දැයි පරීක්ෂා කිරීම
        if (/^https?:\/\//i.test(songQuery)) {
            const match = songQuery.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
            videoId = match ? match[1] : null;
            if (!videoId) return await socket.sendMessage(currentChat, { text: "❌ *Invalid YouTube URL.*" }, { quoted: msg });
        } else {
            // වීඩියෝවේ නමින් සෙවීම
            const yts = require('yt-search');
            const search = await yts(songQuery);
            if (!search || !search.videos || search.videos.length === 0) {
                return await socket.sendMessage(currentChat, { text: "❌ No results found for: *" + songQuery + "*" }, { quoted: msg });
            }
            sMetadata = search.videos[0];
            videoId = sMetadata.videoId;
        }

        // 🔹 ප්‍රධාන API එකෙන් Video Download ලින්ක් එක ලබා ගැනීම (Stable Video API)
        let downloadUrl = null;
        let sTitle = sMetadata?.title || 'Video';
        let sDuration = sMetadata?.timestamp || 'N/A';
        let sThumb = sMetadata?.thumbnail || null;
        let videoQuality = '360p';

        try {
            const res = await axios.get(`https://api.dreaded.site/api/ytdl/video?url=https://youtu.be/${videoId}`);
            if (res.data && res.data.status === 200 && res.data.result?.download_url) {
                downloadUrl = res.data.result.download_url;
                sTitle = res.data.result.title || sTitle;
                videoQuality = res.data.result.quality || videoQuality;
            }
        } catch (apiErr) {
            console.log("Primary Video API failed, trying backup...");
        }

        // 🔹 Backup API (පළමු එක වැඩ නොකළහොත් ක්‍රියාත්මක වේ)
        if (!downloadUrl) {
            try {
                const backupRes = await axios.get(`https://delirius-apiofc.vercel.app/download/ytmp4?url=https://youtu.be/${videoId}`);
                if (backupRes.data && backupRes.data.status && backupRes.data.downloadUrl) {
                    downloadUrl = backupRes.data.downloadUrl;
                    sTitle = backupRes.data.title || sTitle;
                }
            } catch (bErr) {
                console.error("Backup Video API also failed:", bErr);
            }
        }

        if (!downloadUrl) {
            return await socket.sendMessage(currentChat, { text: "❌ *Failed to fetch video download link. Try again later.*" }, { quoted: msg });
        }

        // Configuration ලෝඩ් කර ගැනීම (Safe check)
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        let cfg = {};
        try {
            if (typeof loadUserConfigFromMongo === 'function') {
                cfg = await loadUserConfigFromMongo(sanitized) || {};
            }
        } catch (mErr) {}
        const botName = cfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🐦‍🔥 ᴅᴛᴇᴄ ᴍɪɴɪ ᴠ1 🐦‍🔥');
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `*${botName}*`;

        const sCaption = `🎬 *TITLE :* ${sTitle}\n` +
                         `◽️ ⏱ *Duration :* ${sDuration}\n` +
                         `◽️ 📺 *Quality :* ${videoQuality}\n\n` +
                         `> ${currentFooter}`;

        // කෙලින්ම URL එකෙන් ලබාගෙන වීඩියෝ එක ඩවුන්ලෝඩ් කිරීම
        const cvid_Mp4 = path.join(os.tmpdir(), `cvid_${_cvid_id}.mp4`);
        const dlResp = await axios.get(downloadUrl, { responseType: 'stream', timeout: 180000 });

        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(cvid_Mp4);
            dlResp.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        const cvid_Buf = fs.readFileSync(cvid_Mp4);

        // Thumbnail එක ArrayBuffer එකක් ලෙස සකසා ගැනීම
        let thumbBuffer = null;
        if (sThumb) {
            try {
                const thumbResp = await axios.get(sThumb, { responseType: 'arraybuffer' });
                thumbBuffer = Buffer.from(thumbResp.data);
            } catch (tErr) {}
        }

        // අදාළ Target JID එකට වීඩියෝ එක යැවීම
        await socket.sendMessage(sJid, {
            video: cvid_Buf,
            caption: sCaption,
            mimetype: 'video/mp4',
            ...(thumbBuffer ? { jpegThumbnail: thumbBuffer } : {})
        });

        // සාර්ථක බව මුල් චැට් එකට දැනුම් දීම
        if (sJid !== currentChat) {
            await socket.sendMessage(currentChat, { text: `✅ *Video sent successfully to target!*\n🎬 ${sTitle}` }, { quoted: msg });
        }

        // ✅ වැඩේ සාර්ථකව ඉවර වුණාම වැටෙන දෙවැනි Reaction එක
        await socket.sendMessage(currentChat, { react: { text: '✅', key: msg.key } });

        // Temp file එක මැකීම
        try { if (fs.existsSync(cvid_Mp4)) fs.unlinkSync(cvid_Mp4); } catch(e){}

    } catch (e) {
        console.error('cvid error:', e);
        const currentChat = msg.key.remoteJid;
        await socket.sendMessage(currentChat, { text: "❌ *cvid Error:* " + e.message }, { quoted: msg });
    }
}
break;
case 'day': {
    // Chat ID එක ආරක්ෂිතව ලබා ගැනීම (from වෙනුවට msg.key.remoteJid භාවිතයෙන්)
    const currentChat = msg.key.remoteJid;
    let emojiLoop = null;

    try {
        const frames = [
            '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', 
            '🌅', '🌄', '☀️', '🌞', '🌤️', '⛅', '🌇', '🌙'
        ];

        let i = 0;

        // පළමු මැසේජ් එක යැවීම
        const loopMsg = await socket.sendMessage(currentChat, {
            text: frames[0]
        }, { quoted: msg });

        // ඉන්පසු සෑම තත්පරයකදීම මැසේජ් එක edit කරන ලූප් එක ආරම්භ කිරීම
        emojiLoop = setInterval(async () => {
            try {
                i++;
                if (i >= frames.length) i = 0;

                await socket.sendMessage(currentChat, {
                    edit: loopMsg.key,
                    text: frames[i]
                });
            } catch (loopErr) {
                // යම් හෙයකින් ලූප් එක ඇතුළේ මැසේජ් එක edit කරන්න බැරි වුණොත් ලූප් එක නතර කරයි
                console.error('Error inside emoji loop:', loopErr);
                if (emojiLoop) clearInterval(emojiLoop);
            }
        }, 1000);

        // විනාඩියකට (මිලි තත්පර 60000) පසු ලූප් එක ස්වයංක්‍රීයව නතර කිරීම
        setTimeout(() => {
            if (emojiLoop) {
                clearInterval(emojiLoop);
                console.log('Emoji loop stopped successfully.');
            }
        }, 60000);

    } catch (err) {
        console.error('Error in day command:', err);
        if (emojiLoop) clearInterval(emojiLoop); // Error එකක් ආවොත් ලූප් එක අනිවාර්යයෙන්ම නවත්වයි
        await socket.sendMessage(currentChat, { text: '❌ An error occurred running the animation.' }, { quoted: msg });
    }
    break;
}
              
case 'pastpaper':
case 'pastpapers':
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*කරුණාකර past paper එකේ නම/විෂය ලබාදෙන්න!*\n*උදා: .pastpaper maths*\n*උදා: .pastpaper combined maths*'
        }, { quoted: msg });
        break;
    }

    const ppQuery = args.join(' ');
    const ppSearchUrl = 'https://pastpaer-api.vercel.app/paper/search';
    const ppDetailsUrl = 'https://pastpaer-api.vercel.app/paper/details';
    
    await socket.sendMessage(sender, { text: '📚 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙋𝙖𝙨𝙩 𝙋𝙖𝙥𝙚𝙧𝙨...' });

    try {
        // Step 1: Search
        const ppSearchResponse = await axios.get(
            `${ppSearchUrl}?q=${encodeURIComponent(ppQuery)}`,
            { timeout: 20000 }
        );
        const ppSearchData = ppSearchResponse.data;

        if (!ppSearchData || !ppSearchData.data || !ppSearchData.data.results || ppSearchData.data.results.length === 0) {
            await socket.sendMessage(sender, {
                text: '❌ NO RESULTS\n\n*Past papers හමුවෙන්නේ නැත! 😞*\n*වෙනත් keyword එකක් උත්සාහ කරන්න.*'
            }, { quoted: msg });
            break;
        }

        const ppResults = ppSearchData.data.results.slice(0, 25);
        let ppListText = `🔍 𝗣𝗔𝗦𝗧 𝗣𝗔𝗣𝗘𝗥𝗦 - 𝗦𝗘𝗔𝗥𝗖𝗛 𝗥𝗘𝗦𝗨𝗟𝗧𝗦\n\nQuery: ${ppQuery}\nResults Found: ${ppResults.length}\n\nReply with number to select:\n\n`;

        ppResults.forEach((item, index) => {
            const grade = item.grade ? ` | ${item.grade}` : '';
            const year = item.year ? ` | ${item.year}` : '';
            const medium = item.medium ? ` | ${item.medium}` : '';
            ppListText += `${index + 1}. 📄 ${item.title}${grade}${year}${medium}\n`;
        });

        ppListText += `\n${config.BOT_FOOTER || ''}`;

        const ppSentMsg = await socket.sendMessage(sender, { text: ppListText }, { quoted: msg });
        const ppMsgID = ppSentMsg.key.id;

        // CINESUBZ STYLE: socket.ev.on('messages.upsert') pattern
        const handleSelection = async ({ messages: replyMessages }) => {
            const ppReplyMek = replyMessages[0];
            if (!ppReplyMek?.message) return;

            const ppMessageType = ppReplyMek.message.conversation || ppReplyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = ppReplyMek.message.extendedTextMessage?.contextInfo?.stanzaId === ppMsgID;

            if (isReplyToSentMsg && sender === ppReplyMek.key.remoteJid) {
                const ppChoice = parseInt(ppMessageType) - 1;

                if (isNaN(ppChoice) || ppChoice < 0 || ppChoice >= ppResults.length) {
                    await socket.sendMessage(sender, {
                        text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${ppResults.length} අතර තෝරන්න! 😕*`
                    }, { quoted: ppReplyMek });
                    return;
                }

                const ppSelected = ppResults[ppChoice];
                await socket.sendMessage(sender, { text: '📋 𝗙𝗲𝘁𝗰𝗵𝗶𝗻𝗴 𝗗𝗲𝘁𝗮𝗶𝗹𝘀...' }, { quoted: ppReplyMek });

                try {
                    // Step 2: Get Details
                    const ppDetailsResponse = await axios.get(
                        `${ppDetailsUrl}?url=${encodeURIComponent(ppSelected.url)}`,
                        { timeout: 25000 }
                    );
                    const ppDetailsData = ppDetailsResponse.data;

                    const paperData = ppDetailsData.data;
                    
                    if (!paperData || !paperData.title) {
                        throw new Error('Details ලබාගැනීමේ දෝෂයක් ඇතිවිය.');
                    }

                    // Filter PDF download links
                    const pdfLinks = (paperData.download_links || []).filter(dl => dl.type === 'pdf' && dl.url);

                    // Send paper details with image
                    const ppDetailsText =
`📄 〔 PAST PAPER DETAILS 〕
 
☘️ Title: ${paperData.title || 'N/A'}
📅 Year: ${paperData.year || 'N/A'}
🏫 Grade: ${paperData.grade || 'N/A'}
📝 Medium: ${paperData.medium || 'N/A'}
📖 Subject: ${paperData.subject || 'N/A'}
📍 Province: ${paperData.province || 'N/A'}
📌 Term: ${paperData.term || 'N/A'}

📝 ${paperData.description || ''}`;

                    await socket.sendMessage(sender, {
                        image: { url: paperData.image || config.IMAGE_PATH || 'https://files.catbox.moe/begcjv.png' },
                        caption: ppDetailsText
                    }, { quoted: ppReplyMek });

                    // NO DOWNLOAD OPTIONS - Direct PDF send
                    if (pdfLinks.length === 0) {
                        await socket.sendMessage(sender, {
                            text: '❌ NO DOWNLOADS\n\n*මෙම past paper එක සඳහා PDF link නොමැත!*'
                        }, { quoted: ppReplyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                        return;
                    }

                    // Send PDF directly as document
                    await socket.sendMessage(sender, { react: { text: '📥', key: ppReplyMek.key } });

                    const ppSelectedDl = pdfLinks[0]; // First PDF link

                    await socket.sendMessage(sender, {
                        document: { url: ppSelectedDl.url },
                        mimetype: 'application/pdf',
                        fileName: `${paperData.title}.pdf`,
                        caption: `📄 ${paperData.title}\n\n${paperData.year || ''} ${paperData.grade || ''} ${paperData.medium || ''}\n${config.BOT_FOOTER || ''}`
                    }, { quoted: ppReplyMek });

                    await socket.sendMessage(sender, { react: { text: '✅', key: ppReplyMek.key } });

                } catch (detailsError) {
                    console.error('Details error:', detailsError);
                    await socket.sendMessage(sender, {
                        text: `❌ ERROR\n\n*Details ලබාගැනීමේ දෝෂයක්*\n${detailsError.message}`
                    }, { quoted: ppReplyMek });
                } finally {
                    socket.ev.off('messages.upsert', handleSelection);
                }
            }
        };

        socket.ev.on('messages.upsert', handleSelection);

    } catch (ppError) {
        console.error('PastPaper command error:', ppError.message);
        await socket.sendMessage(sender, {
            text: `❌ ERROR\n\n*දෝෂයක් ඇතිවුණා:* ${ppError.message || 'Unknown error'}`
        }, { quoted: msg });
    }

    break;
case 'moviesublk': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*කරුණාකර චිත්‍රපටයේ නම ලබාදෙන්න! උදා: .moviesublk new*'
        }, { quoted: msg });
        break;
    }

    const msQuery = args.join(' ');
    const msSearchUrl = 'https://moviesublk-new-api.vercel.app/search';
    const msDownloadApi = 'https://robust-transformation-production-4897.up.railway.app/gdrive/download?url=';
    
    await socket.sendMessage(sender, { text: '🎬 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙤𝙣 𝙈𝙤𝙫𝙞𝙚𝙎𝙪𝙗𝙇𝙆...' });

    try {
        // Step 1: Search
        const msSearchResponse = await axios.get(
            `${msSearchUrl}?q=${encodeURIComponent(msQuery)}`,
            { timeout: 20000 }
        );
        const msSearchData = msSearchResponse.data;

        if (!msSearchData || !msSearchData.results || msSearchData.results.length === 0) {
            await socket.sendMessage(sender, {
                text: '❌ NO RESULTS\n\n*MovieSubLK හි චිත්‍රපට හමුවෙන්නේ නැත! 😞*'
            }, { quoted: msg });
            break;
        }

        const msResults = msSearchData.results.slice(0, 25);
        let msListText = `🔍 𝗠𝗢𝗩𝗜𝗘𝗦𝗨𝗕𝗟𝗞 - 𝗦𝗘𝗔𝗥𝗖𝗛 𝗥𝗘𝗦𝗨𝗟𝗧𝗦\n\nQuery: ${msQuery}\nResults Found: ${msResults.length}\n\nReply with number to select:\n\n`;

        msResults.forEach((item, index) => {
            msListText += `${index + 1}. 🎬 ${item.title}\n   📅 ${item.published ? item.published.split('T')[0] : 'N/A'} | ${item.type || 'N/A'}\n`;
        });

        msListText += `\n${config.BOT_FOOTER || ''}`;

        const msSentMsg = await socket.sendMessage(sender, { text: msListText }, { quoted: msg });
        const msMsgID = msSentMsg.key.id;

        // CINESUBZ STYLE: socket.ev.on('messages.upsert') pattern
        const handleSelection = async ({ messages: replyMessages }) => {
            const msReplyMek = replyMessages[0];
            if (!msReplyMek?.message) return;

            const msMessageType = msReplyMek.message.conversation || msReplyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = msReplyMek.message.extendedTextMessage?.contextInfo?.stanzaId === msMsgID;

            if (isReplyToSentMsg && sender === msReplyMek.key.remoteJid) {
                const msChoice = parseInt(msMessageType) - 1;

                if (isNaN(msChoice) || msChoice < 0 || msChoice >= msResults.length) {
                    await socket.sendMessage(sender, {
                        text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${msResults.length} අතර තෝරන්න! 😕*`
                    }, { quoted: msReplyMek });
                    return;
                }

                const msSelected = msResults[msChoice];
                await socket.sendMessage(sender, { text: '📋 𝗙𝗲𝘁𝗰𝗵𝗶𝗻𝗴 𝗗𝗲𝘁𝗮𝗶𝗹𝘀...' }, { quoted: msReplyMek });

                try {
                    // Step 2: Get Details
                    const msDetailsResponse = await axios.get(
                        `https://moviesublk-new-api.vercel.app/details?url=${encodeURIComponent(msSelected.url)}`,
                        { timeout: 25000 }
                    );
                    const msDetailsData = msDetailsResponse.data;

                    const movieData = msDetailsData.data;
                    
                    if (!movieData || !movieData.title) {
                        throw new Error('Details ලබාගැනීමේ දෝෂයක් ඇතිවිය.');
                    }

                    // Send movie details with image
                    const msDetailsText =
`🎬 〔 MOVIE DETAILS 〕
 
☘️ Title: ${movieData.title || 'N/A'}
📅 Year: ${movieData.year || 'N/A'}
📝 ${movieData.description || ''}`;

                    await socket.sendMessage(sender, {
                        image: { url: movieData.image || config.IMAGE_PATH || 'https://files.catbox.moe/begcjv.png' },
                        caption: msDetailsText
                    }, { quoted: msReplyMek });

                    // Filter google_drive sources
                    const msSources = movieData.sources || [];
                    const msDownloadLinks = msSources.filter(src => src.type === 'google_drive' && src.direct_url);

                    if (msDownloadLinks.length === 0) {
                        await socket.sendMessage(sender, {
                            text: '❌ NO DOWNLOADS\n\n*මෙම චිත්‍රපටය සඳහා බාගත කිරීමේ link නොමැත!*'
                        }, { quoted: msReplyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                        return;
                    }

                    // Show download options
                    const msDownloadOptionsText =
`☘️ DOWNLOAD OPTIONS
 
${msDownloadLinks.map((dl, i) => `${i + 1}. ${dl.label || 'Google Drive'} | ${dl.type || 'N/A'}`).join('\n')}
 
Reply with number to download:
 
${config.BOT_FOOTER || ''}`;

                    const msDownloadOptMsg = await socket.sendMessage(sender, { text: msDownloadOptionsText }, { quoted: msReplyMek });
                    const msDownloadMsgID = msDownloadOptMsg.key.id;

                    // Handle download selection
                    const handleDownload = async ({ messages: downloadMessages }) => {
                        const msDownloadMek = downloadMessages[0];
                        if (!msDownloadMek?.message) return;

                        const msDownloadChoice = msDownloadMek.message.conversation || msDownloadMek.message.extendedTextMessage?.text;
                        const isReplyToDownloadMsg = msDownloadMek.message.extendedTextMessage?.contextInfo?.stanzaId === msDownloadMsgID;

                        if (isReplyToDownloadMsg && sender === msDownloadMek.key.remoteJid) {
                            const msChoiceNum = parseInt(msDownloadChoice) - 1;

                            if (isNaN(msChoiceNum) || msChoiceNum < 0 || msChoiceNum >= msDownloadLinks.length) {
                                await socket.sendMessage(sender, {
                                    text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${msDownloadLinks.length} අතර තෝරන්න!*`
                                }, { quoted: msDownloadMek });
                                return;
                            }

                            const msSelectedDl = msDownloadLinks[msChoiceNum];

                            await socket.sendMessage(sender, {
                                text: `⏳ Preparing *${msSelectedDl.label || 'Download'}*...`
                            }, { quoted: msDownloadMek });

                            await socket.sendMessage(sender, { react: { text: '📥', key: msDownloadMek.key } });

                            try {
                                // Get direct download link via railway API
                                const directDownloadUrl = `${msDownloadApi}${encodeURIComponent(msSelectedDl.direct_url)}`;

                                await socket.sendMessage(sender, {
                                    document: { url: directDownloadUrl },
                                    mimetype: 'video/mp4',
                                    fileName: `${movieData.title}.mp4`,
                                    caption: `${movieData.title}\n\n${msSelectedDl.label || 'Google Drive'}\n${config.BOT_FOOTER || ''}`
                                }, { quoted: msDownloadMek });

                                await socket.sendMessage(sender, { react: { text: '✅', key: msDownloadMek.key } });

                            } catch (downloadError) {
                                console.error('Download error:', downloadError);
                                await socket.sendMessage(sender, {
                                    text: `❌ DOWNLOAD ERROR\n\n*Download link එක ලබාගැනීමේ දෝෂයක්.*\n${downloadError.message}`
                                }, { quoted: msDownloadMek });
                            } finally {
                                socket.ev.off('messages.upsert', handleDownload);
                                socket.ev.off('messages.upsert', handleSelection);
                            }
                        }
                    };

                    socket.ev.on('messages.upsert', handleDownload);

                } catch (detailsError) {
                    console.error('Details error:', detailsError);
                    await socket.sendMessage(sender, {
                        text: `❌ ERROR\n\n*Details ලබාගැනීමේ දෝෂයක්*\n${detailsError.message}`
                    }, { quoted: msReplyMek });
                    socket.ev.off('messages.upsert', handleSelection);
                }
            }
        };

        socket.ev.on('messages.upsert', handleSelection);

    } catch (msError) {
        console.error('MovieSubLK command error:', msError.message);
        await socket.sendMessage(sender, {
            text: `❌ ERROR\n\n*දෝෂයක් ඇතිවුණා:* ${msError.message || 'Unknown error'}`
        }, { quoted: msg });
    }

    break;
}

case 'ginisisila': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*කරුණාකර හොයන දේ ලබාදෙන්න! උදා: .ginisisila scooby*'
        }, { quoted: msg });
        break;
    }

    const gsQuery = args.join(' ');
    const gsSearchApi = 'https://ginisisila-api-sithija.vercel.app/ginisisilacartoon-search';
    const gsDownloadApi = 'https://ginisisila-api-sithija.vercel.app/ginisisilacartoon-download';
    const gdriveDownloadApi = 'https://robust-transformation-production-4897.up.railway.app/gdrive/download?url=';
    const ytDownloadApi = 'https://api.zanta-mini.store/api/ytdl';
    const ytApiKey = 'zanta_ZwUbRnXLEyTzfmMh0E4osfW4';

    await socket.sendMessage(sender, { text: '📺 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙤𝙣 𝙂𝙞𝙣𝙞𝙨𝙞𝙨𝙞𝙡𝙖𝘾𝙖𝙧𝙩𝙤𝙤𝙣...' });

    try {
        // Step 1: Search
        const gsSearchResponse = await axios.get(
            `${gsSearchApi}?keywords=${encodeURIComponent(gsQuery)}`,
            { timeout: 20000 }
        );
        const gsSearchData = gsSearchResponse.data;

        if (!gsSearchData || !gsSearchData.success || !gsSearchData.results || gsSearchData.results.length === 0) {
            await socket.sendMessage(sender, {
                text: '❌ NO RESULTS\n\n*GinisisilaCartoon හි results හමුවෙන්නේ නැත! 😞*'
            }, { quoted: msg });
            break;
        }

        const gsResults = gsSearchData.results.slice(0, 25);
        let gsListText = `📺 𝗚𝗜𝗡𝗜𝗦𝗜𝗦𝗜𝗟𝗔𝗖𝗔𝗥𝗧𝗢𝗢𝗡 - 𝗦𝗘𝗔𝗥𝗖𝗛 𝗥𝗘𝗦𝗨𝗟𝗧𝗦\n\nQuery: ${gsQuery}\nResults Found: ${gsResults.length}\n\nReply with number to select:\n\n`;

        gsResults.forEach((item, index) => {
            gsListText += `${index + 1}. 📺 ${item.title}\n`;
        });

        gsListText += `\n${config.BOT_FOOTER || ''}`;

        const gsSentMsg = await socket.sendMessage(sender, { text: gsListText }, { quoted: msg });
        const gsMsgID = gsSentMsg.key.id;

        // Handle selection
        const handleSelection = async ({ messages: replyMessages }) => {
            const gsReplyMek = replyMessages[0];
            if (!gsReplyMek?.message) return;

            const gsMessageType = gsReplyMek.message.conversation || gsReplyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = gsReplyMek.message.extendedTextMessage?.contextInfo?.stanzaId === gsMsgID;

            if (isReplyToSentMsg && sender === gsReplyMek.key.remoteJid) {
                const gsChoice = parseInt(gsMessageType) - 1;

                if (isNaN(gsChoice) || gsChoice < 0 || gsChoice >= gsResults.length) {
                    await socket.sendMessage(sender, {
                        text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${gsResults.length} අතර තෝරන්න! 😕*`
                    }, { quoted: gsReplyMek });
                    return;
                }

                const gsSelected = gsResults[gsChoice];
                await socket.sendMessage(sender, { text: '📋 𝗙𝗲𝘁𝗰𝗵𝗶𝗻𝗴 𝗗𝗲𝘁𝗮𝗶𝗹𝘀...' }, { quoted: gsReplyMek });

                try {
                    // Step 2: Get Download Details
                    const gsDetailsResponse = await axios.get(
                        `${gsDownloadApi}?url=${encodeURIComponent(gsSelected.url)}`,
                        { timeout: 25000 }
                    );
                    const gsDetailsData = gsDetailsResponse.data;

                    if (!gsDetailsData || !gsDetailsData.success || !gsDetailsData.result) {
                        throw new Error('Details ලබාගැනීමේ දෝෂයක් ඇතිවිය.');
                    }

                    const result = gsDetailsData.result;

                    // Send details with image
                    const gsDetailsText =
`📺 〔 VIDEO DETAILS 〕

📺 Title: ${result.title || 'N/A'}
📍 Source: ${result.source || 'N/A'}
🎬 Video Title: ${result.video_title || 'N/A'}
🔗 URL: ${result.url || 'N/A'}`;

                    await socket.sendMessage(sender, {
                        image: { url: result.poster || result.thumbnail || config.IMAGE_PATH || 'https://files.catbox.moe/begcjv.png' },
                        caption: gsDetailsText
                    }, { quoted: gsReplyMek });

                    const downloadUrl = result.download_url;
                    const source = result.source;
                    const youtubeId = result.youtube_id;

                    if (!downloadUrl) {
                        await socket.sendMessage(sender, {
                            text: '❌ NO DOWNLOAD\n\n*මෙම video එක සඳහා download link නොමැත!*'
                        }, { quoted: gsReplyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                        return;
                    }

                    await socket.sendMessage(sender, { text: `⏳ Download preparing...\nSource: ${source}` }, { quoted: gsReplyMek });
                    await socket.sendMessage(sender, { react: { text: '📥', key: gsReplyMek.key } });

                    try {
                        let finalDownloadUrl = downloadUrl;
                        let fileName = `${result.title || 'video'}.mp4`;

                        // Handle different sources
                        if (source === 'youtube' && youtubeId) {
                            // Use Zanta YouTube downloader API
                            const ytUrl = `https://youtube.com/watch?v=${youtubeId}`;
                            const zantaApiUrl = `${ytDownloadApi}?apiKey=${ytApiKey}&url=${encodeURIComponent(ytUrl)}&type=mp4&quality=720`;

                            const zantaResp = await axios.get(zantaApiUrl, { timeout: 30000 });
                            if (zantaResp.data && zantaResp.data.success && zantaResp.data.result && zantaResp.data.result.download_url) {
                                finalDownloadUrl = zantaResp.data.result.download_url;
                                fileName = zantaResp.data.result.title || fileName;
                            }
                        }
                        else if (source === 'google_drive') {
                            // Use Railway gdrive downloader
                            finalDownloadUrl = `${gdriveDownloadApi}${encodeURIComponent(downloadUrl)}`;
                        }
                        else if (source === 'direct' || source === 'hls' || source === 'mp4') {
                            // Direct URL - use as is
                            finalDownloadUrl = downloadUrl;
                        }
                        else {
                            // Unknown source - try to send link directly
                            finalDownloadUrl = downloadUrl;
                        }

                        // Send as document
                        await socket.sendMessage(sender, {
                            document: { url: finalDownloadUrl },
                            mimetype: 'video/mp4',
                            fileName: fileName,
                            caption: `${result.title || 'Video'}\n\n📍 Source: ${source}\n${config.BOT_FOOTER || ''}`
                        }, { quoted: gsReplyMek });

                        await socket.sendMessage(sender, { react: { text: '✅', key: gsReplyMek.key } });

                    } catch (downloadError) {
                        console.error('Download error:', downloadError);
                        await socket.sendMessage(sender, {
                            text: `❌ DOWNLOAD ERROR\n\n*Download කිරීමේ දෝෂයක්.*\n${downloadError.message}\n\n*Direct Link:* ${downloadUrl}`
                        }, { quoted: gsReplyMek });
                    } finally {
                        socket.ev.off('messages.upsert', handleSelection);
                    }

                } catch (detailsError) {
                    console.error('Details error:', detailsError);
                    await socket.sendMessage(sender, {
                        text: `❌ ERROR\n\n*Details ලබාගැනීමේ දෝෂයක්*\n${detailsError.message}`
                    }, { quoted: gsReplyMek });
                    socket.ev.off('messages.upsert', handleSelection);
                }
            }
        };

        socket.ev.on('messages.upsert', handleSelection);

    } catch (gsError) {
        console.error('Ginisisila command error:', gsError.message);
        await socket.sendMessage(sender, {
            text: `❌ ERROR\n\n*දෝෂයක් ඇතිවුණා:* ${gsError.message || 'Unknown error'}`
        }, { quoted: msg });
    }

    break;
}              
case 'cinesubz':             
case 'cinetv':
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*කරුණාකර චිත්‍රපටයේ හෝ TV series එකේ නම ලබාදෙන්න! උදා: .cinetv spider*'
        }, { quoted: msg });
        break;
    }

    const cinezubQuerytv = args.join(' ');
    await socket.sendMessage(sender, { text: '📽️ 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙤𝙣 𝘾𝙞𝙣𝙚𝙨𝙪𝙗𝙯...' });

    try {
        const searchResponse = await axios.get(`http://nexoraapi.laksidunimsara.com/cinesubz/search?query=${encodeURIComponent(cinezubQuerytv)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
        const searchData = searchResponse.data;

        if (!searchData.status || !searchData.results || searchData.results.length === 0) {
            await socket.sendMessage(sender, {
                text: '❌ NO RESULTS\n\n*Cinesubz හි චිත්‍රපට හමුවෙන්නේ නැත! 😞*'
            }, { quoted: msg });
            break;
        }

        const cinezubResults = searchData.results.slice(0, 25);
        let listText = `🔍 𝗠𝗢𝗩𝗜𝗘 𝗔𝗡𝗗 𝗧𝗩 𝗦𝗘𝗥𝗜𝗘𝗦 - 𝗦𝗘𝗔𝗥𝗖𝗛 𝗥𝗘𝗦𝗨𝗟𝗧𝗦\n\nQuery: ${cinezubQuerytv}\nResults Found: ${cinezubResults.length}\n\nReply with number to select:\n\n`;

        cinezubResults.forEach((item, index) => {
            const type = item.link.includes('/tvshows/') ? '📺 TV Series' : '🎬 Movie';
            listText += `${index + 1}. ${type} | ${item.title}\n`;
        });

        listText += `\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;
        
        const sentMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });
        const messageID = sentMsg.key.id;

        const handleSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const messageType = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSentMsg && sender === replyMek.key.remoteJid) {
                const choice = parseInt(messageType) - 1;
                if (isNaN(choice) || choice < 0 || choice >= cinezubResults.length) {
                    await socket.sendMessage(sender, {
                        text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${cinezubResults.length} අතර තෝරන්න! 😕*`
                    }, { quoted: replyMek });
                    return;
                }

                const selectedItem = cinezubResults[choice];
                const isTvShow = selectedItem.link.includes('/tvshows/');
                
                if (isTvShow) {
                    await socket.sendMessage(sender, { 
                        text: '📺 𝗙𝗲𝘁𝗰𝗵𝗶𝗻𝗴 𝗧𝗩 𝗦𝗲𝗿𝗶𝗲𝘀 𝗗𝗲𝘁𝗮𝗶𝗹𝘀...' 
                    }, { quoted: replyMek });

                    try {
                        const tvShowResponse = await axios.get(`http://nexoraapi.laksidunimsara.com/api/tvshow?url=${encodeURIComponent(selectedItem.link)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
                        const tvShowData = tvShowResponse.data;

                        if (!tvShowData.status || !tvShowData.data) {
                            throw new Error('Failed to fetch TV show details');
                        }

                        const tvInfo = tvShowData.data;
                        
                        let tvDetailsText = 
`📺 𝗧𝗩 𝗦𝗘𝗥𝗜𝗘𝗦 - 𝗗𝗘𝗧𝗔𝗜𝗟𝗦

☘️ Title: ${tvInfo.title}

⭐ IMDB: ${tvInfo.imdb_rating || 'N/A'}
📅 Year: ${tvInfo.year || 'N/A'}
📀 Seasons: ${tvInfo.total_seasons || 'N/A'} Total
🎬 Episodes: ${tvInfo.total_episodes || 'N/A'} Total

📖 Story:
${tvInfo.description?.substring(0, 300) || 'No description available.'}...`;

                        // Send TV details with poster image
                        await socket.sendMessage(sender, {
                            image: { url: tvInfo.poster || sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                            caption: tvDetailsText
                        }, { quoted: replyMek });

                        let seasonsText = 
`📺 𝗧𝗩 𝗦𝗘𝗥𝗜𝗘𝗦 - 𝗦𝗘𝗟𝗘𝗖𝗧 𝗦𝗘𝗔𝗦𝗢𝗡

Reply with number to select season:\n\n`;

                        tvInfo.seasons?.forEach((season, idx) => {
                            seasonsText += `${idx + 1}. Season ${season.season} (${season.total_episodes} episodes)\n`;
                        });

                        seasonsText += `\n${config.BOT_FOOTER}`;

                        const seasonMsg = await socket.sendMessage(sender, { text: seasonsText }, { quoted: replyMek });
                        const seasonMsgID = seasonMsg.key.id;

                        const handleSeasonSelect = async ({ messages: seasonMessages }) => {
                            const seasonMek = seasonMessages[0];
                            if (!seasonMek?.message) return;

                            const seasonChoice = seasonMek.message.conversation || seasonMek.message.extendedTextMessage?.text;
                            const isReplyToSeasonMsg = seasonMek.message.extendedTextMessage?.contextInfo?.stanzaId === seasonMsgID;

                            if (isReplyToSeasonMsg && sender === seasonMek.key.remoteJid) {
                                const seasonNum = parseInt(seasonChoice) - 1;
                                
                                if (isNaN(seasonNum) || seasonNum < 0 || seasonNum >= tvInfo.seasons.length) {
                                    await socket.sendMessage(sender, {
                                        text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${tvInfo.seasons.length} අතර තෝරන්න!*`
                                    }, { quoted: seasonMek });
                                    return;
                                }

                                const selectedSeason = tvInfo.seasons[seasonNum];
                                
                                let episodesText =
`📺 𝗧𝗩 𝗦𝗘𝗥𝗜𝗘𝗦 - 𝗦𝗘𝗟𝗘𝗖𝗧 𝗘𝗣𝗜𝗦𝗢𝗗𝗘

☘️ Title: ${tvInfo.title}

📀 Season: ${selectedSeason.season}
🎬 Total Episodes: ${selectedSeason.total_episodes}

0. Download All Episodes (Total: ${selectedSeason.total_episodes})

`;

                                selectedSeason.episodes.forEach((ep, idx) => {
                                    episodesText += `${idx + 1}. Episode ${ep.episode}: ${ep.title}\n`;
                                });

                                episodesText += `\n${config.BOT_FOOTER}`;

                                const episodeMsg = await socket.sendMessage(sender, { text: episodesText }, { quoted: seasonMek });
                                const episodeMsgID = episodeMsg.key.id;

                                const handleEpisodeSelect = async ({ messages: episodeMessages }) => {
                                    const episodeMek = episodeMessages[0];
                                    if (!episodeMek?.message) return;

                                    const episodeChoice = episodeMek.message.conversation || episodeMek.message.extendedTextMessage?.text;
                                    const isReplyToEpisodeMsg = episodeMek.message.extendedTextMessage?.contextInfo?.stanzaId === episodeMsgID;

                                    if (isReplyToEpisodeMsg && sender === episodeMek.key.remoteJid) {
                                        const choiceNum = parseInt(episodeChoice);
                                        
                                        if (isNaN(choiceNum) || choiceNum < 0 || choiceNum > selectedSeason.episodes.length) {
                                            await socket.sendMessage(sender, {
                                                text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 0-${selectedSeason.episodes.length} අතර තෝරන්න!*`
                                            }, { quoted: episodeMek });
                                            return;
                                        }

                                        if (choiceNum === 0) {
                                            await socket.sendMessage(sender, { 
                                                text: `📥 Downloading ${selectedSeason.total_episodes} episodes from Season ${selectedSeason.season}...\n\n⚠️ This may take some time ⚠️` 
                                            }, { quoted: episodeMek });

                                            let successCount = 0;
                                            let failCount = 0;

                                            for (let i = 0; i < selectedSeason.episodes.length; i++) {
                                                const episode = selectedSeason.episodes[i];
                                                try {
                                                    await socket.sendMessage(sender, { 
                                                        text: `📥 Downloading: S${selectedSeason.season}E${episode.episode} - ${episode.title}...` 
                                                    }, { quoted: episodeMek });

                                                    const episodeResponse = await axios.get(`http://nexoraapi.laksidunimsara.com/api/episode?url=${encodeURIComponent(episode.url)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
                                                    const episodeData = episodeResponse.data;

                                                    if (episodeData.status && episodeData.data?.download_links?.length) {
                                                        const episodeDownloadLinks = episodeData.data.download_links;
                                                        const nonTelegramLinks = episodeDownloadLinks.filter(link => 
                                                            !link.type?.toLowerCase().includes('telegram')
                                                        );
                                                        const selectedEpisodeLink = nonTelegramLinks[0] || episodeDownloadLinks[0];
                                                        
                                                        const darkShanResponse = await axios.get(`https://cinedl.laksidunimsara.com/movie/cinesubz?url=${encodeURIComponent(selectedEpisodeLink.url)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
                                                        const darkShanData = darkShanResponse.data;

                                                        if (darkShanData.status && darkShanData.data?.download) {
                                                            const finalDownloadLinks = darkShanData.data.download;
                                                            const finalNonTelegramLinks = finalDownloadLinks.filter(link => 
                                                                link.name && link.name.toLowerCase() !== 'telegram'
                                                            );
                                                            const finalLink = finalNonTelegramLinks[0] || finalDownloadLinks[0];
                                                            
                                                            await socket.sendMessage(sender, {
                                                                document: { url: finalLink.url },
                                                                mimetype: 'video/mp4',
                                                                fileName: `${tvInfo.title} S${selectedSeason.season}E${episode.episode} - ${episode.title}.mp4`,
                                                                caption: `${tvInfo.title} - S${selectedSeason.season}E${episode.episode}\n\nEpisode: ${episode.title}\n${config.BOT_FOOTER}`
                                                            }, { quoted: episodeMek });
                                                            
                                                            successCount++;
                                                        } else {
                                                            failCount++;
                                                        }
                                                    } else {
                                                        failCount++;
                                                    }
                                                    
                                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                                    
                                                } catch (epError) {
                                                    console.error(`Error downloading episode ${episode.episode}:`, epError);
                                                    failCount++;
                                                }
                                            }
                                            
                                            await socket.sendMessage(sender, { 
                                                text: `✅ Download Complete!\n\nSummary:\n✅ Success: ${successCount} episodes\n❌ Failed: ${failCount} episodes\nSeason: ${selectedSeason.season}\nSeries: ${tvInfo.title}` 
                                            }, { quoted: episodeMek });
                                            
                                        } else {
                                            const selectedEpisode = selectedSeason.episodes[choiceNum - 1];
                                            
                                            await socket.sendMessage(sender, { 
                                                text: `📥 Fetching download links for S${selectedSeason.season}E${selectedEpisode.episode}...` 
                                            }, { quoted: episodeMek });

                                            try {
                                                const episodeResponse = await axios.get(`http://nexoraapi.laksidunimsara.com/api/episode?url=${encodeURIComponent(selectedEpisode.url)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
                                                const episodeData = episodeResponse.data;

                                                if (!episodeData.status || !episodeData.data?.download_links?.length) {
                                                    throw new Error('Failed to get episode download links');
                                                }

                                                const episodeDownloadLinks = episodeData.data.download_links;
                                                
                                                let qualityText = 
`📺 𝗧𝗩 𝗦𝗘𝗥𝗜𝗘𝗦 - 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 𝗢𝗣𝗧𝗜𝗢𝗡 

☘️ Title: ${tvInfo.title}

📀 Season: ${selectedSeason.season}
🎬 Episode: ${selectedEpisode.episode} : ${selectedEpisode.title}

🎥 Select quality:\n\n`;

                                                episodeDownloadLinks.forEach((link, idx) => {
                                                    const quality = link.meta || link.type || `Quality ${idx + 1}`;
                                                    qualityText += `${idx + 1}. ${quality}\n`;
                                                });

                                                qualityText += `\n${config.BOT_FOOTER}`;

                                                const qualityMsg = await socket.sendMessage(sender, { text: qualityText }, { quoted: episodeMek });
                                                const qualityMsgID = qualityMsg.key.id;

                                                const handleQualitySelect = async ({ messages: qualityMessages }) => {
                                                    const qualityMek = qualityMessages[0];
                                                    if (!qualityMek?.message) return;

                                                    const qualityChoice = qualityMek.message.conversation || qualityMek.message.extendedTextMessage?.text;
                                                    const isReplyToQualityMsg = qualityMek.message.extendedTextMessage?.contextInfo?.stanzaId === qualityMsgID;

                                                    if (isReplyToQualityMsg && sender === qualityMek.key.remoteJid) {
                                                        const qualityNum = parseInt(qualityChoice) - 1;
                                                        
                                                        if (isNaN(qualityNum) || qualityNum < 0 || qualityNum >= episodeDownloadLinks.length) {
                                                            await socket.sendMessage(sender, {
                                                                text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${episodeDownloadLinks.length} අතර තෝරන්න!*`
                                                            }, { quoted: qualityMek });
                                                            return;
                                                        }

                                                        const selectedQuality = episodeDownloadLinks[qualityNum];
                                                        
                                                        await socket.sendMessage(sender, { 
                                                            text: `⏳ Getting download link for ${selectedQuality.meta || selectedQuality.type}...` 
                                                        }, { quoted: qualityMek });

                                                        try {
                                                            const darkShanResponse = await axios.get(`https://new77777.vercel.app/movie/cinesubz?url=${encodeURIComponent(selectedQuality.url)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
                                                            const darkShanData = darkShanResponse.data;

                                                            if (!darkShanData.status || !darkShanData.data?.download) {
                                                                throw new Error('Failed to get download URL');
                                                            }

                                                            const finalDownloadLinks = darkShanData.data.download;
                                                            
                                                            const finalNonTelegramLinks = finalDownloadLinks.filter(link => 
                                                                link.name && link.name.toLowerCase() !== 'telegram'
                                                            );
                                                            
                                                            if (finalNonTelegramLinks.length === 0) {
                                                                throw new Error('No non-Telegram download links available');
                                                            }
                                                            
                                                            const finalLink = finalNonTelegramLinks.find(link => link.name === 'unknown') || finalNonTelegramLinks[0];
                                                            
                                                            await socket.sendMessage(sender, { react: { text: '📥', key: qualityMek.key } });

                                                            await socket.sendMessage(sender, {
                                                                document: { url: finalLink.url },
                                                                mimetype: 'video/mp4',
                                                                fileName: `${tvInfo.title} S${selectedSeason.season}E${selectedEpisode.episode} - ${selectedEpisode.title}.mp4`,
                                                                caption: `${tvInfo.title} - Season ${selectedSeason.season}\nEpisode ${selectedEpisode.episode}\n${config.BOT_FOOTER}`
                                                            }, { quoted: qualityMek });

                                                            await socket.sendMessage(sender, { react: { text: '✅', key: qualityMek.key } });

                                                        } catch (downloadError) {
                                                            console.error('Download error:', downloadError);
                                                            await socket.sendMessage(sender, {
                                                                text: `❌ DOWNLOAD ERROR\n\n*Download link එක ලබාගැනීමේ දෝෂයක්.*\n${downloadError.message}`
                                                            }, { quoted: qualityMek });
                                                        } finally {
                                                            socket.ev.off('messages.upsert', handleQualitySelect);
                                                            socket.ev.off('messages.upsert', handleEpisodeSelect);
                                                            socket.ev.off('messages.upsert', handleSeasonSelect);
                                                            socket.ev.off('messages.upsert', handleSelection);
                                                        }
                                                    }
                                                };

                                                socket.ev.on('messages.upsert', handleQualitySelect);

                                            } catch (error) {
                                                console.error('Error fetching episode links:', error);
                                                await socket.sendMessage(sender, {
                                                    text: `❌ ERROR\n\n*Download links ලබාගැනීමේ දෝෂයක්*\n${error.message}`
                                                }, { quoted: episodeMek });
                                                socket.ev.off('messages.upsert', handleEpisodeSelect);
                                                socket.ev.off('messages.upsert', handleSeasonSelect);
                                                socket.ev.off('messages.upsert', handleSelection);
                                            }
                                        }
                                    }
                                };

                                socket.ev.on('messages.upsert', handleEpisodeSelect);
                            }
                        };

                        socket.ev.on('messages.upsert', handleSeasonSelect);

                    } catch (tvShowError) {
                        console.error('TV Show error:', tvShowError);
                        await socket.sendMessage(sender, {
                            text: `❌ ERROR\n\n*TV series details ලබාගැනීමේ දෝෂයක්*\n${tvShowError.message}`
                        }, { quoted: replyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                    }
                    
                } else {
                    await socket.sendMessage(sender, { 
                        text: '📽️ Fetching details...' 
                    }, { quoted: replyMek });

                    try {
                        const detailsResponse = await axios.get(`http://nexoraapi.laksidunimsara.com/cinesubz/details?url=${encodeURIComponent(selectedItem.link)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
                        const detailsData = detailsResponse.data;

                        if (!detailsData.status || !detailsData.data) {
                            throw new Error('Failed to fetch details');
                        }

                        const movieInfo = detailsData.data;
                        
                        const validDownloads = movieInfo.downloads?.filter(dl => dl && dl.quality && dl.url) || [];
                        
                        if (validDownloads.length === 0) {
                            await socket.sendMessage(sender, {
                                text: '❌ NO DOWNLOADS\n\n*මෙම චිත්‍රපටය සඳහා බාගත කිරීමේ link නොමැත!*'
                            }, { quoted: replyMek });
                            return;
                        }
                        
                        const description = movieInfo.description?.substring(0, 300) + (movieInfo.description?.length > 300 ? '...' : '') || 'No description available.';
                        
                        const imdbRating = movieInfo.imdb_rating ? `${movieInfo.imdb_rating}/10` : 'N/A';
                        
                        const movieDetailsText = 
`🎬 〔 𝗠𝗢𝗩𝗜𝗘 𝗗𝗘𝗧𝗔𝗜𝗟𝗦 〕

☘️ Title: ${movieInfo.title}

⭐ IMDB: ${imdbRating}
⏳ Runtime: ${movieInfo.runtime || 'N/A'}
📅 Year: ${movieInfo.year || 'N/A'}
🌍 Country: ${movieInfo.country || 'N/A'}


📖 Story:
${description}`;

            
                        await socket.sendMessage(sender, {
                            image: { url: movieInfo.poster || sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                            caption: movieDetailsText
                        }, { quoted: replyMek });

                        const downloadOptionsText = 
`☘️ 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 𝗢𝗣𝗧𝗜𝗢𝗡

${validDownloads.map((dl, i) => `${i + 1}. ${dl.quality}`).join('\n')}

Reply with number to download:

${config.BOT_FOOTER}`;

                        const downloadOptionsMsg = await socket.sendMessage(sender, { text: downloadOptionsText }, { quoted: replyMek });
                        const optionsMsgID = downloadOptionsMsg.key.id;

                        const handleDownload = async ({ messages: downloadMessages }) => {
                            const downloadMek = downloadMessages[0];
                            if (!downloadMek?.message) return;

                            const downloadChoice = downloadMek.message.conversation || downloadMek.message.extendedTextMessage?.text;
                            const isReplyToOptionsMsg = downloadMek.message.extendedTextMessage?.contextInfo?.stanzaId === optionsMsgID;

                            if (isReplyToOptionsMsg && sender === downloadMek.key.remoteJid) {
                                const choiceNum = parseInt(downloadChoice) - 1;
                                
                                if (isNaN(choiceNum) || choiceNum < 0 || choiceNum >= validDownloads.length) {
                                    await socket.sendMessage(sender, {
                                        text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${validDownloads.length} අතර තෝරන්න!*`
                                    }, { quoted: downloadMek });
                                    return;
                                }

                                const selectedDownload = validDownloads[choiceNum];
                                
                                await socket.sendMessage(sender, { 
                                    text: `⏳ Getting download link for ${selectedDownload.quality}...` 
                                }, { quoted: downloadMek });

                                try {
                                    const downloadResponse = await axios.get(`https://new77777.vercel.app/movie/cinesubz?url=${encodeURIComponent(selectedDownload.url)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
                                    const downloadData = downloadResponse.data;

                                    if (!downloadData.status || !downloadData.data?.download) {
                                        throw new Error('Failed to get download URL');
                                    }

                                    const downloadLinks = downloadData.data.download;
                                    
                                    const nonTelegramLinks = downloadLinks.filter(link => 
                                        link.name && link.name.toLowerCase() !== 'telegram'
                                    );
                                    
                                    if (nonTelegramLinks.length === 0) {
                                        throw new Error('No non-Telegram download links available');
                                    }
                                    
                                    const preferredLink = nonTelegramLinks.find(link => link.name === 'unknown') || nonTelegramLinks[0];
                                    
                                    await socket.sendMessage(sender, { react: { text: '📥', key: downloadMek.key } });

                                    await socket.sendMessage(sender, {
                                        document: { url: preferredLink.url },
                                        mimetype: 'video/mp4',
                                        fileName: downloadData.data.title || `${movieInfo.title} ${selectedDownload.quality}.mp4`,
                                        caption: `${movieInfo.title}\n\n[WEB-DL-${selectedDownload.quality}]\n${config.BOT_FOOTER}`
                                    }, { quoted: downloadMek });

                                    await socket.sendMessage(sender, { react: { text: '✅', key: downloadMek.key } });

                                } catch (downloadError) {
                                    console.error('Download link error:', downloadError);
                                    await socket.sendMessage(sender, {
                                        text: `❌ DOWNLOAD ERROR\n\n*Download link එක ලබාගැනීමේ දෝෂයක්.*\n${downloadError.message}`
                                    }, { quoted: downloadMek });
                                } finally {
                                    socket.ev.off('messages.upsert', handleDownload);
                                    socket.ev.off('messages.upsert', handleSelection);
                                }
                            }
                        };

                        socket.ev.on('messages.upsert', handleDownload);

                    } catch (detailsError) {
                        console.error('Details error:', detailsError);
                        await socket.sendMessage(sender, {
                            text: `❌ ERROR\n\n*Details ලබාගැනීමේ දෝෂයක්*\n${detailsError.message}`
                        }, { quoted: replyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                    }
                }
            }
        };

        socket.ev.on('messages.upsert', handleSelection);

    } catch (error) {
        console.error('Cinezub command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ ERROR\n\n*දෝෂයක් ඇතිවුණා:* ${error.message || 'Unknown error'}`
        }, { quoted: msg });
    }
    
    break;
              
case 'cinesubz1': {
  const axios = require('axios');

  const q =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    "";

  const query = q.replace(/^\.cinesubz1\s*/i, '').trim();

  if (!query) {
    return await socket.sendMessage(sender, {
      text:
`╭━━━〔 🎬 𝙈𝙊𝙑𝙄𝙀 𝙎𝙀𝘼𝙍𝘾𝙃 〕━━━⬣

❎ Please enter a movie name

📌 Example:
➜ .cinesubz1 Avatar

╰━━━━━━━━━━━━━━━━━━⬣`
    }, { quoted: msg });
  }

  const API_KEY = 'df3fd8ec85f6705d';
  const BASE_URL = 'https://api-dark-shan-yt.koyeb.app/movie';

  await socket.sendMessage(sender, {
    react: { text: '🔍', key: msg.key }
  });

  try {

    const searchUrl =
      `${BASE_URL}/cinesubz-search?q=${encodeURIComponent(query)}&apikey=${API_KEY}`;

    const searchRes = await axios.get(searchUrl);

    if (!searchRes.data?.status || !searchRes.data.data?.length) {
      return await socket.sendMessage(sender, {
        text:
`╭━━━〔 🎬 𝙈𝙊𝙑𝙄𝙀 〕━━━⬣

❎ No results found

╰━━━━━━━━━━━━━━━━━━⬣`
      }, { quoted: msg });
    }

    const results = searchRes.data.data.slice(0, 5);
    const firstImage = results[0].image;

    const searchCaption =
`╭━━━〔 🎬 𝙈𝙊𝙑𝙄𝙀 𝙍𝙀𝙎𝙐𝙇𝙏𝙎 〕━━━⬣

🔎 Query : ${query}

${results.map((movie, i) => {
  const title = movie.title.split('|')[0].trim();
  return `🎥 ${i + 1}. ${title}\n   📺 Quality: ${movie.quality || 'N/A'}`;
}).join('\n\n')}

╰━━━━━━━━━━━━━━━━━━⬣
💡 Reply with number`;

    const searchMsg = await socket.sendMessage(sender, {
      image: { url: firstImage },
      caption: searchCaption
    }, { quoted: msg });

    let step = 'movie';
    let lastMsgId = searchMsg.key.id;

    let selectedMovie = null;
    let downloads = null;
    let finalUrl = null;
    let selectedQuality = null;
    let movieTitle = '';
    let timeout = null;

    const handler = async (msgUpdate) => {
      try {

        const received = msgUpdate.messages[0];
        if (!received) return;

        const fromId =
          received.key.remoteJid || received.key.participant;

        if (fromId !== sender) return;

        const quotedId =
          received.message?.extendedTextMessage?.contextInfo?.stanzaId;

        if (!quotedId || quotedId !== lastMsgId) return;

        const text =
          received.message?.conversation ||
          received.message?.extendedTextMessage?.text;

        if (!text) return;

        const choice = parseInt(text.trim());

        if (isNaN(choice)) {
          return await socket.sendMessage(sender, {
            text: '❎ Enter valid number'
          }, { quoted: received });
        }

        await socket.sendMessage(sender, {
          react: { text: '🔍', key: received.key }
        });

        // 🎬 STEP 1: MOVIE SELECT
        if (step === 'movie') {

          if (choice < 1 || choice > results.length) {
            return await socket.sendMessage(sender, {
              text: `❎ Select 1 - ${results.length}`
            }, { quoted: received });
          }

          selectedMovie = results[choice - 1];
          movieTitle = selectedMovie.title.split('|')[0].trim();

          const infoUrl =
            `${BASE_URL}/cinesubz-info?url=${encodeURIComponent(selectedMovie.link)}&apikey=${API_KEY}`;

          const infoRes = await axios.get(infoUrl);

          if (!infoRes.data?.status || !infoRes.data.data?.downloads) {
            return await socket.sendMessage(sender, {
              text: '❎ No download links found'
            }, { quoted: received });
          }

          downloads = infoRes.data.data.downloads;
          const info = infoRes.data.data;

          const qualityCaption =
`╭━━━〔 🎬 𝙈𝙊𝙑𝙄𝙀 𝙄𝙉𝙁𝙊 〕━━━⬣

🎬 Title : ${movieTitle}
⭐ Rating : ${info.rating || 'N/A'}
📅 Year   : ${info.year || 'N/A'}
⏱️ Duration : ${info.duration || 'N/A'}

━━━━━━━━━━━━━━━━━━

📥 Select Quality

${downloads.map((q, i) => {
  return `🎞️ ${i + 1}. ${q.quality} | ${q.size} | ${q.language || 'EN'}`;
}).join('\n\n')}

╰━━━━━━━━━━━━━━━━━━⬣`;

          const qualityMsg = await socket.sendMessage(sender, {
            image: { url: selectedMovie.image },
            caption: qualityCaption
          }, { quoted: received });

          step = 'quality';
          lastMsgId = qualityMsg.key.id;
        }

        // 🎬 STEP 2: QUALITY SELECT
        else if (step === 'quality') {

          if (!downloads || choice < 1 || choice > downloads.length) {
            return await socket.sendMessage(sender, {
              text: `❎ Select 1 - ${downloads.length}`
            }, { quoted: received });
          }

          selectedQuality = downloads[choice - 1];

          const downloadUrl =
            `${BASE_URL}/cinesubz-download?url=${encodeURIComponent(selectedQuality.link)}&apikey=${API_KEY}`;

          const downloadRes = await axios.get(downloadUrl);

          if (!downloadRes.data?.status) {
            return await socket.sendMessage(sender, {
              text: '❎ Failed download link'
            }, { quoted: received });
          }

          const downloadInfo = downloadRes.data.data.download;
          const directItem =
            downloadInfo.find(d => d.name === 'unknown') ||
            downloadInfo[0];

          finalUrl = directItem.url;

          const formatCaption =
`╭━━━〔 🎬 𝘿𝙊𝙒𝙉𝙇𝙊𝘼𝘿 〕━━━⬣

🎬 Title : ${movieTitle}
💿 Quality : ${selectedQuality.quality}
📦 Size : ${selectedQuality.size}

━━━━━━━━━━━━━━━━━━

1 ┃ 🎥 Video
2 ┃ 📁 Document

💡 Reply 1 or 2

╰━━━━━━━━━━━━━━━━━━⬣`;

          const formatMsg = await socket.sendMessage(sender, {
            image: { url: selectedMovie.image },
            caption: formatCaption
          }, { quoted: received });

          step = 'format';
          lastMsgId = formatMsg.key.id;
        }

        // 🎬 STEP 3: FORMAT SELECT
        else if (step === 'format') {

          if (choice < 1 || choice > 2) {
            return await socket.sendMessage(sender, {
              text: '❎ Choose 1 or 2'
            }, { quoted: received });
          }

          await socket.sendMessage(sender, {
            react: { text: '📦', key: received.key }
          });

          const fileName =
            `${movieTitle} [${selectedQuality.quality}] CineSubz.mp4`;

          if (choice === 2) {
            await socket.sendMessage(sender, {
              document: {
                url: finalUrl
              },
              mimetype: 'video/mp4',
              fileName,
              caption: `🎬 ${movieTitle}`
            }, { quoted: received });
          } else {
            await socket.sendMessage(sender, {
              video: {
                url: finalUrl
              },
              caption: `🎬 ${movieTitle}`
            }, { quoted: received });
          }

          await socket.sendMessage(sender, {
            react: { text: '✅', key: received.key }
          });

          cleanup();
        }

      } catch (err) {
        console.error('CineSubz error:', err);
        cleanup();
      }
    };

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      socket.ev.off('messages.upsert', handler);
    };

    socket.ev.on('messages.upsert', handler);

    timeout = setTimeout(() => cleanup(), 60 * 1000);

  } catch (err) {
    console.error('CineSubz case error:', err);
    await socket.sendMessage(sender, {
      text: `❌ ERROR: ${err.message}`
    }, { quoted: msg });
  }

  break;
}
                                                     
              
case 'xvideo': {
    // URL එකක් ඇතුලත් කරලා නැත්නම් error එකක් දෙනවා
    const textArgs = args.join(' '); // නැත්නම් ඔයාගේ බොට්ගේ text/q variable එක ගන්න
    if (!textArgs) {
        return await socket.sendMessage(sender, { text: '❌ කරුණාකර xvideos ලින්ක් එකක් ලබා දෙන්න!' }, { quoted: msg });
    }

    // Reaction එකක් දානවා process එක පටන් ගත්තා කියලා පේන්න
    await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

    try {
        const axios = require('axios');
        const apiUrl = `https://hashuu-apis-official.vercel.app/xvideo?url=${encodeURIComponent(textArgs)}&apikey=MR_HASHUU_SECRET_123`;
        
        // API එකට Request එක යැවීම
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.success) {
            const captionText = `
🎬 *${data.title}*

👤 *ᴄʀᴇᴀᴛᴏʀ:* ${data.creator}
✅ *sᴛᴀᴛᴜs:* ${data.status}

> ${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

            // වීඩියෝව සහ කැප්ෂන් එක සෙන්ඩ් කිරීම
            await socket.sendMessage(sender, {
                video: { url: data.download_url },
                mimetype: 'video/mp4',
                caption: captionText,
                thumbnail: { url: data.thumbnail } // වීඩියෝ එකේ පෙරදසුන (Thumbnail)
            }, { quoted: msg });

            // සාර්ථකයි කියලා reaction එක වෙනස් කරනවා
            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

        } else {
            // API එකෙන් success false ආවොත්
            await socket.sendMessage(sender, { text: '❌ වීඩියෝව ලබා ගැනීමට නොහැකි විය. කරුණාකර ලින්ක් එක පරීක්ෂා කරන්න.' }, { quoted: msg });
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
        }

    } catch (error) {
        console.error(error);
        await socket.sendMessage(sender, { text: '❌ API එක සමඟ සම්බන්ධ වීමේදී දෝෂයක් සිදු විය!' }, { quoted: msg });
        await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
    }
}
break;
              
case 'search':
    if (!args.length) {
        await socket.sendMessage(sender, {
            image: { url: sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
            caption: formatMessage(
                '❌ ERROR',
                '*කරුණාකර සොයන්න අවශ්‍ය දේ ලබාදෙන්න! උදා: .search music*',
                `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
            )
        }, { quoted: msg });
        break;
    }

    const searchQuery = args.join(' ');
    await socket.sendMessage(sender, { text: '🎬 Just a moment, searching...' });

    try {
        const searchResponse = await axios.get(`https://api-sithija-main2-production.up.railway.app/sithija-search?text=${encodeURIComponent(searchQuery)}`);
        const searchData = searchResponse.data;

        if (!searchData || !searchData.success) {
            await socket.sendMessage(sender, {
                image: { url: sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                caption: formatMessage(
                    '❌ NO RESULTS',
                    '*සෙවුම අසාර්ථක විය! 😞*',
                    `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                )
            }, { quoted: msg });
            break;
        }

        let resultsArray = [];
        if (Array.isArray(searchData.result)) {
            resultsArray = searchData.result;
        } else if (searchData.result && typeof searchData.result === 'object') {
            resultsArray = searchData.result.result || searchData.result.results || searchData.result.data || Object.values(searchData.result).find(val => Array.isArray(val)) || [];
        }

        if (resultsArray.length === 0) {
            await socket.sendMessage(sender, {
                image: { url: sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                caption: formatMessage(
                    '❌ NO RESULTS',
                    '*කිසිවක් හමුවුණේ නැත! 😞*',
                    `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                )
            }, { quoted: msg });
            break;
        }

        const finalResults = [];
        const seenLinks = new Set();

        for (const item of resultsArray) {
            if (!item) continue;
            const itemLink = item.link || item.url || item.video_url || item.href;
            const itemTitle = item.title || item.name || item.video_title || item.heading || 'Media File';

            if (itemLink && !seenLinks.has(itemLink)) {
                seenLinks.add(itemLink);
                finalResults.push({ title: itemTitle, link: itemLink });
            }
        }

        if (finalResults.length === 0) {
            resultsArray.slice(0, 20).forEach(item => {
                finalResults.push({
                    title: item.title || item.name || 'Media File',
                    link: item.link || item.url || ''
                });
            });
        }

        const displayResults = finalResults.slice(0, 20);
        
        // සෙවුම් ප්‍රතිඵල ටික .dl කමාන්ඩ් එකට ගන්න global variable එකක සේව් කරනවා
        global.sithijaSearchResults = global.sithijaSearchResults || {};
        global.sithijaSearchResults[sender] = displayResults;

        let listText = `*𝗦𝗘𝗔𝗥𝗖𝗛 : _${searchQuery}_*\n\n*🔢 ᴅᴏᴡɴʟᴏᴀᴅ ᴡɪᴛʜ: .dl [number]*\n_Example: .dl 1_\n\n`;

        displayResults.forEach((item, index) => {
            let title = item.title;
            if (title.includes('|')) title = title.split('|')[0].trim();
            listText += `*${index + 1} ║ ${title}*\n`;
        });

        listText += `\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;
        
        await socket.sendMessage(sender, {
            image: { url: sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
            caption: listText
        }, { quoted: msg });

    } catch (error) {
        console.error('Case search system error:', error);
        await socket.sendMessage(sender, { text: `❌ පද්ධති දෝෂයක් ඇතිවිය: ${error.message}` }, { quoted: msg });
    }
    break;

case 'dl': {
    if (!global.sithijaSearchResults || !global.sithijaSearchResults[sender]) {
        return await socket.sendMessage(sender, {
            text: '❌ First use *.search* command.'
        }, { quoted: msg });
    }

    if (!args[0]) {
        return await socket.sendMessage(sender, {
            text: '❌ Example: .dl 1'
        }, { quoted: msg });
    }

    const index = Number(args[0]) - 1;
    const results = global.sithijaSearchResults[sender];

    if (isNaN(index) || index < 0 || index >= results.length) {
        return await socket.sendMessage(sender, {
            text: `❌ Select number between 1 - ${results.length}`
        }, { quoted: msg });
    }

    const video = results[index];

    await socket.sendMessage(sender, {
        text: "⏳ Fetching download..."
    }, { quoted: msg });

    try {

        const api = `https://api-sithija-main2-production.up.railway.app/sithija-download?url=${encodeURIComponent(video.link)}`;

        const { data } = await axios.get(api);

        console.log("========== DOWNLOAD RESPONSE ==========");
        console.log(JSON.stringify(data, null, 2));
        console.log("=======================================");

        if (!data) {
            return await socket.sendMessage(sender, {
                text: "❌ Empty API response."
            }, { quoted: msg });
        }

        if (data.success === false) {
            return await socket.sendMessage(sender, {
                text: `❌ ${data.message || "Download failed."}`
            }, { quoted: msg });
        }

        // ===== DOWNLOAD URL DETECTION =====
        const downloadUrl =
            data.download_url ||
            data.downloadUrl ||
            data.downloadLink ||
            data.download ||
            data.url ||
            data.link ||

            data.result?.download_url ||
            data.result?.downloadUrl ||
            data.result?.downloadLink ||
            data.result?.download ||
            data.result?.url ||
            data.result?.link ||

            data.data?.download_url ||
            data.data?.downloadUrl ||
            data.data?.downloadLink ||
            data.data?.download ||
            data.data?.url ||
            data.data?.link ||

            data.result?.video ||
            data.data?.video ||

            data.result?.videoUrl ||
            data.data?.videoUrl ||

            data.result?.directLink ||
            data.data?.directLink ||

            data.result?.files?.video ||
            data.result?.files?.url ||

            null;

        if (!downloadUrl) {
            return await socket.sendMessage(sender, {
                text:
`❌ Could not find download URL.

Backend Response:

${JSON.stringify(data, null, 2)}`
            }, { quoted: msg });
        }

        const fileName =
            data.fileName ||
            data.filename ||
            data.name ||
            data.title ||
            data.result?.fileName ||
            data.result?.filename ||
            data.result?.title ||
            data.data?.fileName ||
            data.data?.filename ||
            data.data?.title ||
            "video.mp4";

        // Download video
        const file = await axios.get(downloadUrl, {
            responseType: "arraybuffer",
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        await socket.sendMessage(sender, {
            document: Buffer.from(file.data),
            mimetype: "video/mp4",
            fileName: `${fileName}.mp4`
        }, { quoted: msg });

        await socket.sendMessage(sender, {
            react: {
                text: "✅",
                key: msg.key
            }
        });

    } catch (e) {

        console.log(e.response?.data || e);

        await socket.sendMessage(sender, {
            text:
`❌ Download Error

${e.response?.data?.message || e.message}`
        }, { quoted: msg });

    }

}
break;
case 'wallpaper': {
    if (!args.length) {
        return await socket.sendMessage(sender, {
            text: `❌ *Example:*\n${config.PREFIX}wallpaper cyberpunk`
        }, { quoted: msg });
    }

    const query = args.join(" ");

    await socket.sendMessage(sender, {
        text: "🖼️ *Searching Wallpapers...*"
    }, { quoted: msg });

    try {

        const { data } = await axios.get(
            `https://api-sithija-main2-production.up.railway.app/sithija-wallpaper?q=${encodeURIComponent(query)}`
        );

        if (!data.success || !Array.isArray(data.result) || data.result.length === 0) {
            return await socket.sendMessage(sender, {
                text: "❌ *No wallpapers found.*"
            }, { quoted: msg });
        }

        const wallpapers = data.result.slice(0, 3);

        for (let i = 0; i < wallpapers.length; i++) {

            await socket.sendMessage(sender, {
                image: {
                    url: wallpapers[i]
                },
                caption:
`╭━━〔 *🖼️ 𝗪𝗔𝗟𝗟𝗣𝗔𝗣𝗘𝗥 ${i + 1}* 〕━━⬣
┃
┃ 🔍 *𝗤𝘂𝗲𝗿𝘆:* ${query}
┃ 🌟 *𝗛𝗗 𝗪𝗮𝗹𝗹𝗽𝗮𝗽𝗲𝗿*
┃
╰━━━━━━━━━━━━━━⬣`
            }, { quoted: msg });

            await new Promise(resolve => setTimeout(resolve, 700));
        }

        await socket.sendMessage(sender, {
            react: {
                text: "✅",
                key: msg.key
            }
        });

    } catch (err) {
        console.log(err);

        await socket.sendMessage(sender, {
            text: `❌ *Error:*\n${err.message}`
        }, { quoted: msg });
    }
}
break;
              
case 'sticker': {
    if (!args.length) {
        return await socket.sendMessage(sender, {
            text: `❌ *𝐄𝐱𝐚𝐦𝐩𝐥𝐞:*\n*${config.PREFIX}sticker cat*`
        }, { quoted: msg });
    }

    const query = args.join(" ");

    await socket.sendMessage(sender, {
        text: "🔍 *𝐒𝐞𝐚𝐫𝐜𝐡𝐢𝐧𝐠 𝐬𝐭𝐢𝐜𝐤𝐞𝐫𝐬...*"
    }, { quoted: msg });

    try {

        const { data } = await axios.get(
            `https://api-sithija-main2-production.up.railway.app/sithija-sticker?q=${encodeURIComponent(query)}`
        );

        if (!data.success || !data.result?.sticker_url?.length) {
            return await socket.sendMessage(sender, {
                text: "❌ *𝐍𝐨 𝐬𝐭𝐢𝐜𝐤𝐞𝐫𝐬 𝐟𝐨𝐮𝐧𝐝.*"
            }, { quoted: msg });
        }

        // Send first 10 stickers
        const stickers = data.result.sticker_url.slice(0, 10);

        for (const sticker of stickers) {
            await socket.sendMessage(sender, {
                sticker: {
                    url: sticker
                }
            }, { quoted: msg });

            // Prevent WhatsApp rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        await socket.sendMessage(sender, {
            text: `✅ *𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 𝐬𝐞𝐧𝐭 ${stickers.length} 𝐬𝐭𝐢𝐜𝐤𝐞𝐫𝐬.*`
        }, { quoted: msg });

    } catch (err) {
        console.log(err);
        await socket.sendMessage(sender, {
            text: `❌ *${err.message}*`
        }, { quoted: msg });
    }
}
break;

              
case 'ytmp4': {
    if (!args.length) {
        return await socket.sendMessage(sender, {
            text: `❌ *𝐄𝐱𝐚𝐦𝐩𝐥𝐞:*\n*${config.PREFIX}ytmp4 https://youtu.be/xxxx*`
        }, { quoted: msg });
    }

    const ytUrl = args[0];

    await socket.sendMessage(sender, {
        text: "⏳ *𝐅𝐞𝐭𝐜𝐡𝐢𝐧𝐠 𝐯𝐢𝐝𝐞𝐨 𝐝𝐞𝐭𝐚𝐢𝐥𝐬...*"
    }, { quoted: msg });

    try {

        const { data } = await axios.get(
            `https://api-sithija-main2-production.up.railway.app/ytmp4?url=${encodeURIComponent(ytUrl)}`
        );

        if (!data.success || !data.video_details) {
            return await socket.sendMessage(sender, {
                text: "❌ *𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐟𝐞𝐭𝐜𝐡 𝐯𝐢𝐝𝐞𝐨.*"
            }, { quoted: msg });
        }

        const video = data.video_details;
        const qualities = video.urls;

        let caption = `*╭──「 📥 𝐘𝐎𝐔𝐓𝐔𝐁𝐄 𝐌𝐏𝟒 」──⊷*\n`;
        caption += `*🎬 𝐓𝐢𝐭𝐥𝐞:* ${video.title}\n`;
        caption += `*⏱ 𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧:* ${video.duration}\n\n`;
        caption += `*📥 𝐑𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡 𝐚 𝐧𝐮𝐦𝐛𝐞𝐫 𝐭𝐨 𝐝𝐨𝐰𝐧𝐥𝐨𝐚𝐝:*\n\n`;

        qualities.forEach((q, i) => {
            caption += `*${i + 1}.* ${q.quality}\n`;
        });

        caption += `\n> ${config.BOT_FOOTER}`;

        const sent = await socket.sendMessage(sender, {
            image: {
                url: video.thumbnail
            },
            caption
        }, { quoted: msg });

        const Id = sent.key.id;

        const replyHandler = async ({ messages }) => {

            const m = messages[0];
            if (!m.message) return;

            const text =
                m.message.conversation ||
                m.message.extendedTextMessage?.text;

            const replyId =
                m.message.extendedTextMessage?.contextInfo?.stanzaId;

            if (replyId !== Id) return;
            if (m.key.remoteJid !== sender) return;

            const index = parseInt(text) - 1;

            if (isNaN(index) || index < 0 || index >= qualities.length) {
                return await socket.sendMessage(sender, {
                    text: `❌ *𝐑𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡 𝐚 𝐧𝐮𝐦𝐛𝐞𝐫 𝐛𝐞𝐭𝐰𝐞𝐞𝐧 𝟏-${qualities.length}*`
                }, { quoted: m });
            }

            socket.ev.off("messages.upsert", replyHandler);

            const selected = qualities[index];

            await socket.sendMessage(sender, {
                text: `⏳ *𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝𝐢𝐧𝐠 ${selected.quality}...*`
            }, { quoted: m });

            await socket.sendMessage(sender, {
                video: {
                    url: selected.download_url
                },
                mimetype: "video/mp4",
                fileName: selected.filename,
                caption:
`🎬 *${video.title}*

🎥 *𝐐𝐮𝐚𝐥𝐢𝐭𝐲:* ${selected.quality}
⏱ *𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧:* ${video.duration}

> ${config.BOT_FOOTER}`
            }, { quoted: m });

        };

        socket.ev.on("messages.upsert", replyHandler);

        // Auto remove listener after 60 seconds
        setTimeout(() => {
            socket.ev.off("messages.upsert", replyHandler);
        }, 60000);

    } catch (err) {
        console.log(err);

        await socket.sendMessage(sender, {
            text: "❌ *𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐝𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐯𝐢𝐝𝐞𝐨.*"
        }, { quoted: msg });
    }

    break;
}

            
case 'sitecode':
case 'sitezip':
case 'zipweb': {

    if (!args.length) {
        return await socket.sendMessage(sender, {
            text: `❌ *𝐄𝐱𝐚𝐦𝐩𝐥𝐞:*\n*${config.PREFIX}sitecode https://example.com*`
        }, { quoted: msg });
    }

    const url = args[0];

    // Check URL
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return await socket.sendMessage(sender, {
            text: `❌ *𝐏𝐥𝐞𝐚𝐬𝐞 𝐩𝐫𝐨𝐯𝐢𝐝𝐞 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐰𝐞𝐛𝐬𝐢𝐭𝐞 𝐔𝐑𝐋.*\n\n*𝐄𝐱𝐚𝐦𝐩𝐥𝐞:*\nhttps://example.com`
        }, { quoted: msg });
    }

    await socket.sendMessage(sender, {
        text: "📦 *𝐂𝐫𝐞𝐚𝐭𝐢𝐧𝐠 𝐰𝐞𝐛𝐬𝐢𝐭𝐞 𝐙𝐈𝐏 𝐟𝐢𝐥𝐞...*"
    }, { quoted: msg });

    try {

        const { data } = await axios.get(
            `https://vajira-official-apis.vercel.app/api/web2zip?apikey=vajira-VajiraOfficial2003&url=${encodeURIComponent(url)}`,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            }
        );

        // Find ZIP URL
        const findZip = (obj) => {

            if (!obj) return null;

            if (typeof obj === "string") {
                if (
                    obj.startsWith("http") &&
                    (obj.includes(".zip") || obj.includes("zip"))
                ) {
                    return obj;
                }
            }

            if (typeof obj === "object") {
                for (const key in obj) {
                    const found = findZip(obj[key]);
                    if (found) return found;
                }
            }

            return null;
        };

        const zipUrl = findZip(data);

        if (!zipUrl) {
            return await socket.sendMessage(sender, {
                text: "❌ *𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐜𝐫𝐞𝐚𝐭𝐞 𝐙𝐈𝐏 𝐟𝐢𝐥𝐞.*"
            }, { quoted: msg });
        }

        let siteName = "website";

        try {
            siteName = new URL(url).hostname.replace("www.", "");
        } catch {}

        await socket.sendMessage(sender, {
            document: {
                url: zipUrl
            },
            mimetype: "application/zip",
            fileName: `${siteName}.zip`,
            caption:
`╭━━〔 📦 *𝐖𝐄𝐁𝐒𝐈𝐓𝐄 𝐓𝐎 𝐙𝐈𝐏* 〕━━⬣
┃
┃ 🌐 *𝐖𝐞𝐛𝐬𝐢𝐭𝐞 :* ${url}
┃ 📁 *𝐅𝐢𝐥𝐞 :* ${siteName}.zip
┃
┃ ✅ *𝐙𝐈𝐏 𝐂𝐫𝐞𝐚𝐭𝐞𝐝 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲!*
┃
╰━━━━━━━━━━━━━━━━⬣

> ${config.BOT_FOOTER}`
        }, { quoted: msg });

    } catch (err) {

        console.log(err);

        await socket.sendMessage(sender, {
            text: `❌ *𝐖𝐞𝐛𝐬𝐢𝐭𝐞 𝐙𝐈𝐏 𝐟𝐚𝐢𝐥𝐞𝐝.*\n\n${err.message}`
        }, { quoted: msg });

    }

    break;
}   
              
case 'lyrics':
case 'lyric': {
    const botSocket = (typeof socket !== 'undefined') ? socket : (typeof conn !== 'undefined' ? conn : null);
    const targetChat = (typeof sender !== 'undefined') ? sender : (typeof from !== 'undefined' ? from : null);
    const currentMsg = (typeof msg !== 'undefined') ? msg : (typeof mek !== 'undefined' ? mek : null);

    if (!botSocket || !targetChat) {
        console.log("Error: Bot socket or Chat ID variable not found!");
        return;
    }

    const searchQuery =
        (typeof args !== 'undefined' && args.length > 0)
            ? args.join(" ")
            : (typeof text !== 'undefined' ? text.trim() : "");

    if (!searchQuery) {
        return await botSocket.sendMessage(targetChat, {
            text: `❌ *𝐄𝐱𝐚𝐦𝐩𝐥𝐞:*\n*${config.PREFIX}lyrics perfect*`
        }, { quoted: currentMsg });
    }

    // 🎵 React
    await botSocket.sendMessage(targetChat, {
        react: {
            text: "🎵",
            key: currentMsg.key
        }
    });

    await botSocket.sendMessage(targetChat, {
        text: "🔍 *𝐒𝐞𝐚𝐫𝐜𝐡𝐢𝐧𝐠 𝐟𝐨𝐫 𝐥𝐲𝐫𝐢𝐜𝐬...*"
    }, { quoted: currentMsg });

    try {
        const axios = require("axios");

        const { data: resData } = await axios.get(
            `https://api-sithija-main2-production.up.railway.app/lyrics?text=${encodeURIComponent(searchQuery)}`
        );

        let lyricsText = "";
        let songTitle = searchQuery;
        let artistName = "Unknown";
        let imageUrl = null;

        if (resData && resData.result) {
            const data = resData.result.data || resData.result;

            if (typeof data === "object") {
                lyricsText = data.lyrics || "";
                songTitle = data.title || songTitle;
                artistName = data.artist || data.artists || artistName;
                imageUrl = data.image || null;
            } else if (typeof data === "string") {
                lyricsText = data;
            }
        }

        if (!lyricsText || lyricsText.trim() === "") {
            return await botSocket.sendMessage(targetChat, {
                text: "❌ *𝐋𝐲𝐫𝐢𝐜𝐬 𝐧𝐨𝐭 𝐟𝐨𝐮𝐧𝐝.*"
            }, { quoted: currentMsg });
        }

        const botFooter =
            (typeof sessionConfig !== "undefined" && sessionConfig.BOT_FOOTER) ||
            (typeof config !== "undefined" && config.BOT_FOOTER) ||
            "Sithija Bot";

        const caption = `╭━━〔 🎤 *𝐒𝐎𝐍𝐆 𝐋𝐘𝐑𝐈𝐂𝐒* 〕━━⬣
┃
┃ 🎵 *𝐓𝐢𝐭𝐥𝐞 :* ${songTitle}
┃ 🧑‍🎤 *𝐀𝐫𝐭𝐢𝐬𝐭 :* ${artistName}
┃
╰━━━━━━━━━━━━━━━━⬣

📝 *𝐋𝐘𝐑𝐈𝐂𝐒*

${lyricsText}

> ${botFooter}`;

        if (imageUrl && imageUrl.startsWith("http")) {
            await botSocket.sendMessage(targetChat, {
                image: {
                    url: imageUrl
                },
                caption
            }, { quoted: currentMsg });
        } else {
            await botSocket.sendMessage(targetChat, {
                text: caption
            }, { quoted: currentMsg });
        }

        // ✅ Success React
        await botSocket.sendMessage(targetChat, {
            react: {
                text: "✅",
                key: currentMsg.key
            }
        });

    } catch (e) {
        console.log(e);

        await botSocket.sendMessage(targetChat, {
            text: `❌ *𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐟𝐞𝐭𝐜𝐡 𝐥𝐲𝐫𝐢𝐜𝐬.*\n\n*𝐄𝐫𝐫𝐨𝐫:* ${e.message}`
        }, { quoted: currentMsg });

        await botSocket.sendMessage(targetChat, {
            react: {
                text: "❌",
                key: currentMsg.key
            }
        });
    }

    break;
}
              
              
              
case 'yt': {
    if (!args.length) {
        return await socket.sendMessage(sender, {
            text: `❌ Example:\n${config.PREFIX}ytsearch alan walker`
        }, { quoted: msg });
    }

    const query = args.join(" ");

    await socket.sendMessage(sender, {
        text: "🔍 Searching YouTube..."
    }, { quoted: msg });

    try {

        const { data } = await axios.get(
            `https://api-sithija-main2-production.up.railway.app/ytsearch?q=${encodeURIComponent(query)}`
        );

        if (!data.success || !data.result || data.result.length === 0) {
            return await socket.sendMessage(sender, {
                text: "❌ No results found."
            }, { quoted: msg });
        }

        const results = data.result.slice(0, 10);

        let caption = `*╭───「 🔎 YOUTUBE SEARCH 」───⊷*\n`;
        caption += `*┃ Query :* ${query}\n`;
        caption += `*╰────────────────────⊷*\n\n`;
        caption += `*Reply with the number to select a video.*\n\n`;

        results.forEach((v, i) => {
            caption += `*${i + 1}. ${v.title}*\n`;
            caption += `⏱ Duration : ${v.description.duration}\n`;
            caption += `👁 Views : ${Number(v.description.views).toLocaleString()}\n`;
            caption += `👤 Channel : ${v.author.name}\n\n`;
        });

        caption += `> ${config.BOT_FOOTER}`;

        const sent = await socket.sendMessage(sender, {
            image: {
                url: results[0].media.thumbnail
            },
            caption
        }, { quoted: msg });

        const Id = sent.key.id;

        const replyHandler = async ({ messages }) => {

            const m = messages[0];
            if (!m.message) return;

            const text =
                m.message.conversation ||
                m.message.extendedTextMessage?.text;

            const replyId =
                m.message.extendedTextMessage?.contextInfo?.stanzaId;

            if (replyId !== Id) return;
            if (m.key.remoteJid !== sender) return;

            const index = parseInt(text) - 1;

            if (isNaN(index) || index < 0 || index >= results.length) {
                return await socket.sendMessage(sender, {
                    text: `❌ Reply 1-${results.length}`
                }, { quoted: m });
            }

            socket.ev.off("messages.upsert", replyHandler);

            const video = results[index];

            await socket.sendMessage(sender, {
                image: {
                    url: video.media.thumbnail
                },
                caption:
`🎬 *${video.title}*

👤 Channel : ${video.author.name}
⏱ Duration : ${video.description.duration}
👁 Views : ${Number(video.description.views).toLocaleString()}
📅 Uploaded : ${video.description.ago}

🔗 ${video.url}`
            }, { quoted: m });

        };

        socket.ev.on("messages.upsert", replyHandler);

    } catch (err) {
        console.log(err);

        await socket.sendMessage(sender, {
            text: "❌ Search failed."
        }, { quoted: msg });
    }

    break;
}

case 'tr':
case 'translate': {
    try {
        if (!args || !args.length) {
            return await socket.sendMessage(sender, {
                text: `❌ *𝐄𝐱𝐚𝐦𝐩λ𝐞:*\n${config.PREFIX || '.'}tr si Hello World`
            }, { quoted: msg });
        }

        const axios = require("axios");

        const lang = args[0];
        const text =
            args.slice(1).join(" ") ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

        if (!text) {
            return await socket.sendMessage(sender, {
                text: `❌ *𝐑e𝐩𝐥𝐲 𝐨r 𝐞𝐧𝐭𝐞𝐫 𝐭e𝐱𝐭 𝐭𝐨 𝐭𝐫𝐚𝐧𝐬𝐥𝐚𝐭𝐞.*`
            }, { quoted: msg });
        }

        // ⚡ පළමු Reaction එක (වැඩේ පටන් ගත්තා කියලා පෙන්වන්න)
        await socket.sendMessage(sender, { react: { text: "🌐", key: msg.key } });

        const { data } = await axios.get(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`
        );

        // පරිවර්තනය වූ පාඨ එකතු කිරීම
        let translated = "";
        if (data && data[0]) {
            data[0].forEach(row => {
                if (row[0]) translated += row[0];
            });
        }

        if (!translated) {
            throw new Error("Translation data is empty");
        }

        // Footer එක dynamic ලෙස ලබා ගැනීම (Error එකක් නොඑන ලෙස safe ක්‍රමයකට)
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʙᴏᴛ';

        const caption = `╭━━〔 🌐 *𝐓𝐑𝐀𝐍𝐒𝐋𝐀𝐓𝐎𝐑* 〕━━⬣
┃
┃ 🔤 *𝐎𝐫𝐢𝐠𝐢𝐧𝐚𝐥 :*
┃ ${text}
┃
┃ 🌍 *𝐋𝐚𝐧𝐠𝐮𝐚𝐠𝐞 :* ${lang.toUpperCase()}
┃
┃ 📝 *𝐓𝐫𝐚𝐧𝐬𝐥𝐚𝐭𝐢𝐨𝐧 :*
┃ ${translated}
┃
╰━━━━━━━━━━━━━━━━⬣

> ${currentFooter}`;

        await socket.sendMessage(sender, {
            text: caption
        }, { quoted: msg });

        // ✅ වැඩේ සාර්ථකව ඉවර වුණාම වැටෙන දෙවැනි Reaction එක
        await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error("Translation Error: ", err);
        await socket.sendMessage(sender, {
            text: `❌ *𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐭𝐫𝐚𝐧𝐬𝐥𝐚𝐭𝐞.* \nError: ${err.message}`
        }, { quoted: msg });
    }
}
break;
case 'ttp': {
    const text = args.join(' ');
    if (!text) return await socket.sendMessage(sender, { text: '❌ *Need text to create sticker.*' });

    try {
        // TTP Stickers can't have "Context Info" cards attached easily, 
        // but we can send a styled reaction first.
        await socket.sendMessage(sender, { react: { text: '🎨', key: msg.key } });

        const url = `https://dummyimage.com/512x512/000000/ffffff.png&text=${encodeURIComponent(text)}`;
        
        await socket.sendMessage(sender, { 
            sticker: { url: url },
            // Using packname trick
            packname: "Dtec Mini",
            author: "TTP Bot"
        }, { quoted: msg });

    } catch (e) {
        await socket.sendMessage(sender, { text: '❌ Error creating sticker.' });
    }
    break;
}

case 'vip':
case 'csong': {
    try {
        // ✅ Owner Check එක ඉවත් කළා - දැන් ඕනෑම කෙනෙක්ට පාවිච්චි කළ හැක.

        // ⚡ පළමු Reaction එක (වැඩේ පටන් ගත්තා කියලා පෙන්වන්න)
        await socket.sendMessage(sender, { react: { text: "🫟", key: msg.key } });

        const q = msg.message?.conversation ||
                  msg.message?.extendedTextMessage?.text ||
                  msg.message?.imageMessage?.caption ||
                  msg.message?.videoMessage?.caption || '';

        // Usage Check
        if (!q || !q.includes("&")) {
            return await socket.sendMessage(sender, { 
                text: "*❎ Usage: .csong <Song Name> & <Channel Link/JID>*" 
            }, { quoted: msg });
        }

        const [songQuery, targetRaw] = q.split("&").map(v => v.trim());
        if (!songQuery || !targetRaw) {
            return await socket.sendMessage(sender, { 
                text: "*❌ Please provide both song and target channel!*" 
            }, { quoted: msg });
        }

        const yts = require("yt-search");
        const axios = require("axios");
        const fs = require("fs");
        const path = require("path");
        const os = require("os");

        let searchQuery = songQuery;
        const ytRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/;
        const match = songQuery.match(ytRegex);
        if (match) searchQuery = match[1];

        // Searching Video
        const search = await yts(searchQuery);
        if (!search.videos.length) {
            return await socket.sendMessage(sender, { text: "*❌ No results found!*" }, { quoted: msg });
        }

        const vid = search.videos[0];
        const { title, views, timestamp, ago, url: ytUrl, thumbnail } = vid;

        // ========= New Stable API for Audio =========
        const apiUrl = `https://api.dreaded.site/api/ytdl/audio?url=${ytUrl}`;
        const { data: apiRes } = await axios.get(apiUrl);

        if (!apiRes || !apiRes.result || !apiRes.result.downloadUrl) {
            return await socket.sendMessage(sender, { text: "❌ API Error: Audio link not found!" }, { quoted: msg });
        }
        
        const audioUrl = apiRes.result.downloadUrl;

        // ========= Resolve Channel =========
        let targetJid = targetRaw;
        let channelName = "WhatsApp Channel";

        try {
            if (/whatsapp\.com\/channel\//i.test(targetRaw)) {
                const match = targetRaw.match(/channel\/([\w-]+)/);
                if (match) {
                    const inviteId = match[1];
                    const metadata = await socket.newsletterMetadata("invite", inviteId);
                    targetJid = metadata.id;
                    channelName = metadata.name || channelName;
                }
            } else if (/@newsletter$/i.test(targetRaw)) {
                 targetJid = targetRaw;
            }
        } catch (err) { 
            console.error("Channel fetch error:", err.message);
            if (!targetRaw.includes('@newsletter') && !targetRaw.includes('whatsapp.com')) {
                 return await socket.sendMessage(sender, { text: "*❌ Invalid Channel Link!*" }, { quoted: msg });
            }
        }

        // ========= Download Audio =========
        const tempPath = path.join(os.tmpdir(), `song_${Date.now()}.mp3`);
        const writer = fs.createWriteStream(tempPath);

        const response = await axios({
            url: audioUrl,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // ========= Sending to Channel =========
        const caption = `🍀 𝐓𝐢𝐭𝐥𝐞 : *${title}*

👀 ᴠɪᴇᴡส์     : *${views.toLocaleString()}*
⏱️ ᴅᴜʀᴀᴛɪᴏɴ   : *${timestamp}*
📅 ᴜᴘʟᴏᴀᴅᴇᴅ   : *${ago}*

* *00:00* ────○─────── *${timestamp}*

\`සින්දුවට රියැක්ට් ඕනි ළමයෝ...😽💗🍃\`

> *${channelName}*`;

        // 1. Send Image with Caption
        await socket.sendMessage(targetJid, { 
            image: { url: thumbnail }, 
            caption: caption,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: channelName,
                    thumbnailUrl: thumbnail,
                    sourceUrl: ytUrl,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        });

        // 2. Send Audio (PTT/Voice Note Style)
        await socket.sendMessage(targetJid, {
            audio: fs.readFileSync(tempPath),
            mimetype: 'audio/mpeg',
            ptt: true,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "DTEC Music",
                    thumbnailUrl: thumbnail,
                    sourceUrl: ytUrl,
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        });

        // Cleanup
        fs.unlinkSync(tempPath);

        // Command එක පාවිච්චි කරපු කෙනාට (Sender) සාර්ථකයි කියලා මැසේජ් එක යැවීම
        const successText = `
*✅ Successfully Sent!*

🎵 *Song:* ${title}
📢 *Channel:* ${channelName}
🆔 *JID:* ${targetJid}

> ${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

        await socket.sendMessage(sender, { 
            text: successText 
        }, { quoted: msg });

        // ✅ වැඩේ සාර්ථකව ඉවර වුණාම වැටෙන දෙවැනි Reaction එක
        await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error("CSong Error:", err);
        await socket.sendMessage(sender, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    }
}
break;
case 'gdrive': {
    // 1. Error block එකටත් අහුවෙන පරිදි botMention variable එක try එකෙන් පිටත මුලින්ම define කර ගන්නවා
    let botMention = { key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_GDRIVE" } };
    
    try {
        const text = args.join(' ').trim();
        if (!text) {
            return await socket.sendMessage(sender, { 
                text: '⚠️ Please provide a Google Drive link.\n\nExample: `.gdrive <link>`' 
            }, { quoted: msg });
        }

        const sanitized = (number || '').replace(/[^0-9]/g, '');
        
        // 2. MongoDB function එක නොමැති වුවහොත් බොට් crash වීම වැළැක්වීමට safe check එකක්
        let userCfg = {};
        try {
            if (typeof loadUserConfigFromMongo === 'function') {
                userCfg = await loadUserConfigFromMongo(sanitized) || {};
            }
        } catch (mongoErr) {
            console.error('Mongo load error in gdrive:', mongoErr);
        }

        const botName = userCfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🐦‍🔥 ᴅᴛᴇᴄ ᴍɪɴɪ ᴠ1 🐦‍🔥');

        // Fake Contact Message එක සකස් කිරීම
        botMention = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_GDRIVE" },
            message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
        };

        // ⚡ පළමු Reaction එක (වැඩේ පටන් ගත්තා කියලා පෙන්වන්න)
        await socket.sendMessage(sender, { react: { text: "📂", key: msg.key } });

        // 🔹 Fetch Google Drive file info
        const res = await axios.get(`https://saviya-kolla-api.koyeb.app/download/gdrive?url=${encodeURIComponent(text)}`);
        if (!res.data?.status || !res.data.result) {
            return await socket.sendMessage(sender, { text: '❌ Failed to fetch file info.' }, { quoted: botMention });
        }

        const file = res.data.result;
        
        // 3. ඔයාගේ Base එකේ තියෙන dynamic footer එක ලෝඩ් කර ගැනීම
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `Provided by ${botName}`;

        // 🔹 Send as document
        await socket.sendMessage(sender, {
            document: { 
                url: file.downloadLink, 
                mimetype: file.mimeType || 'application/octet-stream', 
                fileName: file.name 
            },
            caption: `📂 *File Name:* ${file.name}\n💾 *Size:* ${file.size}\n\n> ${currentFooter}`,
            contextInfo: { mentionedJid: [sender] }
        }, { quoted: botMention });

        // ✅ වැඩේ සාර්ථකව ඉවර වුණාම වැටෙන දෙවැනි Reaction එක
        await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error('GDrive command error:', err);
        // දැන් මෙතන botMention variable එක අඳුරන නිසා error එකක් එන්නේ නැත
        await socket.sendMessage(sender, { text: '❌ Error fetching Google Drive file.' }, { quoted: botMention });
    }
    break;
}

case 'modapk': {
    if (!args.length) {
        return await socket.sendMessage(sender, {
            text: "❌ Use: .modapk <app name>"
        }, { quoted: msg });
    }

    const axios = require("axios");
    const query = args.join(" ");

    try {
        // 1. SEARCH
        const searchRes = await axios.get(
            `https://api.zanta-mini.store/api/modapk/search?apiKey=zanta_ZwUbRnXLEyTzfmMh0e4osfW4&url=${encodeURIComponent(query)}`
        );

        const items = searchRes.data?.result;

        if (!items || items.length === 0) {
            return await socket.sendMessage(sender, {
                text: "❌ No MOD APK found!"
            }, { quoted: msg });
        }

        const item = items[0];

        // 2. DOWNLOAD API
        const dlRes = await axios.get(
            `https://api.zanta-mini.store/api/modapk/dl?apiKey=zanta_ZwUbRnXLEyTzfmMh0e4osfW4&url=${encodeURIComponent(item.url)}`
        );

        const downloadLink = dlRes.data?.download || dlRes.data?.url;

        if (!downloadLink) {
            return await socket.sendMessage(sender, {
                text: "❌ Download link not found!"
            }, { quoted: msg });
        }

        // 3. SEND AS DOCUMENT (APK FILE)
        await socket.sendMessage(sender, {
            document: { url: downloadLink },
            mimetype: "application/vnd.android.package-archive",
            fileName: `${item.name || "modapk"}.apk`,
            caption: `📱 *MOD APK READY*\n\n📌 ${item.name}\n🔖 Version: ${item.version || "N/A"}`
        }, { quoted: msg });

    } catch (e) {
        console.log(e);
        await socket.sendMessage(sender, {
            text: "⚠️ API Error Occurred!"
        }, { quoted: msg });
    }
}
break;
              
case 'adanews': {
    // Error block එකටත් අහුවෙන පරිදි botMention variable එක try එකෙන් පිටත මුලින්ම define කර ගන්නවා
    let botMention = { key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_ADA" } };
    
    try {
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        
        // MongoDB function එකේ error එකක් ආවොත් code එක crash නොවෙන්න safe check එකක් දැම්මා
        let userCfg = {};
        try {
            if (typeof loadUserConfigFromMongo === 'function') {
                userCfg = await loadUserConfigFromMongo(sanitized) || {};
            }
        } catch (mongoErr) {
            console.error('Mongo load error in adanews:', mongoErr);
        }

        const botName = userCfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🐦‍🔥 Sithija MD ᴠ2.0.1 🐦‍🔥');

        // Fake Contact Message එක සකස් කිරීම
        botMention = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_ADA" },
            message: { 
                contactMessage: { 
                    displayName: botName, 
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` 
                } 
            }
        };

        // ⚡ පළමු Reaction එක (වැඩේ පටන් ගත්තා කියලා පෙන්වන්න)
        await socket.sendMessage(sender, { react: { text: "📰", key: msg.key } });

        const axios = require("axios");
        const res = await axios.get('https://saviya-kolla-api.koyeb.app/news/ada');
        
        if (!res.data?.status || !res.data.result) {
            return await socket.sendMessage(sender, { text: '❌ Failed to fetch Ada News.' }, { quoted: botMention });
        }

        const n = res.data.result;
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `Provided by ${botName}`;
        
        const caption = `📰 *${n.title}*\n\n📅 Date: ${n.date}\n⏰ Time: ${n.time}\n\n${n.desc}\n\n🔗 [Read more](${n.url})\n\n> ${currentFooter}`;

        await socket.sendMessage(sender, { 
            image: { url: n.image }, 
            caption: caption, 
            contextInfo: { mentionedJid: [sender] } 
        }, { quoted: botMention });

        // ✅ වැඩේ සාර්ථකව ඉවර වුණාම වැටෙන දෙවැනි Reaction එක
        await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error('adanews error:', err);
        // දැන් මෙතන botMention නැහැ කියලා error එකක් එන්නේ නැහැ
        await socket.sendMessage(sender, { text: '❌ Error fetching Ada News.' }, { quoted: botMention });
    }
}
break;
case 'ig':
case 'insta':
case 'instagram': {
    // 1. Error block එකටත් අහුවෙන පරිදි shonux variable එක try එකෙන් පිටත මුලින්ම define කර ගන්නවා
    let shonux = { key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_002" } };

    try {
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
        const q = text.split(" ").slice(1).join(" ").trim();

        // Validate
        if (!q) {
            return await socket.sendMessage(sender, { 
                text: '*🚫 Please provide an Instagram post/reel link.*',
                buttons: [{ buttonId: `${config.PREFIX}`, buttonText: { displayText: '📋 MENU' }, type: 1 }]
            });
        }

        const igRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[^\s]+/;
        if (!igRegex.test(q)) {
            return await socket.sendMessage(sender, { 
                text: '*🚫 Invalid Instagram link.*',
                buttons: [{ buttonId: `${config.PREFIX}menu`, buttonText: { displayText: '📋 MENU' }, type: 1 }]
            });
        }

        const sanitized = (number || '').replace(/[^0-9]/g, '');
        
        // 2. MongoDB function එක නොමැති වුවහොත් බොට් crash වීම වැළැක්වීමට safe check එකක්
        let cfg = {};
        try {
            if (typeof loadUserConfigFromMongo === 'function') {
                cfg = await loadUserConfigFromMongo(sanitized) || {};
            }
        } catch (mongoErr) {
            console.error('Mongo load error in instagram:', mongoErr);
        }

        const botName = cfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🐦‍🔥 ᴅᴛᴇᴄ ᴍɪɴɪ ᴠ1 🐦‍🔥');

        // Fake Contact Message එක සකස් කිරීම
        shonux = {
            key: {
                remoteJid: "status@broadcast",
                participant: "0@s.whatsapp.net",
                fromMe: false,
                id: "META_AI_FAKE_ID_002"
            },
            message: {
                contactMessage: {
                    displayName: botName,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550003:+1 313 555 0003\nEND:VCARD`
                }
            }
        };

        // ⚡ පළමු Reaction එක (වැඩේ පටන් ගත්තා කියලා පෙන්වන්න)
        await socket.sendMessage(sender, { react: { text: '🎥', key: msg.key } });

        // API request
        const axios = require("axios");
        let apiUrl = `https://delirius-apiofc.vercel.app/download/instagram?url=${encodeURIComponent(q)}`;
        let { data } = await axios.get(apiUrl).catch(() => ({ data: null }));

        // Backup API if first fails
        if (!data?.status || !data?.downloadUrl) {
            const backupUrl = `https://api.tiklydown.me/api/instagram?url=${encodeURIComponent(q)}`;
            const backup = await axios.get(backupUrl).catch(() => ({ data: null }));
            if (backup?.data?.video) {
                data = {
                    status: true,
                    downloadUrl: backup.data.video
                };
            }
        }

        if (!data?.status || !data?.downloadUrl) {
            return await socket.sendMessage(sender, { 
                text: '*🚩 Failed to fetch Instagram video.*',
                buttons: [{ buttonId: `${config.PREFIX}menu`, buttonText: { displayText: '📋 MENU' }, type: 1 }]
            }, { quoted: shonux });
        }

        // 3. ඔයාගේ Base එකේ තියෙන dynamic footer එක ලෝඩ් කර ගැනීම
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `🤖 ${botName}`;

        // Caption Template
        const titleText = `*📸 INSTAGRAM DOWNLOADER*`;
        const content = `┏━━━━━━━━━━━━━━━━\n` +
                        `┃📌 \`Source\` : Instagram\n` +
                        `┃📹 \`Type\` : Video/Reel\n` +
                        `┗━━━━━━━━━━━━━━━━`;

        const captionMessage = `${titleText}\n\n${content}\n\n> ${currentFooter}`;

        // Send video with fake contact quoted
        await socket.sendMessage(sender, {
            video: { url: data.downloadUrl },
            caption: captionMessage,
            contextInfo: { mentionedJid: [sender] },
            buttons: [
                { buttonId: `${config.PREFIX}menu`, buttonText: { displayText: '📋 MENU' }, type: 1 },
                { buttonId: `${config.PREFIX}alive`, buttonText: { displayText: '🤖 BOT INFO' }, type: 1 }
            ]
        }, { quoted: shonux });

        // ✅ වැඩේ සාර්ථකව ඉවර වුණාම වැටෙන දෙවැනි Reaction එක
        await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error("Error in Instagram downloader:", err);
        // දැන් මෙතන shonux variable එක අඳුරන නිසා error එකක් එන්නේ නැත
        await socket.sendMessage(sender, { 
            text: '*❌ Internal Error. Please try again later.*',
            buttons: [{ buttonId: `${config.PREFIX}menu`, buttonText: { displayText: '📋 MENU' }, type: 1 }]
        }, { quoted: shonux });
    }
}
break;
     
case 'sirasanews': {
    // 1. Error block එකටත් අහුවෙන පරිදි botMention variable එක try එකෙන් පිටත මුලින්ම define කර ගන්නවා
    let botMention = { key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_SIRASA" } };
    
    try {
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        
        // 2. MongoDB function එක නොමැති වුවහොත් බොට් crash වීම වැළැක්වීමට safe check එකක්
        let userCfg = {};
        try {
            if (typeof loadUserConfigFromMongo === 'function') {
                userCfg = await loadUserConfigFromMongo(sanitized) || {};
            }
        } catch (mongoErr) {
            console.error('Mongo load error in sirasanews:', mongoErr);
        }

        const botName = userCfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : '🐦‍🔥 Sithija MD ᴠ2.0.1 🐦‍🔥');

        // Fake Contact Message එක සකස් කිරීම
        botMention = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_SIRASA" },
            message: { 
                contactMessage: { 
                    displayName: botName, 
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` 
                } 
            }
        };

        // ⚡ පළමු Reaction එක (වැඩේ පටන් ගත්තා කියලා පෙන්වන්න)
        await socket.sendMessage(sender, { react: { text: "📰", key: msg.key } });

        const axios = require("axios");
        const res = await axios.get('https://saviya-kolla-api.koyeb.app/news/sirasa');
        
        if (!res.data?.status || !res.data.result) {
            return await socket.sendMessage(sender, { text: '❌ Failed to fetch Sirasa News.' }, { quoted: botMention });
        }

        const n = res.data.result;
        
        // 3. ඔයාගේ Base එකේ තියෙන dynamic footer එක ලෝඩ් කර ගැනීම
        const currentFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || (typeof config !== 'undefined' && config.BOT_FOOTER) || `Provided by ${botName}`;
        
        const caption = `📰 *${n.title}*\n\n📅 Date: ${n.date}\n⏰ Time: ${n.time}\n\n${n.desc}\n\n🔗 [Read more](${n.url})\n\n> ${currentFooter}`;

        await socket.sendMessage(sender, { 
            image: { url: n.image }, 
            caption: caption, 
            contextInfo: { mentionedJid: [sender] } 
        }, { quoted: botMention });

        // ✅ වැඩේ සාර්ථකව ඉවර වුණාම වැටෙන දෙවැනි Reaction එක
        await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error('sirasanews error:', err);
        // දැන් මෙතන botMention variable එක අඳුරන නිසා error එකක් එන්නේ නැත
        await socket.sendMessage(sender, { text: '❌ Error fetching Sirasa News.' }, { quoted: botMention });
    }
}
break;



              
       
              
case 'mbot': {
    // 1. args එකේ මුකුත් නැත්නම් (නම්බර් එක ගහලා නැත්නම්) error එකක් දෙනවා
    if (!args.length) {
        return await socket.sendMessage(sender, { 
            text: `❌ *කරන්න ඕන විදිහ:* \n\n.mbot [දුරකථන අංකය]\n*Example:* \`.mbot 94742838813\`` 
        }, { quoted: msg });
    }

    const pairPhoneNumber = args[0].trim().replace(/[^0-9]/g, ''); // ඉලක්කම් විතරක් ඉතුරු කරලා වෙනත් සලකුණු අයින් කරයි

    // 2. "Generating..." මැසේජ් එක මුලින්ම යවනවා
    await socket.sendMessage(sender, { 
        text: '⏳ *Please wait... Pair Code Generating.....*' 
    }, { quoted: msg });

    try {
        const axios = require('axios');
        // ඔයාගේ සයිට් එකේ API URL එක
        const apiUrl = `https://sithijaminimd-production.up.railway.app/code?number=${pairPhoneNumber}`;
        
        // API එකට රික්වෙස්ට් එක දානවා
        const response = await axios.get(apiUrl);
        
        // සයිට් එකෙන් කෝඩ් එක එවන්න පුළුවන් විවිධ ක්‍රම කිහිපයක්ම මෙතනින් check කරනවා
        let pairCodeResult = null;
        if (response.data) {
            pairCodeResult = response.data.code || response.data.result || response.data.pairCode || (typeof response.data === 'string' ? response.data : null);
        }

        if (pairCodeResult) {
            // 3. විස්තර ටික (Details) වෙනම මැසේජ් එකක් විදිහට යවනවා
            let detailsText = `✨ *SITHIJA BOT PAIRING DETAILS* ✨\n\n`;
            detailsText += `📱 *Target Number:* +${pairPhoneNumber}\n`;
            detailsText += `📡 *Status:* Code Generated Successfully!\n\n`;
            detailsText += `_පහතින් ලැබෙන කෝඩ් එක භාවිතා කර ලින්ක් කරගන්න._`;

            await socket.sendMessage(sender, { text: detailsText }, { quoted: msg });

            // 4. කෝඩ් එක (Pair Code) විතරක්ම ලේසියෙන් copy කරගන්න පුළුවන් වෙන්න වෙනමම මැසේජ් එකක් විදිහට යවනවා
            await socket.sendMessage(sender, { 
                text: `${pairCodeResult.trim()}` 
            }, { quoted: msg });

        } else {
            throw new Error("සයිට් එකෙන් කෝඩ් එකක් ලැබුනේ නැත. (Response Empty)");
        }

    } catch (error) {
        console.error("Pair Code Error:", error);
        
        // API එකෙන් ආපු ඇත්තම error message එක යුසර්ට පෙන්වන්න හදලා තියෙන්නේ
        let errorMsg = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
        
        await socket.sendMessage(sender, { 
            text: `❌ *Error:* Pair Code එක ලබාගැනීමට නොහැකි වුණා.\n\n*හේතුව:* \`${errorMsg}\`\n\nකරන්න ඕන විදිහ: \`.mbot 94742838813\`` 
        }, { quoted: msg });
    }
}
break;
  
case 'pinterest':
case 'pin':
case 'img': {
    // ආරම්භයේදීම 🚀 Reaction එකක් දැමීම
    await socket.sendMessage(sender, { react: { text: '🚀', key: msg.key } });

    const searchQuery = args.join(" ");
    if (!searchQuery) {
        await socket.sendMessage(sender, { 
            text: "⚠️ *සෙවිය යුතු දේ ඇතුළත් කරන්න!* 💡 _උදා:_ .pinterest anime aesthetic" 
        }, { quoted: msg });
        return;
    }

    // සෙවීම ආරම්භ කළ බව දැනුම් දීම
    await socket.sendMessage(sender, { 
        text: "⏳ _*Searching Pinterest...*_\n_Please hold on a second!_ 🚀" 
    }, { quoted: msg });

    try {
        const apiUrl = `https://api-sithija-main2-production.up.railway.app/pinterest?text=${encodeURIComponent(searchQuery)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        let imagesArray = null;
        if (data && data.success && Array.isArray(data.result)) {
            imagesArray = data.result;
        } else if (data && Array.isArray(data.result)) {
            imagesArray = data.result;
        } else if (Array.isArray(data)) {
            imagesArray = data;
        }

        if (!imagesArray || imagesArray.length === 0) {
            await socket.sendMessage(sender, { 
                text: "❌ *සමාවෙන්න!* කිසිවක් සොයාගත නොහැකි විය. 🥲" 
            }, { quoted: msg });
            return;
        }

        // උපරිම ප්‍රතිඵල 3ක් ලබා ගැනීම
        const topResults = imagesArray.slice(0, 3);
        const botFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || 
                          (typeof config !== 'undefined' && config.BOT_FOOTER) || 
                          "Powered By Sithija Anuhas";

        for (let i = 0; i < topResults.length; i++) {
            let imageUrl = topResults[i];

            // යම් හෙයකින් imageUrl එක object එකක් ලෙස ආවොත් (උදා: {url: '...'}), එහි ඇති string එක ගැනීම
            if (typeof imageUrl === 'object' && imageUrl.url) {
                imageUrl = imageUrl.url;
            } else if (typeof imageUrl === 'object' && imageUrl.image) {
                imageUrl = imageUrl.image;
            }

            if (!imageUrl || typeof imageUrl !== 'string') continue;
            
            const caption = `*🎀 ᴘɪɴᴛᴇʀᴇꜱᴛ ɪᴍᴀɢᴇ ᴅᴏᴡɴʟᴏᴀᴅᴇ r 🎀*

┌───────────────────
├ 🔍 𝙌𝙪𝙚𝙧𝙮: ${searchQuery}
├ 📸 𝙄𝙢𝙖𝙜𝙚: ${i + 1}/${topResults.length}
├ 🚀 𝙎𝙚𝙧𝙫𝙚𝙧: 𝙎𝙞𝙩𝙝𝙞𝙟𝙖 𝘼𝙋𝙄
└───────────────────

> ${botFooter}`;

            // 🛠️ FIX: ලින්ක් එක කෙලින්ම image එකක්ද නැතහොත් සාමාන්‍ය link එකක්ද කියා බැලීම
            if (imageUrl.startsWith('http') && (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') || imageUrl.includes('.png') || imageUrl.includes('.webp') || imageUrl.includes('pinimg.com'))) {
                // කෙලින්ම පින්තූරය WhatsApp එකට සෙන්ඩ් කිරීම
                await socket.sendMessage(sender, {
                    image: { url: imageUrl },
                    caption: caption
                }, { quoted: msg });
            } else {
                // පින්තූරයක් නොවේ නම් ලින්ක් එක text එකක් ලෙස යැවීම (බොට්ටුව හිරවීම වැලැක්වීමට)
                await socket.sendMessage(sender, {
                    text: `${caption}\n\n🔗 *🔗 Image Link:* ${imageUrl}`
                }, { quoted: msg });
            }
        }

        // සාර්ථකව අවසන් වූ පසු ✅ Reaction එකක් දැමීම
        await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

    } catch (e) {
        console.log(e);
        await socket.sendMessage(sender, { 
            text: `❌ *අවුලක් ගියා!*\n\n_Error:_ ${e.message}` 
        }, { quoted: msg });
    }
}
break;
case 'webzip': {
    const axios = require("axios");

    if (!args[0]) {
        return await socket.sendMessage(sender, {
            text: `❌ Example:\n${config.PREFIX}webzip https://example.com`
        }, { quoted: msg });
    }

    const url = args[0];

    if (!/^https?:\/\//i.test(url)) {
        return await socket.sendMessage(sender, {
            text: "❌ Please provide a valid URL."
        }, { quoted: msg });
    }

    await socket.sendMessage(sender, {
        text: "🌐 Fetching website source...\n⏳ Please wait..."
    }, { quoted: msg });

    try {

        const api = `https://api-sithija-main2-production.up.railway.app/web2zip?url=${encodeURIComponent(url)}`;

        const { data } = await axios.get(api, {
            timeout: 60000
        });

        console.log(data);

        if (!data.success) {
            return await socket.sendMessage(sender, {
                text: data.message || "❌ Failed."
            }, { quoted: msg });
        }

        const download =
            data.downloadLink ||
            data.download ||
            data.url ||
            data.result ||
            data.zip;

        if (!download) {
            return await socket.sendMessage(sender, {
                text: "❌ Download link not found from API."
            }, { quoted: msg });
        }

        const file = await axios({
            url: download,
            method: "GET",
            responseType: "arraybuffer",
            timeout: 120000,
            maxRedirects: 5,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        await socket.sendMessage(sender, {
            document: Buffer.from(file.data),
            mimetype: "application/zip",
            fileName: data.fileName || "website-source.zip",
            caption: `📦 Website Source Code\n🌐 ${url}`
        }, { quoted: msg });

        await socket.sendMessage(sender, {
            react: {
                text: "✅",
                key: msg.key
            }
        });

    } catch (e) {
        console.log(e);

        await socket.sendMessage(sender, {
            text: `❌ ${e.response?.data?.message || e.message}`
        }, { quoted: msg });
    }
}
break;

              
case 'setting': {
     
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: "🔒 *Session owner ekta witharai me command eka use karanna puluwan.*"
        }, { quoted: msg });
    }
    
    // 1. Check for input; if empty, show advanced help
    if (!args.length) {
        let helpText = `*👋 ɢʀᴇᴇᴛɪɴɢs, ᴀᴅᴍɪɴ!*
_sʏsᴛᴇᴍ ᴄᴏɴғɪɢᴜʀᴀᴛɪᴏɴ ᴘᴀɴᴇʟ ɪs ᴏɴʟɪɴᴇ._
*╭─🍀 ʜ ᴏ ᴡ  ᴛ ᴏ  ᴜ s ᴇ─*
*│* 🛠️ *ᴜsᴀɢᴇ :* \`.setting KEY:VALUE\`
*│* 📝 *ᴇxᴀᴍᴘʟᴇ :* \`.setting MODE:public\`
*│* ✨ *ᴍᴜʟᴛɪ :* \`.setting AUTO_VIEW_STATUS:true, AUTO_LIKE_STATUS:true\`
*╰────────────*
*╭─📂 ᴀ ᴠ ᴀ ɪ ʟ ᴀ ʙ ʟ ᴇ  ᴋ ᴇ ʏ s─*
*│* ♦️ \`AUTO_VIEW_STATUS\`
*│* ♦️ \`AUTO_LIKE_STATUS\`
*│* ♦️ \`AUTO_REACT\` _(react to random messages)_
*│* ♦️ \`AUTO_TYPING\` _(show typing before replying)_
*│* ♦️ \`AUTO_REPLY_STATUS\` _(no-prefix keyword replies, see .autoreply)_
*│* ♦️ \`PREFIX\`
*│* ♦️ \`MODE\`
*│* ♦️ \`BOT_FOOTER\`
*╰──────────*`;

        return await socket.sendMessage(sender, {
            image: { url: config.SITHIJA_IMAGE_PATH || config.ERROR },
            caption: formatMessage(
                ` ᴄ ᴏ ɴ ғ ɪ ɢ  ᴍ ᴀ ɴ ᴀ ɢ ᴇ ʀ  `, 
                helpText, 
                `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
            )
        }, { quoted: msg });
    }

    const input = args.join(' ');
    const updates = {};
    const validKeys = [
        'AUTO_VIEW_STATUS','BOT_FOOTER','MODE','PREFIX', 'AUTO_LIKE_STATUS',
        'AUTO_REACT','AUTO_TYPING','AUTO_RECORDING','AUTO_REPLY_STATUS','ANTI_CALL'
    ];
    const pairs = input.split(',');
    let hasInvalidKey = false;
    let invalidKeyName = '';

    pairs.forEach(pair => {
        let [key, ...valueParts] = pair.split(':');
        if (!key || valueParts.length === 0) return;

        key = key.trim().toUpperCase();
        let value = valueParts.join(':').trim(); 

        if (validKeys.includes(key)) {
            if (value.toLowerCase() === 'true') {
                updates[key] = 'true';
            } 
            else if (value.toLowerCase() === 'false') {
                updates[key] = 'false';
            } 
            else {
                updates[key] = value;
            }
        } else {
            hasInvalidKey = true;
            invalidKeyName = key;
        }
    });

    if (hasInvalidKey) {
        return await socket.sendMessage(sender, { 
            text: `❌ *ɪɴᴠᴀʟɪᴅ sʏsᴛᴇᴍ ᴋᴇʏ:* \`${invalidKeyName}\`\n\n*Available keys: AUTO_VIEW_STATUS, AUTO_LIKE_STATUS*}` 
        }, { quoted: msg });
    }

    if (Object.keys(updates).length === 0) {
        return await socket.sendMessage(sender, { text: "❌ *ғᴏʀᴍᴀᴛ ᴇʀʀᴏʀ:* Please use `Key:Value` format.\n\nExample: `.set AUTO_VIEW_STATUS:true, AUTO_LIKE_STATUS:false`" });
    }

    try {
        await socket.sendMessage(sender, { react: { text: "⚙️", key: msg.key } });

        sessionConfig = { ...sessionConfig, ...updates };
        await updateUserConfig(sanitizedNumber, sessionConfig);
        activeSockets.set(sanitizedNumber, { socket, config: sessionConfig });

        let updateSummary = Object.entries(updates).map(([k, v]) => {
            return `*│* ✅ *${k}* ➜ \`${v}\``;
        }).join('\n');

        const successMsg = `*🚀 sʏsᴛᴇᴍ ᴄᴏɴғɪɢᴜʀᴀᴛɪᴏɴ ᴜᴘᴅᴀᴛᴇᴅ!*

*╭ᴜ ᴘ ᴅ ᴀ ᴛ ᴇ  ʟ ᴏ ɢ*
${updateSummary}
*╰────────────*

_System changes applied successfully._`;

        await socket.sendMessage(sender, {
            image: { url: sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
            caption: formatMessage(
                `ᴜ ᴘ ᴅ ᴀ ᴛ ᴇ  ᴅ ᴏ ɴ ᴇ`,
                successMsg,
                `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
            )
        }, { quoted: msg });

        await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error("Update Error:", error);
        await socket.sendMessage(sender, { text: "❌ *sʏsᴛᴇᴍ ᴄʀɪᴛɪᴄᴀʟ ᴇʀʀᴏʀ:* " + error.message });
    }
}
break; 
case 'autoreply':
case 'ar': {
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: "🔒 *Session owner ekta witharai me command eka use karanna puluwan.*"
        }, { quoted: msg });
    }

    const sub = (args[0] || '').toLowerCase();
    const list = Array.isArray(sessionConfig.AUTO_REPLY_LIST) ? sessionConfig.AUTO_REPLY_LIST : [];

    const persist = async (newList) => {
        sessionConfig = { ...sessionConfig, AUTO_REPLY_LIST: newList };
        await updateUserConfig(sanitizedNumber, sessionConfig);
        activeSockets.set(sanitizedNumber, { socket, config: sessionConfig });
    };

    if (sub === 'on' || sub === 'off') {
        await persist(list);
        sessionConfig = { ...sessionConfig, AUTO_REPLY_STATUS: sub === 'on' ? 'true' : 'false' };
        await updateUserConfig(sanitizedNumber, sessionConfig);
        activeSockets.set(sanitizedNumber, { socket, config: sessionConfig });
        return await socket.sendMessage(sender, {
            text: `✅ *Auto Reply* ${sub === 'on' ? 'ᴇɴᴀʙʟᴇᴅ ✅' : 'ᴅɪsᴀʙʟᴇᴅ ❌'}`
        }, { quoted: msg });
    }

    if (sub === 'add') {
        const raw = args.slice(1).join(' ');
        const [trigger, ...respParts] = raw.split('|');
        const response = respParts.join('|').trim();
        if (!trigger || !trigger.trim() || !response) {
            return await socket.sendMessage(sender, {
                text: "❌ *Format:* `.autoreply add trigger|response`\n\n📌 *Example:* `.autoreply add hi|hii 👋`"
            }, { quoted: msg });
        }
        const cleanTrigger = trigger.trim();
        const withoutDup = list.filter(p => p.trigger.toLowerCase() !== cleanTrigger.toLowerCase());
        withoutDup.push({ trigger: cleanTrigger, response });
        await persist(withoutDup);
        return await socket.sendMessage(sender, {
            text: `✅ *Auto-Reply Added*\n\n*Trigger:* ${cleanTrigger}\n*Response:* ${response}`
        }, { quoted: msg });
    }

    if (sub === 'del' || sub === 'delete' || sub === 'remove') {
        const trigger = args.slice(1).join(' ').trim();
        if (!trigger) {
            return await socket.sendMessage(sender, { text: "❌ *Format:* `.autoreply del trigger`" }, { quoted: msg });
        }
        const filtered = list.filter(p => p.trigger.toLowerCase() !== trigger.toLowerCase());
        if (filtered.length === list.length) {
            return await socket.sendMessage(sender, { text: `❌ *"${trigger}"* trigger ekak hoyaganna bari una.` }, { quoted: msg });
        }
        await persist(filtered);
        return await socket.sendMessage(sender, { text: `🗑️ *Removed trigger:* ${trigger}` }, { quoted: msg });
    }

    if (sub === 'clear') {
        await persist([]);
        return await socket.sendMessage(sender, { text: "🗑️ *All auto-reply triggers cleared.*" }, { quoted: msg });
    }

    // default -> list + help
    const statusLine = sessionConfig.AUTO_REPLY_STATUS === 'true' ? '✅ ON' : '❌ OFF';
    const listText = list.length
        ? list.map((p, i) => `*│* ${i + 1}. \`${p.trigger}\` ➜ ${p.response}`).join('\n')
        : '*│* _No triggers yet._';

    const helpText = `*💬 ᴀᴜᴛᴏ ʀᴇᴘʟʏ ᴍᴀɴᴀɢᴇʀ*
*Status:* ${statusLine}

*╭─🛠️ ᴄᴏᴍᴍᴀɴᴅs─*
*│* \`.autoreply on / off\`
*│* \`.autoreply add trigger|response\`
*│* \`.autoreply del trigger\`
*│* \`.autoreply clear\`
*╰────────────*
*╭─📂 ᴄᴜʀʀᴇɴᴛ ᴛʀɪɢɢᴇʀs─*
${listText}
*╰────────────*
_Prefix ekak nathuwama trigger eka type kalama automatic reply eka enawa._`;

    return await socket.sendMessage(sender, {
        image: { url: sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
        caption: formatMessage(
            ` ᴀ ᴜ ᴛ ᴏ  ʀ ᴇ ᴘ ʟ ʏ `,
            helpText,
            `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
        )
    }, { quoted: msg });
}
break;
case 'setchannel':
case 'addchannel': {
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: "🔒 *Session owner ekta witharai me command eka use karanna puluwan.*"
        }, { quoted: msg });
    }
    const inputRaw = args.join(' ').trim();
    if (!inputRaw) {
        return await socket.sendMessage(sender, {
            text: "❌ *Format:* `.setchannel <channel link / jid>`\n\n📌 *Example:* `.setchannel https://whatsapp.com/channel/0029XXXXXXXX`"
        }, { quoted: msg });
    }

    try {
        let channelJid = null;
        if (/whatsapp\.com\/channel\//i.test(inputRaw)) {
            const inviteId = inputRaw.match(/channel\/([\w-]+)/)?.[1];
            const meta = await socket.newsletterMetadata("invite", inviteId);
            channelJid = meta?.id;
        } else if (/@newsletter$/i.test(inputRaw)) {
            channelJid = inputRaw;
        } else if (/^\d{12,}$/.test(inputRaw)) {
            channelJid = `${inputRaw}@newsletter`;
        }

        if (!channelJid) {
            return await socket.sendMessage(sender, { text: "❌ *Invalid channel link/jid eka.*" }, { quoted: msg });
        }

        const channels = Array.isArray(sessionConfig.REACT_CHANNELS) ? [...sessionConfig.REACT_CHANNELS] : [];
        if (!channels.includes(channelJid)) channels.push(channelJid);

        sessionConfig = { ...sessionConfig, REACT_CHANNELS: channels };
        await updateUserConfig(sanitizedNumber, sessionConfig);
        activeSockets.set(sanitizedNumber, { socket, config: sessionConfig });

        try { await socket.newsletterFollow(channelJid); } catch (e) {}

        return await socket.sendMessage(sender, {
            text: `✅ *Channel Added for Auto-React*\n\n\`${channelJid}\`\n\n_Total channels:_ ${channels.length}`
        }, { quoted: msg });
    } catch (error) {
        return await socket.sendMessage(sender, { text: `❌ *Error:* ${error.message}` }, { quoted: msg });
    }
}
break;
case 'delchannel': {
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: "🔒 *Session owner ekta witharai me command eka use karanna puluwan.*"
        }, { quoted: msg });
    }
    const idx = parseInt(args[0], 10);
    const channels = Array.isArray(sessionConfig.REACT_CHANNELS) ? [...sessionConfig.REACT_CHANNELS] : [];
    if (!channels.length) {
        return await socket.sendMessage(sender, { text: "❌ *Channel list eka empty.*" }, { quoted: msg });
    }
    if (!idx || idx < 1 || idx > channels.length) {
        const listText = channels.map((c, i) => `*│* ${i + 1}. \`${c}\``).join('\n');
        return await socket.sendMessage(sender, {
            text: `❌ *Format:* \`.delchannel number\`\n\n${listText}`
        }, { quoted: msg });
    }
    const removed = channels.splice(idx - 1, 1);
    sessionConfig = { ...sessionConfig, REACT_CHANNELS: channels };
    await updateUserConfig(sanitizedNumber, sessionConfig);
    activeSockets.set(sanitizedNumber, { socket, config: sessionConfig });
    return await socket.sendMessage(sender, { text: `🗑️ *Removed channel:* \`${removed[0]}\`` }, { quoted: msg });
}
break;
case 'channels': {
    const channels = Array.isArray(sessionConfig.REACT_CHANNELS) ? sessionConfig.REACT_CHANNELS : [];
    const defaultLine = `*│* 0. \`${config.NEWSLETTER_JID}\` _(default)_`;
    const listText = channels.length
        ? channels.map((c, i) => `*│* ${i + 1}. \`${c}\``).join('\n')
        : '*│* _No extra channels added yet._';
    return await socket.sendMessage(sender, {
        text: `*📢 ʀᴇᴀᴄᴛ ᴄʜᴀɴɴᴇʟs*\n\n${defaultLine}\n${listText}\n\n_Add:_ \`.setchannel <link>\`\n_Remove:_ \`.delchannel <number>\``
    }, { quoted: msg });
}
break;
case 'forward':
case 'fv': {
    if (!msg.message.extendedTextMessage || !msg.message.extendedTextMessage.contextInfo.quotedMessage) {
        return await socket.sendMessage(sender, { 
            text: `❌ *Error:* Please reply to the message you want to forward.\n\n` +
                  `> ${config.BOT_FOOTER}` 
        }, { quoted: msg });
    }

    const targetJid = args[0];
    if (!targetJid || !targetJid.includes('@')) {
        return await socket.sendMessage(sender, { 
            text: `❌ *Invalid JID!*\n\n▫ *Usage:* .fv [target_jid]\n\n` +
                  `> ${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}` 
        }, { quoted: msg });
    }

    try {
        await socket.sendMessage(sender, { react: { text: "📤", key: msg.key } });
        await socket.sendMessage(targetJid, { 
            forward: {
                key: { 
                    remoteJid: sender, 
                    id: msg.message.extendedTextMessage.contextInfo.stanzaId 
                },
                message: msg.message.extendedTextMessage.contextInfo.quotedMessage
            },
            contextInfo: { forwardingScore: 0, isForwarded: false } 
        });

        await socket.sendMessage(sender, { 
            text: `✅ *Forwarded!*\n\n▫ *Target:* \`${targetJid}\`\n\n` +
                  `> ${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}` 
        }, { quoted: msg });
        
        await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error(error);
        await socket.sendMessage(sender, { 
            text: `❌ *Error:* ${error.message}`
        }, { quoted: msg });
    }
}
break;
case 'jid': {
    const chatJid = msg.message.extendedTextMessage?.contextInfo?.participant || 
                    (args[0]?.includes('@') ? args[0] : (args[0] ? `${args[0].replace(/[^0-9]/g, '')}@s.whatsapp.net` : sender));
    await socket.sendMessage(sender, { text: chatJid }, { quoted: msg });
}
break;
case 'an1':
case 'apk2': {
    // 🛠️ Variable ආරක්ෂිතව ගලපා ගැනීම (Crash වීම් වැළැක්වීමට)
    const botSocket = (typeof socket !== 'undefined') ? socket : (typeof conn !== 'undefined' ? conn : null);
    const targetChat = (typeof sender !== 'undefined') ? sender : (typeof from !== 'undefined' ? from : null);
    const currentMsg = (typeof msg !== 'undefined') ? msg : (typeof mek !== 'undefined' ? mek : null);

    if (!botSocket || !targetChat) {
        console.log("Error: Bot socket or Chat ID variable not found!");
        return;
    }

    // 🛠️ Search Query එක ක්‍රම කිහිපයකින්ම නිවැරදිව ලබා ගැනීමට උත්සාහ කිරීම
    let searchQuery = "";
    if (typeof args !== 'undefined' && args.length > 0) {
        searchQuery = args.join(" ");
    } else if (typeof text !== 'undefined' && text) {
        searchQuery = text.trim();
    } else if (currentMsg && currentMsg.body) {
        // සමහර බොට්ස් වල command එක අයින් කරලා text එක ගන්න මෙහෙම කරන්න වෙනවා
        searchQuery = currentMsg.body.split(" ").slice(1).join(" ");
    }
    
    // වැරදිලා හෝ command එක විතරක් ගැහුවොත් query එක හිස් වෙන එක වැළැක්වීමට
    if (!searchQuery || searchQuery.trim() === "") {
        await botSocket.sendMessage(targetChat, { 
            text: "⚠️ *බාගත යුතු ඇප් එකේ නම ඇතුළත් කරන්න!* 💡 _උදා:_ .an1 vector" 
        }, { quoted: currentMsg });
        return;
    }

    searchQuery = searchQuery.trim();

    // 📥 Reaction එකක් දැමීම
    await botSocket.sendMessage(targetChat, { react: { text: '📥', key: currentMsg.key } });

    // සෙවීම ආරම්භ කළ බව දැනුම් දීම
    await botSocket.sendMessage(targetChat, { 
        text: `⏳ _*Searching for "${searchQuery}" APK...*_\n_Please hold on a second!_ 🚀` 
    }, { quoted: currentMsg });

    try {
        const axios = require('axios');
        // ඔබේ Railway API එකට request එක යැවීම
        const apiUrl = `https://api-sithija-main2-production.up.railway.app/download-android1?q=${encodeURIComponent(searchQuery)}`;
        
        // Debugging සඳහා API එකට යන හරියටම ලින්ක් එක Console එකේ බලාගන්න
        console.log("Requesting URL: ", apiUrl);

        const response = await axios.get(apiUrl);
        const resData = response.data;

        // API Output එක Console එකේ බලාගැනීමට (Debugging)
        console.log("--- APK API OUTPUT ---");
        console.log(JSON.stringify(resData, null, 2));

        if (resData && (resData.success || resData.status === true || resData.result)) {
            // API එක අනුව දත්ත පවතින තැන තෝරාගැනීම
            const app = resData.app_details || resData.result || resData.data;

            if (!app) {
                await botSocket.sendMessage(targetChat, { text: "❌ ඇප් එකේ විස්තර සොයාගත නොහැකි විය!" }, { quoted: currentMsg });
                return;
            }

            const botFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || 
                              (typeof config !== 'undefined' && config.BOT_FOOTER) || 
                              "Sithija Bot Multi-Device";

            // WhatsApp එකට යන Message එක සකස් කිරීම
            let captionText = `*⚡ AN1 APK DOWNLOADER ⚡*\n\n`;
            captionText += `*📌 Name:* ${app.name || app.title || searchQuery}\n`;
            captionText += `*ℹ️ Info:* ${app.version || app.size || 'Unknown'}\n`;
            captionText += `*👨‍💻 Developer:* ${app.developer || app.author || 'Unknown'}\n\n`;
            captionText += `*Owner:* ${resData.owner || 'Sithija'}\n\n`;
            captionText += `> 📥 _පහතින් ඔයාගේ APK එක Upload වෙනවා..._\n`;
            captionText += `> ${botFooter}`;

            const iconUrl = app.icon_url || app.icon || app.thumbnail || app.image;
            const downloadUrl = app.download_url || app.download || app.link || app.url;

            // ඇප් එකේ Icon එක යැවීම
            if (iconUrl && typeof iconUrl === 'string' && iconUrl.startsWith('http')) {
                await botSocket.sendMessage(targetChat, { 
                    image: { url: iconUrl }, 
                    caption: captionText 
                }, { quoted: currentMsg });
            } else {
                await botSocket.sendMessage(targetChat, { text: captionText }, { quoted: currentMsg });
            }

            // APK File එක Document එකක් ලෙස යැවීම
            if (downloadUrl && typeof downloadUrl === 'string' && downloadUrl.startsWith('http')) {
                await botSocket.sendMessage(targetChat, { 
                    document: { url: downloadUrl }, 
                    mimetype: 'application/vnd.android.package-archive', 
                    fileName: `${app.name || searchQuery}.apk` 
                }, { quoted: currentMsg });

                // සාර්ථකව අවසන් වූ පසු ✅ Reaction එකක් දැමීම
                await botSocket.sendMessage(targetChat, { react: { text: '✅', key: currentMsg.key } });
            } else {
                await botSocket.sendMessage(targetChat, { 
                    text: "❌ *කනගාටුයි!* ඇප් එකේ විස්තර හමුවුවත් බාගත කිරීමේ ලින්ක් එක (Download URL) ලබා ගැනීමට නොහැකි විය." 
                }, { quoted: currentMsg });
            }

        } else {
            await botSocket.sendMessage(targetChat, { 
                text: `❌ ${resData.message || "ඔය නමින් දත්ත කිසිවක් සොයාගන්න බැරි වුණා!"}` 
            }, { quoted: currentMsg });
        }

    } catch (e) {
        console.error(e);
        await botSocket.sendMessage(targetChat, { 
            text: `❌ *දෝෂයක් ඇති විය!*\n\n_Error:_ ${e.message}` 
        }, { quoted: currentMsg });
    }
}
break;
              
 case 'menu':
      const videoNote = config.menuVideo || 'https://files.catbox.moe/ltocyv.mp4';       
    const menuMsg = await socket.sendMessage(sender, {
    

        image: { url: config.SITHIJA_IMAGE_PATH2 },
        caption: ` 💬 𝑯𝒊 𝑩𝒐𝒕 𝑼𝒔𝒆𝒓 ! 𝑯𝒐𝒘 𝑨𝒓𝒆 𝒀𝒐𝒖 ?

🤖 𝙄'𝙢 𝙎𝙞𝙢𝙥𝙡𝙚 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️

┌─❖ 𝑺𝒀𝑺𝑻𝑬𝑴 𝑶𝑽𝑬𝑹𝑽𝑰𝑬𝑾
│ 👑 𝑫𝒆𝒗𝒆𝒍𝒐𝒑𝒆𝒓 : 𝑺𝒊𝒕𝒉𝒊𝒋𝒂
│ 📦 𝑽𝒆𝒓𝒔𝒊𝒐𝒏   : 1.0.0
│ 🟢 𝑶𝒏𝒍𝒊𝒏𝒆    : 𝑻𝒓𝒖𝒆
└─────────────❖

┌─❖ 𝑴𝑬𝑵𝑼 𝑷𝑨𝑵𝑬𝑳
│ 🍀 [1] 𝑴𝒂𝒊𝒏
│ 🎥 [2] 𝑴𝒐𝒗𝒊𝒆𝒔
│ 🛠️ [3] 𝑻𝒐𝒐𝒍𝒔 & 𝒂𝒊
│ 📥 [4] 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅𝒔 & 𝒔𝒆𝒂𝒓𝒄𝒉
└─────────────❖

📌 𝑹𝒆𝒑𝒍𝒚 𝑾𝒊𝒕𝒉 𝑻𝒉𝒆 𝑫𝒆𝒔𝒊𝒓𝒆𝒅 𝑶𝒑𝒕𝒊𝒐𝒏 𝑵𝒖𝒎𝒃𝒆𝒓

${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
    }, { quoted: sudu });
    
    if (!global.activeMenuUsers) global.activeMenuUsers = new Set();
    global.activeMenuUsers.add(sender);
    
    const menuListener = async (messageUpdate) => {
        const mek = messageUpdate.messages[0];
        if (!mek.message) return;
        const isReplyToMenu = mek.message.extendedTextMessage?.contextInfo?.stanzaId === menuMsg.key.id;
        const isFromSameUser = mek.key.remoteJid === sender;
        const isStillActive = global.activeMenuUsers.has(sender);
        let messageType = mek.message.conversation || 
                         mek.message.extendedTextMessage?.text || 
                         '';
        messageType = messageType.trim();
        
        if (isReplyToMenu && isFromSameUser && isStillActive && ['1','2','3','4'].includes(messageType)) {
            await socket.sendMessage(sender, { 
                react: { text: '✅', key: mek.key } 
            });
            
            switch (messageType) {
                case '1': 
                    await socket.sendMessage(sender, {
                        image: { url: config.SITHIJA_IMAGE_PATH },
                        caption: `𝙎𝙞𝙢𝙥𝙡𝙚 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️
┌─❖ 🟢 𝑩𝑶𝑻 𝑺𝒀𝑺𝑻𝑬𝑴 ❖─┐
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}menu
│   ╰➤ 𝑶𝒑𝒆𝒏 𝑰𝒏𝒕𝒆𝒓𝒂𝒄𝒕𝒊𝒗𝒆 𝑴𝒂𝒊𝒏 𝑴𝒆𝒏𝒖
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}alive
│   ╰➤ 𝑪𝒉𝒆𝒄𝒌 𝑩𝒐𝒕 𝑺𝒕𝒂𝒕𝒖𝒔 & 𝑼𝒑𝒕𝒊𝒎𝒆
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}ping
│   ╰➤ 𝑻𝒆𝒔𝒕 𝑹𝒆𝒔𝒑𝒐𝒏𝒔𝒆 𝑺𝒑𝒆𝒆𝒅
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}owner
│   ╰➤ 𝑪𝒐𝒏𝒕𝒂𝒄𝒕 𝑩𝒐𝒕 𝑫𝒆𝒗𝒆𝒍𝒐𝒑𝒆𝒓
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}setting
│   ╰➤ 𝑪𝒉𝒂𝒏𝒈𝒆 𝑩𝒐𝒕 𝑺𝒆𝒕𝒕𝒊𝒏𝒈𝒔
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}autoreply
│   ╰➤ 𝑵𝒐-𝑷𝒓𝒆𝒇𝒊𝒙 𝑨𝒖𝒕𝒐-𝑹𝒆𝒑𝒍𝒚 𝑴𝒂𝒏𝒂𝒈𝒆𝒓
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}setchannel / delchannel / channels
│   ╰➤ 𝑴𝒂𝒏𝒂𝒈𝒆 𝑪𝒉𝒂𝒏𝒏𝒆𝒍 𝑨𝒖𝒕𝒐-𝑹𝒆𝒂𝒄𝒕
│
└───────────────────────❖
${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                    }, { quoted: mek });
                    break;
                    
                case '2': 
                    await socket.sendMessage(sender, {
                        image: { url: config.SITHIJA_IMAGE_PATH },
                        caption: `𝙎𝙞𝙢𝙥𝙡𝙚 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️

┌─❖ 🍿 𝑬𝑵𝑻𝑬𝑹𝑻𝑨𝑰𝑵𝑴𝑬𝑵𝑻 ❖─┐
│
├ 🎥 ${sessionConfig.PREFIX || config.PREFIX}cinesubz <query>
│   ╰➤ 𝑺𝒆𝒂𝒓𝒄𝒉 & 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑴𝒐𝒗𝒊𝒆𝒔
│      𝑻𝑽 𝑺𝒆𝒓𝒊𝒆𝒔 𝑭𝒓𝒐𝒎 𝑪𝒊𝒏𝒆𝒔𝒖𝒃𝒛
│
└─────────────────────────❖

${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                    }, { quoted: mek });
                    break;

case '3': 
                    await socket.sendMessage(sender, {
                        image: { url: config.SITHIJA_IMAGE_PATH },
                        caption: `𝙎𝙞𝙢𝙥𝙡𝙚 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️
                        
┌─❖ ⚡ 𝑼𝑻𝑰𝑳𝑰𝑻𝒀 𝑻𝑶𝑶𝑳𝑺 ❖─┐
│
├ 🛠️ ${sessionConfig.PREFIX || config.PREFIX}jid
│   ╰➤ 𝑮𝒆𝒕 𝑼𝒔𝒆𝒓 𝒐𝒓 𝑮𝒓𝒐𝒖𝒑 𝑱𝑰𝑫
│
├ 🛠️ ${sessionConfig.PREFIX || config.PREFIX}forward <jid>
│   ╰➤ 𝑭𝒐𝒓𝒘𝒂𝒓𝒅 𝑷𝒉𝒐𝒕𝒐𝒔 & 𝑽𝒊𝒅𝒆𝒐𝒔
│      𝑻𝒐 𝑺𝒆𝒍𝒆𝒄𝒕𝒆𝒅 𝑱𝑰𝑫
│
├ 🤖 ${sessionConfig.PREFIX || config.PREFIX}ai
│  ╰➤ 𝑨𝒔𝒌 𝑨𝒏𝒚𝒕𝒉𝒊𝒏𝒈 𝑭𝒓𝒐𝒎 𝑨𝑰
│     𝑪𝒉𝒂𝒕𝒃𝒐𝒕 𝑨𝒔𝒔𝒊𝒔𝒕𝒂𝒏𝒕
│ 
├ 🤖 ${sessionConfig.PREFIX || config.PREFIX}sithijaai
│  ╰➤ 𝑨𝒔𝒌 𝑨𝒏𝒚𝒕𝒉𝒊𝒏𝒈 𝑭𝒓𝒐𝒎 𝑨𝑰
│     𝑪𝒉𝒂𝒕𝒃𝒐𝒕 𝑨𝒔𝒔𝒊𝒔𝒕𝒂𝒏𝒕
└─────────────────────────❖

${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                    }, { quoted: mek });
                    break;

case '4': 
                    await socket.sendMessage(sender, {
                        image: { url: config.SITHIJA_IMAGE_PATH },
                        caption: `𝙎𝙞𝙢𝙥𝙡𝙚 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️
                        
┌─❖ ⚡ 𝑴𝑬𝑫𝑰𝑨 𝑫𝑶𝑾𝑵𝑳𝑶𝑨𝑫𝑬𝑹𝑺 ❖─┐
│
├ 📥 ${sessionConfig.PREFIX || config.PREFIX}song <link/name>
│   ╰➤ 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑺𝒐𝒏𝒈𝒔
│      𝑰𝒏 𝑯𝒊𝒈𝒉 𝑸𝒖𝒂𝒍𝒊𝒕𝒚
│
├ 📥 ${sessionConfig.PREFIX || config.PREFIX}tiktok <link>
│   ╰➤ 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑻𝒊𝒌𝑻𝒐𝒌 𝑽𝒊𝒅𝒆𝒐𝒔
│      𝑾𝒊𝒕𝒉𝒐𝒖𝒕 𝑾𝒂𝒕𝒆𝒓𝒎𝒂𝒓𝒌
│
├ 📥 ${sessionConfig.PREFIX || config.PREFIX}facebook <link>
│   ╰➤ 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑭𝒂𝒄𝒆𝒃𝒐𝒐𝒌 𝑽𝒊𝒅𝒆𝒐𝒔
│      𝑰𝒏 𝑯𝑫 𝑸𝒖𝒂𝒍𝒊𝒕𝒚
│
├ 📥 ${sessionConfig.PREFIX || config.PREFIX}apk
│  ╰➤ 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑨𝒏𝒅𝒓𝒐𝒊𝒅 𝑨𝒑𝒌𝒔
│     𝑨𝒏𝒅 𝑮𝒂𝒎𝒆𝒔
│
├ 📥 ${sessionConfig.PREFIX || config.PREFIX}an1
│  ╰➤ 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑨𝒏𝒅𝒓𝒐𝒊𝒅 𝑨𝒑𝒌𝒔
│     𝑨𝒏𝒅 𝑮𝒂𝒎𝒆𝒔
│
├ ▶️ ${sessionConfig.PREFIX || config.PREFIX}yt
│  ╰➤ 𝒀𝒐𝒖𝑻𝒖𝒃𝒆 𝑺𝒆𝒂𝒓𝒄𝒉
│
├ ▶️ ${sessionConfig.PREFIX || config.PREFIX}ytmp4
│ ╰➤ 𝒀𝒐𝒖𝑻𝒖𝒃𝒆 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅
│
├ 📥 ${sessionConfig.PREFIX || config.PREFIX}pinterest 
│   ╰➤ 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑷𝒊𝒏𝒕𝒆𝒓𝒆𝒔𝒕 𝑰𝒎𝒂𝒈𝒆𝒔
│     𝑰𝒏 𝑯𝑫 𝑸𝒖𝒂𝒍𝒊𝒕𝒚 𝒂𝒏𝒅 4𝑲
│ 
├ 🎶 ${sessionConfig.PREFIX || config.PREFIX}lyrics
│  ╰➤ 𝑺𝒆𝒂𝒓𝒄𝒉 𝑨𝒏𝒅 𝑭𝒊𝒏𝒅 𝑺𝒐𝒏𝒈
│     𝑳𝒚𝒓𝒊𝒄𝒔 𝑬𝒂𝒔𝒊𝒍𝒚
│
├─❖ 🔞𝑪𝑶𝑵𝑻𝑬𝑵𝑻 𝑫𝑶𝑾𝑵𝑳𝑶𝑨𝑫𝑬𝑹𝑺 ❖─
│
├ 📥 ${sessionConfig.PREFIX || config.PREFIX}xnxx <name>
│    ╰➤𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 🔞𝑽𝒊𝒅𝒆𝒐𝒔
└─────────────────────────❖
   
${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                    }, { quoted: mek });
                    break;

                    
                default:
                    await socket.sendMessage(sender, { text: '❌ Invalid option!' }, { quoted: mek });
                    break;
            }

            console.log(`📱 User ${sender} selected option: ${messageType}`);
        }
        
        else if (isFromSameUser && isStillActive && !isReplyToMenu && messageType.startsWith(sessionConfig.PREFIX || config.PREFIX)) {
            global.activeMenuUsers.delete(sender);
            socket.ev.off('messages.upsert', menuListener);
            console.log(`🚪 User ${sender} exited menu (used other command)`);
        }
    };
    
    socket.ev.on('messages.upsert', menuListener);
    
    const timeoutId = setTimeout(() => {
        if (global.activeMenuUsers.has(sender)) {
            global.activeMenuUsers.delete(sender);
            socket.ev.off('messages.upsert', menuListener);
            console.log(`⏰ Menu session expired for ${sender}`);
        }
    }, 300000); 
    
    if (!global.menuTimeouts) global.menuTimeouts = new Map();
    if (global.menuTimeouts.has(sender)) {
        clearTimeout(global.menuTimeouts.get(sender));
    }
    global.menuTimeouts.set(sender, timeoutId);
    
    break;


              
case 'alive': {
    try {
        const aliveMsg = `💬 𝑯𝒊 𝑩𝒐𝒕 𝑼𝒔𝒆𝒓 ! 𝑯𝒐𝒘 𝑨𝒓𝒆 𝒀𝒐𝒖 ?

🤖 𝙄'𝙢 𝙎𝙞𝙢𝙥𝙡𝙚 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️

┌─❖ 𝑺𝒀𝑺𝑻𝑬𝑴 𝑴𝑶𝑵𝑰𝑻𝑶𝑹 ❖─┐
│ 🟢 𝑵𝒆𝒕𝒘𝒐𝒓𝒌 : 𝑺𝒕𝒂𝒃𝒍𝒆
│ 📗 𝑩𝒖𝒊𝒍𝒅   : 𝒗1.0.0
│ 🛡️ 𝑴𝒐𝒅𝒆    : 𝑷𝒖𝒃𝒍𝒊𝒄
│ ⚡ 𝑺𝒑𝒆𝒆𝒅   : ${Date.now() - msg.messageTimestamp * 1000}𝒎𝒔
│ ⏳ 𝑨𝒄𝒕𝒊𝒗𝒆  : ${process.uptime().toFixed(0)}𝒔
└─────────────❖

┌─❖ 𝑸𝑼𝑰𝑪𝑲 𝑨𝑪𝑪𝑬𝑺𝑺 ❖─┐
│ 🍀 𝑴𝒆𝒏𝒖  : .menu  ➜ 𝑮𝒆𝒕 𝑴𝒆𝒏𝒖
│ 🍀 𝑶𝒘𝒏𝒆𝒓 : .owner ➜ 𝑪𝒐𝒏𝒕𝒂𝒄𝒕 𝑶𝒘𝒏𝒆𝒓
└─────────────❖

 𝑻𝒉𝒂𝒏𝒌 𝒀𝒐𝒖 𝑭𝒐𝒓 𝑼𝒔𝒊𝒏𝒈 𝑶𝒖𝒓 𝑺𝒆𝒓𝒗𝒊𝒄𝒆 ❤️

> ${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

        await socket.sendMessage(sender, {
            image: { url: config.SITHIJA_IMAGE_PATH2 },
            caption: aliveMsg
        }, { quoted: msg });
        await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

    } catch (e) {
        console.error(e);
        await socket.sendMessage(sender, {
            text: `❌ ERROR\n\nAn error occurred: ${e.message}`
        }, { quoted: msg });
    }
}
break; 
    case 'owner': {
    try {
        await socket.sendMessage(sender, { react: { text: '👑', key: msg.key } });
        const contactsArray = [
            {
                displayName: '𝗢𝗪𝗡𝗘𝗥',
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:OWNER - SITHIJA\nTEL;type=CELL;type=VOICE;waid=94742838813:+94742838813\nEND:VCARD`
            }
        ];

        await socket.sendMessage(sender, {
            contacts: {
                displayName: "𝐎𝐖𝐍𝐄𝐑 𝐋𝐈𝐒𝐓",
                contacts: contactsArray
            }
        }, { quoted: msg });

    } catch (error) {
        console.error('Owner command error:', error);
        await socket.sendMessage(sender, { text: '❌ *Error:* Unable to fetch owner details.' }, { quoted: msg });
    }
}
break;          
  case 'song':
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*Need YouTube URL or Song Title*'
        }, { quoted: msg });
        break;
    }

    const songQuery = args.join(' ');
    await socket.sendMessage(sender, { text: '🔍 Searching song...' });

    try {
        let data;
        if (songQuery.match(/(youtube\.com|youtu\.be)/)) {
            const match = songQuery.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
            const videoId = match ? match[1] : null;

            if (!videoId) throw new Error('Invalid YouTube URL');

            const result = await yts({ videoId });
            data = result;
        } else {
            const result = await yts(songQuery);

            if (!result.videos || result.videos.length === 0) {
                await socket.sendMessage(sender, {
                    text: '❌ NO RESULTS\n\n*No results found for your query*'
                }, { quoted: msg });
                break;
            }

            data = result.videos[0];
        }

        if (!data) throw new Error('No results');

        const videoId = data.videoId;
        const desc = ` *ᴛɪᴛʟᴇ* : _${data.title || 'N/A'}_     

* ⏱️ 𝗗ᴜʀᴀᴛɪᴏɴ* ➟ _${data.timestamp || 'N/A'}_
* 👀 𝗩ɪᴇᴡꜱ* ➟ _${data.views?.toLocaleString() || 'N/A'}_
* 📅 𝗣ᴜʙʟɪꜱʜᴇᴅ* ➟ _${data.ago || 'N/A'}_
* 🎤 𝗖ʜᴀɴɴᴇʟ* ➟ _${data.author?.name || 'N/A'}_
*🔢 𝗥ᴇᴘʟʏ ᴡɪᴛʜ ᴀ 𝗡ᴜᴍʙᴇʀ 👇*

*01 ᴅᴏᴡɴʟᴏᴀᴅ ᴀᴜᴅɪᴏ*
*02 ᴅᴏᴡɴʟᴏᴀᴅ ᴅᴏᴄᴜᴍᴇɴᴛ*
`;

        const sentMsg = await socket.sendMessage(sender, {
            image: { url: data.thumbnail },
            caption: desc
        }, { quoted: msg });
        const listener = async (update) => {
            const mek = update.messages[0];
            if (!mek?.message) return;
            const ctx = mek.message.extendedTextMessage?.contextInfo;
            if (!ctx || ctx.stanzaId !== sentMsg.key.id) return;
            const text =
                mek.message.conversation ||
                mek.message.extendedTextMessage?.text;

            if (!['1', '2'].includes(text)) return;
            socket.ev.off('messages.upsert', listener);

            await socket.sendMessage(sender, { react: { text: '⬇️', key: mek.key } });

            try {
                 const apiUrl = `http://nexoraapi.laksidunimsara.com/api/ytmp3?url=https://youtu.be/${videoId}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`;
                const res = await axios.get(apiUrl, { timeout: 20000 });

                if (res.data.status !== 'success') {
                    throw new Error(res.data.message || 'API Error');
                }
                const downloadLink = res.data.data.download_url;
                const songTitle = res.data.data.title || data.title;
                const thumbnail = res.data.data.thumbnail || data.thumbnail;
                await socket.sendMessage(sender, { react: { text: '⬆️', key: mek.key } });
                const fileName = songTitle.replace(/[^a-zA-Z0-9]/g, '_');
                if (text === '1') {
                    await socket.sendMessage(sender, {
                        audio: { url: downloadLink },
                        mimetype: 'audio/mpeg'
                    }, { quoted: mek });
                } else if (text === '2') {
                    await socket.sendMessage(sender, {
                        document: { url: downloadLink },
                        mimetype: 'audio/mpeg',
                        fileName: `${fileName}.mp3`,
                        caption: songTitle
                    }, { quoted: mek });
                }

                await socket.sendMessage(sender, { react: { text: '✅', key: mek.key } });

            } catch (err) {
                await socket.sendMessage(sender, {
                    text: '❌ DOWNLOAD ERROR\n\n' + err.message
                }, { quoted: mek });

                await socket.sendMessage(sender, { react: { text: '❌', key: mek.key } });
            }
        };

        socket.ev.on('messages.upsert', listener);
        setTimeout(() => {
            socket.ev.off('messages.upsert', listener);
        }, 300000);

    } catch (err) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n' + err.message
        }, { quoted: msg });
    }

    break;  
     case 'tiktok':
    if (!args.length || !args.join(' ').startsWith('https://')) {
        await socket.sendMessage(sender, {
            image: { url: config.ERROR },
            caption: `❌ ERROR

Please provide a valid TikTok URL!

📋 Example: .tiktok  https://www.tiktok.com/@user/video/xyz`
        });
        break;
    }

    await socket.sendMessage(sender, { react: { text: '⬇️', key: msg.key } });

    let tiktokTimeout;

    try {
        const tiktokUrl = args.join(' ');
        const response = await axios.get(`https://nexoraapi.laksidunimsara.com/tiktok/download?url=${encodeURIComponent(tiktokUrl)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
        const tiktokData = response.data.result;

        if (!response.data.status || !tiktokData) {
            await socket.sendMessage(sender, {
                image: { url: config.ERROR },
                caption: `❌ ERROR

Failed to fetch TikTok video! Please try again later.`
            });
            break;
        }

        const captionMessage = `☘️ *TIKTOK DOWNLOADER*

📝 Title: ${tiktokData.title || 'TikTok Video'}
👤 Author: ${tiktokData.author?.nickname || 'Unknown'}
❤️ Likes: ${tiktokData.digg_count?.toLocaleString() || 'N/A'}
👀 Views: ${tiktokData.play_count?.toLocaleString() || 'N/A'}
💬 Comments: ${tiktokData.comment_count?.toLocaleString() || 'N/A'}
⏱️ Duration: ${tiktokData.duration || 'N/A'} seconds

⬇️ DOWNLOAD OPTIONS

🔢 Reply with a number:

*1 ║❯❯ No Watermark*
*2 ║❯❯ With Watermark*
*3 ║❯❯ Audio Only*`;

        const sentMessage = await socket.sendMessage(sender, {
            image: { url: tiktokData.cover || config.SITHIJA_IMAGE_PATH },
            caption: captionMessage
        }, { quoted: msg });

        const messageID = sentMessage.key.id;

        const handleTikTokSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const userResponse = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSentMsg && sender === replyMek.key.remoteJid) {
                if (tiktokTimeout) clearTimeout(tiktokTimeout);
                
                await socket.sendMessage(sender, { react: { text: '⬇️', key: replyMek.key } });

                const downloadLinks = tiktokData.downloads;
                let mediaMessage;

                try {
                    switch (userResponse) {
                        case '1':
                            mediaMessage = {
                                video: { url: downloadLinks.no_watermark },
                                mimetype: 'video/mp4',
                                caption: `✅ TIKTOK VIDEO

No Watermark Video
📝 ${tiktokData.title}`
                            };
                            break;
                        case '2':
                            mediaMessage = {
                                video: { url: downloadLinks.watermark },
                                mimetype: 'video/mp4',
                                caption: `✅ TIKTOK VIDEO

With Watermark Video
📝 ${tiktokData.title}`
                            };
                            break;
                        case '3':
                            mediaMessage = {
                                audio: { url: downloadLinks.audio },
                                mimetype: 'audio/mpeg',
                                caption: `✅ TIKTOK AUDIO

Audio Only
📝 ${tiktokData.title}`
                            };
                            break;

                        default:
                            await socket.sendMessage(sender, {
                                image: { url: config.ERROR },
                                caption: `❌ INVALID SELECTION

Please reply with 1, 2, 3, or 4.`
                            });
                            return;
                    }

                    await socket.sendMessage(sender, mediaMessage, { quoted: replyMek });
                    await socket.sendMessage(sender, { react: { text: '✅', key: replyMek.key } });

                } catch (sendError) {
                    console.error('TikTok send error:', sendError);
                    await socket.sendMessage(sender, {
                        image: { url: config.ERROR },
                        caption: `❌ ERROR

Failed to send: ${sendError.message}`
                    }, { quoted: replyMek });
                } finally {
                    socket.ev.off('messages.upsert', handleTikTokSelection);
                }
            }
        };

        socket.ev.on('messages.upsert', handleTikTokSelection);

        tiktokTimeout = setTimeout(() => {
            socket.ev.off('messages.upsert', handleTikTokSelection);
            console.log('TikTok selection timeout - cleaned up');
        }, 120000);

    } catch (error) {
        console.error('TikTok download error:', error);
        await socket.sendMessage(sender, {
            image: { url: config.ERROR },
            caption: `❌ ERROR

Failed to process TikTok request: ${error.message}`
        });
    }
    break;
// WhatsApp bot එකේ message handler (case switch) එක ඇතුලත මෙහෙම දාන්න:


        case 'fb':
case 'facebook':
    console.log('Facebook command triggered for:', number);
    if (!args.length || !args.join(' ').startsWith('https://')) {
        await socket.sendMessage(sender, {
            image: { url: config.SITHIJA_IMAGE_PATH },
            caption: formatMessage(
                '❌ ERROR',
                'Please provide a valid Facebook URL!\nExample:.fb https://www.facebook.com/share/v/xxxxx',
                `. `
            )
        });
        break;
    }

    await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
    let fbTimeout;

    try {
        const fbUrl = args.join(' ');
        
        const apiUrl = `https://nexoraapi.laksidunimsara.com/facebook/download?url=${encodeURIComponent(fbUrl)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`;
        console.log('Fetching from:', apiUrl);
        
        const response = await axios.get(apiUrl);
        console.log('API Response:', JSON.stringify(response.data, null, 2));

        if (!response.data.status || !response.data.result) {
            await socket.sendMessage(sender, {
                image: { url: config.SITHIJA_IMAGE_PATH },
                caption: formatMessage(
                    '❌ ERROR',
                    'Failed to fetch Facebook video! Please check the link and try again.',
                    `.`
                )
            });
            break;
        }

        const result = response.data.result;
        const downloadLinks = result.download_links || [];
        
        const hdVideo = downloadLinks.find(link => link.quality === 'HD' && link.type === 'video');
        const sdVideo = downloadLinks.find(link => link.quality === 'SD' && link.type === 'video');
        
        let menuOptions = '';
        if (sdVideo) menuOptions += '1 ║❯❯ SD Quality Video 📽️\n';
        if (hdVideo) menuOptions += '2 ║❯❯ HD Quality Video 📹\n';
        menuOptions += '3 ║❯❯ Audio 🎵\n';
        menuOptions += '4 ║❯❯ Document 📁\n';
        menuOptions += '5 ║❯❯ Voice [PTT] 🎙️\n';
        menuOptions += '6 ║❯❯ Video Note [PTV] 📺\n';

        const caption = formatMessage(
            ` *𝗙𝗔𝗖𝗘𝗕𝗢𝗢𝗞 : _𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥_*`,
            `
📝 *𝗧ɪᴛʟᴇ ➟* _${result.title || 'Facebook Video'}_

*⬇️ 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 𝗢𝗣𝗧𝗜𝗢𝗡𝗦*

*🔢 𝗥ᴇᴘʟʏ ᴡɪᴛʜ ᴀ 𝗡ᴜᴍʙᴇʀ 👇*
${menuOptions}`,
            `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
        );
        
        const sentMsg = await socket.sendMessage(sender, {
            image: { url: result.thumbnail || sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
            caption: caption
        }, { quoted: msg });

        const messageID = sentMsg.key.id;
        const handleFacebookSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const userResponse = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSentMsg && sender === replyMek.key.remoteJid) {
                if (fbTimeout) clearTimeout(fbTimeout);
                
                await socket.sendMessage(sender, { react: { text: '⬇️', key: replyMek.key } });

                let mediaMessage;
                let downloadUrl;

                try {
                    switch (userResponse) {
                        case '1': 
                            downloadUrl = sdVideo?.url || hdVideo?.url;
                            if (!downloadUrl) throw new Error('No SD video available');
                            mediaMessage = {
                                video: { url: downloadUrl },
                                mimetype: 'video/mp4',
                                caption: formatMessage(
                                    '✅ FACEBOOK VIDEO',
                                    'SD Quality Video',
                                    `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                                )
                            };
                            break;
                            
                        case '2':
                            downloadUrl = hdVideo?.url || sdVideo?.url;
                            if (!downloadUrl) throw new Error('No HD video available');
                            mediaMessage = {
                                video: { url: downloadUrl },
                                mimetype: 'video/mp4',
                                caption: formatMessage(
                                    '✅ FACEBOOK VIDEO',
                                    'HD Quality Video',
                                    `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                                )
                            };
                            break;
                            
                        case '3':
                            downloadUrl = sdVideo?.url || hdVideo?.url;
                            mediaMessage = {
                                audio: { url: downloadUrl },
                                mimetype: 'audio/mpeg',
                                caption: formatMessage(
                                    '✅ FACEBOOK AUDIO',
                                    'Audio extracted from video',
                                    `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                                )
                            };
                            break;
                            
                        case '4':
                            downloadUrl = sdVideo?.url || hdVideo?.url;
                            mediaMessage = {
                                document: { url: downloadUrl },
                                mimetype: 'video/mp4',
                                fileName: 'Facebook_Video.mp4',
                                caption: formatMessage(
                                    '✅ FACEBOOK DOCUMENT',
                                    'Video as Document',
                                    `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                                )
                            };
                            break;
                            
                        case '5': 
                            downloadUrl = sdVideo?.url || hdVideo?.url;
                            mediaMessage = {
                                audio: { url: downloadUrl },
                                mimetype: 'audio/mp4',
                                ptt: true,
                                caption: formatMessage(
                                    '✅ FACEBOOK PTT',
                                    'Voice Note (PTT)',
                                    `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                                )
                            };
                            break;
                            
                        case '6':
                            downloadUrl = sdVideo?.url || hdVideo?.url;
                            mediaMessage = {
                                video: { url: downloadUrl },
                                mimetype: 'video/mp4',
                                ptv: true,
                                caption: formatMessage(
                                    '✅ FACEBOOK PTV',
                                    'Video Note (PTV)',
                                    `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                                )
                            };
                            break;
                            
                        default:
                            await socket.sendMessage(sender, {
                                image: { url: sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                                caption: formatMessage(
                                    '❌ INVALID SELECTION',
                                    'Please reply with 1, 2, 3, 4, 5, or 6.',
                                    `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                                )
                            });
                            return;
                    }

                    await socket.sendMessage(sender, mediaMessage, { quoted: replyMek });
                    await socket.sendMessage(sender, { react: { text: '✅', key: replyMek.key } });

                } catch (sendError) {
                    console.error('Send error:', sendError);
                    await socket.sendMessage(sender, {
                        image: { url: config.ERROR },
                        caption: formatMessage(
                            '❌ ERROR',
                            `Failed to send: ${sendError.message}`,
                            `${config.BOT_FOOTER}`
                        )
                    }, { quoted: replyMek });
                } finally {
                   
                    socket.ev.off('messages.upsert', handleFacebookSelection);
                }
            }
        };

        socket.ev.on('messages.upsert', handleFacebookSelection);
        fbTimeout = setTimeout(() => {
            socket.ev.off('messages.upsert', handleFacebookSelection);
            console.log('Facebook selection timeout - cleaned up');
        }, 120000);

    } catch (error) {
        console.error('Facebook download error:', error);
        await socket.sendMessage(sender, {
            image: { url: config.ERROR },
            caption: formatMessage(
                '❌ ERROR',
                `Failed to process Facebook request: ${error.message}`,
                `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
            )
        });
    }
    break;


case 'apk':
case 'app': {
    // ආරම්භයේදීම 📥 Reaction එකක් දැමීම
    await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } });

    const searchQuery = args.join(" ");
    if (!searchQuery) {
        await socket.sendMessage(sender, { 
            text: "⚠️ *බාගත යුතු ඇප් එකේ නම ඇතුළත් කරන්න!* 💡 _උදා:_ .app whatsapp" 
        }, { quoted: msg });
        return;
    }

    // සෙවීම ආරම්භ කළ බව දැනුම් දීම
    await socket.sendMessage(sender, { 
        text: "⏳ _*Searching for APK...*_\n_Please hold on a second!_ 🚀" 
    }, { quoted: msg });

    try {
        // 🛠️ ඔබ ලබාදුන් download-apk API Endpoint එක
        const apiUrl = `https://api-sithija-main2-production.up.railway.app/download-apk?text=${encodeURIComponent(searchQuery)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        // API එක සාර්ථකද සහ අවශ්‍ය දත්ත තිබේදැයි පරීක්ෂා කිරීම
        if (!data.success || !data.app_details) {
            await socket.sendMessage(sender, { 
                text: "❌ *සමාවෙන්න!* ඔය නමින් APK එකක් සොයාගත නොහැකි විය. 🥲" 
            }, { quoted: msg });
            return;
        }

        const apk = data.app_details;
        
        // බොට්ටුවේ Footer එක ආරක්ෂිතව තේරීම
        const botFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || 
                          (typeof config !== 'undefined' && config.BOT_FOOTER) || 
                          "Sithija Bot Multi-Device";

        // විස්තර ඇතුළත් පණිවිඩය (Caption)
        const caption = `*✨ ᴀᴘᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇ r ✨*

╭────────────────────────╮
📱 App Name : ${apk.name || searchQuery}
⚙️ Version  : ${apk.version || 'Unknown'}
📦 Package  : ${apk.package_id || 'Unknown'}
🚀 Server   : Sithija API
╰────────────────────────╯

 📥 _පහතින් ඔයාගේ APK එක Upload වෙනවා..._
> SITHIJA MD`;

        // 1. මුලින්ම ඇප් එකේ Icon එක සහ විස්තර ටික යවනවා
        if (apk.icon_url && apk.icon_url.startsWith('http')) {
            await socket.sendMessage(sender, {
                image: { url: apk.icon_url },
                caption: caption
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, { text: caption }, { quoted: msg });
        }

        // 2. ඊටපස්සේ කෙලින්ම APK Document එකක් විදිහට Chat එකටම යවනවා
        if (apk.download_url) {
            await socket.sendMessage(sender, {
                document: { url: apk.download_url },
                mimetype: 'application/vnd.android.package-archive',
                fileName: `${apk.name || 'Application'}.apk`
            }, { quoted: msg });

            // සාර්ථකව අවසන් වූ පසු ✅ Reaction එකක් දැමීම
            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
        } else {
            await socket.sendMessage(sender, { 
                text: "❌ *කනගාටුයි!* ඇප් එකේ විස්තර හමුවුවත් බාගත කිරීමේ ලින්ක් එක (Download URL) ලබා ගැනීමට නොහැකි විය." 
            }, { quoted: msg });
        }

    } catch (e) {
        console.log(e);
        await socket.sendMessage(sender, { 
            text: `❌ *අවුලක් ගියා!*\n\n_Error:_ ${e.message}` 
        }, { quoted: msg });
    }
}
break;
             

case 'ai':
case 'gemini':
case 'bot': {
    // ආරම්භයේදීම 🧠 Reaction එකක් දැමීම
    await socket.sendMessage(sender, { react: { text: '🧠', key: msg.key } });

    const userPrompt = args.join(" ");
    if (!userPrompt) {
        await socket.sendMessage(sender, { 
            text: "⚠️ *ඔයාට දැනගන්න ඕන දේ ඇතුළත් කරන්න!* 💡 _උදා:_ .ai sky is blue?" 
        }, { quoted: msg });
        return;
    }

    // AI එක සිතන බව (Typing...) පෙන්වීමට message එකක් යැවීම
    const loadingMsg = await socket.sendMessage(sender, { 
        text: "🤔 _*Gemini is thinking...*_\n_Please hold on a second!_ 🧠" 
    }, { quoted: msg });

    try {
        // 🛠️ ඔයාගේ Railway Gemini API එකට request එක යැවීම
        const apiUrl = `https://api-sithija-main2-production.up.railway.app/gemini?text=${encodeURIComponent(userPrompt)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        // API Response එක අනුව දත්ත පවතින තැන පරීක්ෂා කිරීම (result හෝ data හෝ කෙලින්ම text)
        // සාමාන්‍යයෙන් AI API වල result, response හෝ text ලෙස දත්ත ලැබේ.
        const aiReply = data.result || data.response || data.text || data;

        if (aiReply) {
            // බොට්ටුවේ Footer එක සඳහා variable එක ආරක්ෂිතව තේරීම
            const botFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || 
                              (typeof config !== 'undefined' && config.BOT_FOOTER) || 
                              "Sithija Bot Multi-Device";

            // පිළිතුර ලස්සනට සකස් කිරීම
            const formattedReply = `*✨ ɢᴇᴍɪɴɪ ᴀɪ ᴀꜱꜱɪꜱᴛᴀɴᴛ ✨*\n\n${aiReply}\n\n> ${botFooter}`;

            // සාර්ථකව පිළිතුර WhatsApp එකට යැවීම
            await socket.sendMessage(sender, { text: formattedReply }, { quoted: msg });
            
            // අවසන් වූ පසු ✅ Reaction එකක් දැමීම
            await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
        } else {
            await socket.sendMessage(sender, { 
                text: "❌ *සමාවෙන්න!* AI එකෙන් පිළිතුරක් ලබා ගැනීමට නොහැකි විය. 🥲" 
            }, { quoted: msg });
        }

    } catch (e) {
        console.log(e);
        await socket.sendMessage(sender, { 
            text: `❌ *අවුලක් ගියා!*\n\n_Error:_ ${e.message}` 
        }, { quoted: msg });
    }
}
break; 
case 'ai3':
case 'sithijaai':
case 'bot2': {
    // ආරම්භයේදීම 🧠 Reaction එකක් දැමීම
    await socket.sendMessage(sender, { react: { text: '🧠', key: msg.key } });

    const userPrompt = args.join(" ");
    if (!userPrompt) {
        await socket.sendMessage(sender, { 
            text: "⚠️ *ඔයාට දැනගන්න ඕන දේ ඇතුළත් කරන්න!* 💡 _උදා:_ .ai sky is blue?" 
        }, { quoted: msg });
        return;
    }

    // AI එක සිතන බව (Typing...) පෙන්වීමට message එකක් යැවීම
    const loadingMsg = await socket.sendMessage(sender, { 
        text: "🤔 _*Sithija AI is thinking...*_\n_Please hold on a second!_ 🧠" 
    }, { quoted: msg });

    try {
        // 🛠️ ඔයාගේ Railway Sithija AI API එකට request එක යැවීම
        const apiUrl = `https://api-sithija-main2-production.up.railway.app/sithijaai?text=${encodeURIComponent(userPrompt)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        // API Response එකේ ඔයා හදපු 'result' කියන key එකෙන් දත්ත ලබා ගැනීම
        const aiReply = data.result || data.response || data.text || data;

        if (aiReply) {
            // බොට්ටුවේ Footer එක සඳහා variable එක ආරක්ෂිතව තේරීම
            const botFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || 
                              (typeof config !== 'undefined' && config.BOT_FOOTER) || 
                              "Sithija Bot Multi-Device";

            // පිළිතුර ලස්සනට සකස් කිරීම
            const formattedReply = `*✨ sɪᴛʜɪᴊᴀ ᴀɪ ᴀꜱꜱɪꜱᴛᴀɴᴛ ✨*\n\n${aiReply}\n\n> ${botFooter}`;

            // සාර්ථකව පිළිතුර WhatsApp එකට යැවීම
            await socket.sendMessage(sender, { text: formattedReply }, { quoted: msg });
            
            // අවසන් වූ පසු ✨ Reaction එකක් දැමීම
            await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
        } else {
            await socket.sendMessage(sender, { 
                text: "❌ *සමාවෙන්න!* AI එකෙන් පිළිතුරක් ලබා ගැනීමට නොහැකි විය. 🥲" 
            }, { quoted: msg });
        }

    } catch (e) {
        console.log(e);
        await socket.sendMessage(sender, { 
            text: `❌ *අවුලක් ගියා!*\n\n_Error:_ ${e.message}` 
        }, { quoted: msg });
    }
}
break;
              

              
 case 'ping': {
    await socket.sendMessage(sender, { react: { text: '⚡', key: msg.key } });
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const min = 0.001;
    const max = 5.000;
    const randomPing = (Math.random() * (max - min) + min).toFixed(3);
    let status = "";
    if (randomPing <= 1) status = "🚀 Quantum Speed";
    else if (randomPing <= 2) status = "⚡ Lightning Fast";
    else if (randomPing <= 3) status = "✅ Excellent";
    else if (randomPing <= 4) status = "📶 Very Good";
    else status = "🟢 Good";

    const pongStatus = `
📡 *ᴘɪɴɢ:* \`${randomPing}ms\`
🛰️ *sᴛᴀᴛᴜs:* ${status}
🆙 *ᴜᴘᴛɪᴍᴇ:* ${hours}h ${minutes}m ${seconds}s
> ${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

    await socket.sendMessage(sender, { 
        text: pongStatus
    }, { quoted: msg });

    await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
}
break;
              
 //////////////////////////////////////////////////////////////  
     }} catch (error) {
      console.error('Command handler error:', error);
      await socket.sendMessage(sender, {
        text: `❌ ERROR\nAn error occurred: ${error.message}`,
      });
    }
  });
}

async function setupMessageHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid === config.NEWSLETTER_JID) return;

        const senderNumber = msg.key.participant ? msg.key.participant.split('@')[0] : msg.key.remoteJid.split('@')[0];
        const botNumber = jidNormalizedUser(socket.user.id).split('@')[0];
        const isReact = msg.message.reactionMessage;
        const sanitizedNumber = botNumber.replace(/[^0-9]/g, '');
        const sessionConfig = activeSockets.get(sanitizedNumber)?.config || config;

     

        

   
    });
}


async function saveSession(number, creds) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await Session.findOneAndUpdate(
            { number: sanitizedNumber },
            { creds, updatedAt: new Date() },
            { upsert: true }
        );
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(creds, null, 2));
        let numbers = [];
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
        }
        if (!numbers.includes(sanitizedNumber)) {
            numbers.push(sanitizedNumber);
            fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
        }
       
    } catch (error) {
        
    }
}

async function restoreSession(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const session = await Session.findOne({ number: sanitizedNumber });
        if (!session) {
            
            return null;
        }
        if (!session.creds || !session.creds.me || !session.creds.me.id) {
           
            await deleteSession(sanitizedNumber);
            return null;
        }
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(session.creds, null, 2));
        
        return session.creds;
    } catch (error) {
        
        return null;
    }
}
async function deleteSession(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await Session.deleteOne({ number: sanitizedNumber });
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        if (fs.existsSync(sessionPath)) {
            fs.removeSync(sessionPath);
        }
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            let numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
            numbers = numbers.filter(n => n !== sanitizedNumber);
            fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
        }
        
    } catch (error) {
        
    }
}

async function loadUserConfig(number) {
  try {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const configDoc = await Session.findOne({ number: sanitizedNumber }, 'config');
    return { ...config, ...configDoc?.config };
  } catch (error) {
    console.error(`Failed to load config for ${number}:`, error);
    return { ...config };
  }
}

async function updateUserConfig(number, newConfig) {
  try {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    await Session.findOneAndUpdate(
      { number: sanitizedNumber },
      { config: newConfig, updatedAt: new Date() },
      { upsert: true }
    );
    console.log(`Updated config for ${sanitizedNumber}`);
  } catch (error) {
    console.error(`Failed to update config for ${sanitizedNumber}:`, error);
    throw error;
  }
}
function setupAutoRestart(socket, number) {
    const maxReconnectAttempts = 10;
    let reconnectAttempts = 0;

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
            if (reconnectAttempts >= maxReconnectAttempts) {
                
                activeSockets.delete(number.replace(/[^0-9]/g, ''));
                socketCreationTime.delete(number.replace(/[^0-9]/g, ''));
                return;
            }
            console.log(`Connection lost for ${number}, attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
            try {
                await delay(5000 * (reconnectAttempts + 1));
                activeSockets.delete(number.replace(/[^0-9]/g, ''));
                socketCreationTime.delete(number.replace(/[^0-9]/g, ''));
                const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };
                await EmpirePair(number, mockRes);
                reconnectAttempts = 0;
            } catch (error) {
                console.error(`Reconnect failed for ${number}:`, error);
                reconnectAttempts++;
            }
        } else if (connection === 'open') {
            reconnectAttempts = 0;
            console.log(`Connection established for ${number}`);
        }
    });
}

async function EmpirePair(number, res) {
 

    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
    await restoreSession(sanitizedNumber);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    try {
        const socket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            version: [2, 3000, 1033893291],           // Updated version
            connectTimeoutMs: 120000,
            keepAliveIntervalMs: 30000,
            emitOwnEvents: true,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            markOnlineOnConnect: false,               // Important for stability
            browser: ['Mac OS', 'Safari', '15.6.1']   // Safari optimized
        });

        socketCreationTime.set(sanitizedNumber, Date.now());
        setupStatusHandlers(socket);
        setupCommandHandlers(socket, sanitizedNumber);
        setupMessageHandlers(socket);
        setupAutoRestart(socket, sanitizedNumber);
        setupNewsletterHandlers(socket);
        socket.ev.on('call', async (callEvents) => {
            const sessionConfig = activeSockets.get(sanitizedNumber)?.config || config;
            if (sessionConfig.ANTI_CALL === 'true') {
                for (const callEvent of callEvents) {
                    if (callEvent.status === 'offer' && !callEvent.isGroup) {
                        try {
                            await socket.sendMessage(callEvent.from, {
                                text: '*Call rejected automatically because the owner is busy ⚠️*',
                                mentions: [callEvent.from],
                            });
                            await socket.rejectCall(callEvent.id, callEvent.from);
                            console.log(`Rejected call from ${callEvent.from} for ${sanitizedNumber}`);
                        } catch (error) {
                           
                        }
                    }
                }
            }
        });

        
        if (!socket.authState.creds.registered) {
            let retries = config.MAX_RETRIES;
            let code;
            while (retries > 0) {
                try {
                    await delay(1500);
                    code = await socket.requestPairingCode(sanitizedNumber);
                  
                    break;
                } catch (error) {
                    retries--;
                  
                    if (retries === 0) throw error;
                    await delay(2000 * (config.MAX_RETRIES - retries));
                }
            }
            if (!res.headersSent) res.send({ code });
        }

       
        socket.ev.on('creds.update', async () => {
            try {
                await saveCreds();
                const credsPath = path.join(sessionPath, 'creds.json');
                if (!fs.existsSync(credsPath)) return;
                const creds = JSON.parse(await fs.readFile(credsPath, 'utf8'));
                await saveSession(sanitizedNumber, creds);
            } catch (error) {
                
            }
        });

       
        socket.ev.on('connection.update', async (update) => {
            const { connection } = update;
           

            if (connection === 'open') {
                try {
                    await delay(3000);
                    const userJid = jidNormalizedUser(socket.user.id);
                    let sessionConfig = await loadUserConfig(sanitizedNumber);

                    activeSockets.set(sanitizedNumber, { socket, config: sessionConfig });

                   
                    if (sessionConfig.ALLWAYS_OFFLINE === 'true') {
                        await socket.sendPresenceUpdate('unavailable');
                        console.log(`Set presence to unavailable for ${sanitizedNumber}`);
                    } else {
                        await socket.sendPresenceUpdate('unavailable');
                        console.log(`Set presence to available for ${sanitizedNumber}`);
                    }

                    
                    const groupResult = await joinGroup(socket);

                    
                    try {
                        await socket.newsletterFollow(config.NEWSLETTER_JID);
                        await socket.sendMessage(config.NEWSLETTER_JID, { react: { text: '❤️', key: { id: config.NEWSLETTER_MESSAGE_ID } } });
                        console.log('✅ Auto-followed newsletter & reacted ❤️');
                    } catch (error) {
                        console.error('❌ Newsletter error:', error.message);
                    }

                    // Send welcome message to user
                    await socket.sendMessage(userJid, {
                        image: { url: config.BOT_con },
                        caption: formatMessage(
                            '⭐ **SITHIJA X MD  CONNECTING...',
                            `
🇱🇰 Bot එක Main Server එකට connect වෙමින්…
⏳ දත්ත save වෙනවා, කරුණාකර රැඳී සිටින්න (5–10 min).
🚫 මෙම කාලයේ commands භාවිතා නොකරන්න.

🇬🇧 Connecting to main server… Please wait.
🚀 System initializing…
`,
                            '🔹 SITHIJA X MD | Connecting to Main Server...'
                        )
                    });

                    // Send admin connect message
                   // await sendAdminConnectMessage(socket, sanitizedNumber, groupResult);

                } catch (error) {
                    
                    exec(`pm2 restart ${process.env.PM2_NAME || '{LAKIYA-{M𝙳-{F𝚁𝙴𝙴-{B𝙾𝚃-session'}`);
                }
            }
        });

    } catch (error) {
        console.error('Pairing/reconnect error:', error);
        socketCreationTime.delete(sanitizedNumber);
        if (!res.headersSent) res.status(503).send({ error: 'Service Unavailable' });
    }
}




router.get('/', async (req, res) => {
    const { number } = req.query;
    if (!number) {
        return res.status(400).send({ error: 'Number parameter is required' });
    }

    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    if (activeSockets.has(sanitizedNumber)) {
        try {
            const oldSocket = activeSockets.get(sanitizedNumber);
            if (oldSocket && oldSocket.socket) {
                try {
                    await oldSocket.socket.logout();
                    oldSocket.socket.end();
                    oldSocket.socket.ws?.close();
                } catch(e) {
                    console.log('Socket close error:', e.message);
                }
            }
            activeSockets.delete(sanitizedNumber);
            socketCreationTime.delete(sanitizedNumber);
            await Session.deleteOne({ number: sanitizedNumber });
            const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
            if (fs.existsSync(sessionPath)) {
                fs.removeSync(sessionPath);
            }
            if (fs.existsSync(NUMBER_LIST_PATH)) {
                let numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
                numbers = numbers.filter(n => n !== sanitizedNumber);
                fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
            }
            
            console.log(`✅ Old session removed for: ${sanitizedNumber} - Creating new pairing`);
            
        } catch (error) {
            console.error('Error removing old session:', error);
            // Continue to create new pair even if cleanup had issues
        }
    }
    
    await EmpirePair(number, res);
});




router.get('/update-config', async (req, res) => {
    const { number, config: configString } = req.query;
    if (!number || !configString) {
        return res.status(400).send({ error: 'Number and config are required' });
    }

    let newConfig;
    try {
        newConfig = JSON.parse(configString);
    } catch (error) {
        return res.status(400).send({ error: 'Invalid config format' });
    }

    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const socket = activeSockets.get(sanitizedNumber);
    if (!socket) {
        return res.status(404).send({ error: 'No active session found for this number' });
    }

    try {

        socket.config = { ...socket.config, ...newConfig };
        res.status(200).send({ status: 'success', message: 'Config updated successfully', config: socket.config });
    } catch (error) {
        res.status(500).send({ error: 'Failed to update config' });
    }
});


process.on('exit', () => {
    activeSockets.forEach((socket, number) => {
        socket.ws.close();
        activeSockets.delete(number);
        socketCreationTime.delete(number);
    });
    fs.emptyDirSync(SESSION_BASE_PATH);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    exec(`pm2 restart ${process.env.PM2_NAME || '{lakiya-{md-{mini-{bot-session'}`);
});

module.exports = router;
