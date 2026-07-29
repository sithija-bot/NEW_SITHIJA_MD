
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
    API_MAIN_URL: 'http://nexoraapi.laksidunimsara.com',
    AUTO_RECORDING: 'false',
    AUTO_TYPING: 'false',
    AUTO_REACT: 'false',
    AUTO_REPLY_STATUS: 'false',
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
   
    MODE: 'public', 
    MAX_RETRIES: 3,
    
    ADMIN_LIST_PATH: './admin.json',
     GROUP_INVITE_LINK: 'https://chat.whatsapp.com/CkRdKcd9MytL3eG6xqW3Xl',
    NEWSLETTER_JID: '120363409031214331@newsletter',
    NEWSLETTER_MESSAGE_ID: '428',
    OTP_EXPIRY: 300000,
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029Vb802boCnA7yuebDCD0m/101'
   
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
        if (!message?.key || message.key.remoteJid !== config.NEWSLETTER_JID) return;

        try {
            const emojis = ['🧡', '💛', '💚', '💙', '💜'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            const messageId = message.newsletterServerId;

            if (!messageId) {
                console.warn('No valid newsletterServerId found:', message);
                return;
            }

            let retries = config.MAX_RETRIES;
            while (retries > 0) {
                try {
                    await socket.newsletterReactMessage(
                        config.NEWSLETTER_JID,
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

    if (!isCmd) return;

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
              case 'ktv':
    if (!args.length) {
        await socket.sendMessage(sender, {
             image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
            caption: formatMessage(
                '❌ ERROR',
                '*කරුණාකර ඩ්‍රාමා එකේ නම ලබාදෙන්න! උදා: .ktv love*',
                `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
            )
        }, { quoted: msg });
        break;
    }

    const ktvQuery = args.join(' ');
    await socket.sendMessage(sender, { text: '🎬 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙙𝙧𝙖𝙢𝙖𝙨 𝙤𝙣 𝙆𝙏𝙑...' });

    let ktvSelectionTimeout;
    let ktvEpisodeTimeout;

    try {
        const searchResponse = await axios.get(`${config.API_MAIN_URL}/dramakey/search?query=${encodeURIComponent(ktvQuery)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
        const searchData = searchResponse.data;

        if (!searchData.status || !searchData.results || searchData.results.length === 0) {
            await socket.sendMessage(sender, {
                 image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                caption: formatMessage(
                    '❌ NO RESULTS',
                    '*KTV එකේ ඩ්‍රාමා හමුවෙන්නේ නැත! 😞*',
                    `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                )
            }, { quoted: msg });
            break;
        }

        const uniqueResults = [];
        const seenLinks = new Set();
        for (const item of searchData.results) {
            if (!seenLinks.has(item.link)) {
                seenLinks.add(item.link);
                uniqueResults.push(item);
            }
        }
        
        const ktvResults = uniqueResults.slice(0, 250);
        let listText = `*𝗦𝗘𝗔𝗥𝗖𝗛 : _${ktvQuery}_*

*🔢 ʀᴇᴘʟʏ ʙᴇʟᴏᴡ ɴᴜᴍʙᴇʀ*
\n\n`;

        ktvResults.forEach((item, index) => {
            let dramaName = item.title;
            if (dramaName.includes('|')) {
                dramaName = dramaName.split('|')[0].trim();
            }
            listText += `*${index + 1} ║ ${dramaName}*\n`;
            if (item.description) {
                const shortDesc = item.description.substring(0, 60);
            } else {
                listText += `\n`;
            }
        });

        listText += `\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;
        
        const sentMsg = await socket.sendMessage(sender, {
            image:  { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
            caption: listText
        }, { quoted: msg });

        const messageID = sentMsg.key.id;
        const handleSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const messageType = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSentMsg && sender === replyMek.key.remoteJid) {
                if (ktvSelectionTimeout) clearTimeout(ktvSelectionTimeout);

                const choice = parseInt(messageType) - 1;
                if (isNaN(choice) || choice < 0 || choice >= ktvResults.length) {
                    await socket.sendMessage(sender, {
                         image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                        caption: formatMessage(
                            '❌ INVALID SELECTION',
                            `*වැරදි අංකයක්! 1-${ktvResults.length} අතර තෝරන්න! 😕*`,
                            `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                        )
                    }, { quoted: replyMek });
                    return;
                }

                const selectedItem = ktvResults[choice];
                
                await socket.sendMessage(sender, { 
                    text: '📽️ 𝙁𝙚𝙩𝙘𝙝𝙞𝙣𝙜 𝙙𝙧𝙖𝙢𝙖 𝙙𝙚𝙩𝙖𝙞𝙡𝙨...' 
                }, { quoted: replyMek });

                try {
                    const detailsResponse = await axios.get(`${config.API_MAIN_URL}/dramakey/info?url=${encodeURIComponent(selectedItem.link)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
                    const detailsData = detailsResponse.data;

                    if (!detailsData.status || !detailsData.drama) {
                        throw new Error('Failed to fetch details');
                    }

                    const dramaInfo = detailsData.drama;
                    
                    if (!dramaInfo.episodes || dramaInfo.episodes.length === 0) {
                        await socket.sendMessage(sender, {
                             image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                            caption: formatMessage(
                                '❌ NO EPISODES',
                                '*මෙම ඩ්‍රාමාව සඳහා කථාංග නොමැත!*',
                                `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                            )
                        }, { quoted: replyMek });
                        return;
                    }
                    const dramaName = selectedItem.title.split('|')[0].trim();
                    const synopsis = dramaInfo.synopsis || dramaInfo.description || selectedItem.description || 'No synopsis available.';
                    const fullDescription = synopsis.length > 500 ? synopsis.substring(0, 500) + '...' : synopsis;
                    
                    const status = dramaInfo.status || 'Ongoing';
                    const totalEpisodes = dramaInfo.totalEpisodes || dramaInfo.episodes.length;
                    const publishedDate = dramaInfo.publishedDate ? new Date(dramaInfo.publishedDate).toLocaleDateString() : 'N/A';
                    const author = dramaInfo.author || 'Unknown';
                    
                    const categories = dramaInfo.categories?.join(', ') || 'Drama';
                    const tags = dramaInfo.tags?.slice(0, 5).join(', ') || 'Asian Drama';
                    const detailsCaption = formatMessage(
                        ` ${dramaName}`, 
                       `*🎭 𝗚𝗲𝗻𝗿𝗲𝘀 / 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝗶𝗲𝘀 ➟* ${categories}
*📌 𝗦𝘁𝗮𝘁𝘂𝘀 ➟* ${status}
*🔢 𝗧𝗼𝘁𝗮𝗹 𝗘𝗽𝗶𝘀𝗼𝗱𝗲𝘀 ➟* ${totalEpisodes}
*📅 𝗣𝘂𝗯𝗹𝗶𝘀𝗵𝗲𝗱 ➟* ${publishedDate}
*✍️ 𝗔𝘂𝘁𝗵𝗼𝗿 / 𝗦𝗼𝘂𝗿𝗰𝗲 ➟* ${author}
*🏷️ 𝗧𝗮𝗴𝘀 ➟* ${tags}
`,
                        `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                    );

                    const posterUrl = dramaInfo.poster || selectedItem.poster || sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH;
                    

                    const infoMsg = await socket.sendMessage(sender, {
                        image: { url: posterUrl },
                        caption: detailsCaption
                    }, { quoted: replyMek });

                    const episodes = dramaInfo.episodes;
                    const displayEpisodes = episodes.slice(0, 2000);
                    
                    let episodeText = `*𝗘𝗣𝗜𝗦𝗢𝗗𝗘 𝗟𝗜𝗦𝗧*

*🔢 ʀᴇᴘʟʏ ʙᴇʟᴏᴡ ɴᴜᴍʙᴇʀ*

${displayEpisodes.map((ep, i) => `* ${ep.episode} ┃ ${ep.title || `Episode ${ep.episode}`}*`).join('\n')}

${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

                    const episodeMsg = await socket.sendMessage(sender, {
                        text: episodeText
                    }, { quoted: infoMsg });

                    const episodeMsgID = episodeMsg.key.id;
                    const downloadSingleEpisode = async (episodeData, episodeMek, progressText = '') => {
                        try {
                            const downloadResponse = await axios.get(`${config.API_MAIN_URL}/downloadwella/get-link?file_url=${encodeURIComponent(episodeData.downloadLink)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
                            const downloadData = downloadResponse.data;

                            if (downloadData.status !== 'success' || !downloadData.downloadLink) {
                                throw new Error('Failed to get download URL');
                            }

                            const fileName = downloadData.fileName || `${dramaName} - Episode ${episodeData.episode}.mp4`;
                            const fileSize = downloadData.fileSize || 'Unknown';
                            
                            await socket.sendMessage(sender, {
                                document: { url: downloadData.downloadLink },
                                mimetype: 'video/mp4',
                                fileName: fileName,
                                caption: formatMessage(
                                    `🍀 ${dramaName}`,
                                    ` *Episode:* ${episodeData.episode}\n *Size:* ${fileSize}\n${progressText}\n`,
                                    `${sessionConfig.MOVIE_FOOTER || config.MOVIE_FOOTER}`
                                )
                            }, { quoted: episodeMek });

                            return true;
                        } catch (error) {
                            console.error(`Download error for episode ${episodeData.episode}:`, error);
                            return false;
                        }
                    };
                    const handleEpisode = async ({ messages: episodeMessages }) => {
                        const episodeMek = episodeMessages[0];
                        if (!episodeMek?.message) return;

                        const userInput = episodeMek.message.conversation || episodeMek.message.extendedTextMessage?.text;
                        const isReplyToEpisodeMsg = episodeMek.message.extendedTextMessage?.contextInfo?.stanzaId === episodeMsgID;

                        if (isReplyToEpisodeMsg && sender === episodeMek.key.remoteJid) {
                            if (ktvEpisodeTimeout) clearTimeout(ktvEpisodeTimeout);
                            const selectedEpisode = parseInt(userInput);
                            const episodeData = episodes.find(ep => ep.episode === selectedEpisode);
                            
                            if (!episodeData) {
                                await socket.sendMessage(sender, {
                                     image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                                    caption: formatMessage(
                                        '❌ INVALID EPISODE',
                                        `*වැරදි කථාංග අංකයක්! 1-${episodes.length} අතර තෝරන්න.*`,
                                        `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                                    )
                                }, { quoted: episodeMek });
                                return;
                            }

                            await socket.sendMessage(sender, { 
                                text: `⏳ 𝙂𝙚𝙩𝙩𝙞𝙣𝙜 𝙙𝙤𝙬𝙣𝙡𝙤𝙖𝙙 𝙡𝙞𝙣𝙠 𝙛𝙤𝙧 𝙀𝙥𝙞𝙨𝙤𝙙𝙚 ${selectedEpisode}...` 
                            }, { quoted: episodeMek });

                            await downloadSingleEpisode(episodeData, episodeMek);
                            await socket.sendMessage(sender, { react: { text: '✅', key: episodeMek.key } });

                            socket.ev.off('messages.upsert', handleEpisode);
                            socket.ev.off('messages.upsert', handleSelection);
                        }
                    };

                    ktvEpisodeTimeout = setTimeout(() => {
                        socket.ev.off('messages.upsert', handleEpisode);
                        console.log('KTV episode timeout - cleaned up');
                    }, 600000);

                    socket.ev.on('messages.upsert', handleEpisode);

                } catch (detailsError) {
                    console.error('Details error:', detailsError);
                    await socket.sendMessage(sender, {
                         image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                        caption: formatMessage(
                            '❌ ERROR',
                            `*Details ලබාගැනීමේ දෝෂයක්*\n${detailsError.message}`,
                            `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                        )
                    }, { quoted: replyMek });
                    socket.ev.off('messages.upsert', handleSelection);
                }
            }
        };

        ktvSelectionTimeout = setTimeout(() => {
            socket.ev.off('messages.upsert', handleSelection);
            console.log('KTV selection timeout - cleaned up');
        }, 120000);

        socket.ev.on('messages.upsert', handleSelection);

    } catch (error) {
        console.error('KTV command error:', error);
        await socket.sendMessage(sender, {
             image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
            caption: formatMessage(
                '❌ ERROR',
                `*දෝෂයක් ඇතිවුණා:* ${error.message || 'Unknown error'}`,
                `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
            )
        }, { quoted: msg });
    }
    
    break;
  case 'song2': {
    const botSocket = (typeof socket !== 'undefined') ? socket : (typeof conn !== 'undefined' ? conn : null);
    const targetChat = (typeof sender !== 'undefined') ? sender : (typeof from !== 'undefined' ? from : null);
    const currentMsg = (typeof msg !== 'undefined') ? msg : (typeof mek !== 'undefined' ? mek : null);

    if (!botSocket || !targetChat) {
        console.log("Error: Bot socket or Chat ID variable not found!");
        return;
    }

    const songName = (typeof args !== 'undefined' && args.length > 0) ? args.join(" ") : (typeof text !== 'undefined' ? text.trim() : "");
    
    if (!songName) {
        await botSocket.sendMessage(targetChat, { 
            text: "⚠️ *කරුණාකර සින්දුවේ නම හෝ YouTube ලින්ක් එකක් ඇතුළත් කරන්න!* \n💡 _උදා:_ .song2 lelena" 
        }, { quoted: currentMsg });
        return;
    }

    // 📥 Reaction එකක් දැමීම
    await botSocket.sendMessage(targetChat, { react: { text: '📥', key: currentMsg.key } });

    await botSocket.sendMessage(targetChat, { 
        text: `⏳ _*Searching and downloading "${songName}"...*_\n_Please hold on a second!_ 🎶` 
    }, { quoted: currentMsg });

    try {
        const axios = require('axios');
        
        // 🛠️ ස්ථාවරව වැඩ කරන නවතම API එකක් (Search + Download එකවර සිදු කරයි)
        const apiUrl = `https://api.dreaded.site/api/ytdl/play?text=${encodeURIComponent(songName)}`;
        
        const response = await axios.get(apiUrl);
        const resData = response.data;

        // API ප්‍රතිචාරය පරීක්ෂා කිරීම
        if (!resData.status || !resData.result || !resData.result.download) {
            await botSocket.sendMessage(targetChat, { text: "❌ *සමාවෙන්න!* සින්දුව සොයාගත නොහැකි විය. වෙනත් නමකින් උත්සාහ කරන්න." }, { quoted: currentMsg });
            return;
        }

        const downloadUrl = resData.result.download.url || resData.result.download;
        const songTitle = resData.result.title || songName;

        if (!downloadUrl || !downloadUrl.startsWith('http')) {
            await botSocket.sendMessage(targetChat, { text: "❌ *සමාවෙන්න!* බාගත කිරීමේ ලින්ක් එක බිඳී ඇත." }, { quoted: currentMsg });
            return;
        }

        // ලින්ක් එකෙන් ඕඩියෝ එක බෆර් එකක් විදිහට ඩවුන්ලෝඩ් කිරීම
        const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
        const audioBuffer = Buffer.from(audioRes.data, 'binary');

        // WhatsApp එකට Audio එක සෘජුවම යැවීම
        if (audioBuffer && audioBuffer.length > 0) {
            await botSocket.sendMessage(targetChat, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false, // Voice note එකක් ලෙස යැවීමට අවශ්‍ය නම් true කරන්න
                fileName: `${songTitle}.mp3`
            }, { quoted: currentMsg });

            // ✅ Reaction එකක් දැමීම
            await botSocket.sendMessage(targetChat, { react: { text: '✅', key: currentMsg.key } });
        } else {
            await botSocket.sendMessage(targetChat, { text: "❌ *සමාවෙන්න!* සින්දුවේ දත්ත ලබාගැනීමට නොහැකි විය." }, { quoted: currentMsg });
        }

    } catch (e) {
        console.error("Song2 Error:", e);
        await botSocket.sendMessage(targetChat, { 
            text: `❌ *දෝෂයක් සිදු විය!*\n\n_Error:_ ${e.message}` 
        }, { quoted: currentMsg });
    }
}
break;
              
case 'lyrics':
case 'lyric': {
    const botSocket = (typeof socket !== 'undefined') ? socket : (typeof conn !== 'undefined' ? conn : null);
    const targetChat = (typeof sender !== 'undefined') ? sender : (typeof from !== 'undefined' ? from : null);
    const currentMsg = (typeof msg !== 'undefined') ? msg : (typeof mek !== 'undefined' ? mek : null);

    if (!botSocket || !targetChat) {
        console.log("Error: Bot socket or Chat ID variable not found!");
        return;
    }

    const searchQuery = (typeof args !== 'undefined' && args.length > 0) ? args.join(" ") : (typeof text !== 'undefined' ? text.trim() : "");
    
    if (!searchQuery) {
        await botSocket.sendMessage(targetChat, { 
            text: "⚠️ *සින්දුවේ නම ඇතුළත් කරන්න!* 💡 _උදා:_ .lyrics lelena" 
        }, { quoted: currentMsg });
        return;
    }

    // 🎵 Reaction එකක් දැමීම
    await botSocket.sendMessage(targetChat, { react: { text: '🎵', key: currentMsg.key } });

    await botSocket.sendMessage(targetChat, { 
        text: "⏳ _*Searching for lyrics...*_\n_Please hold on a second!_ 🎶" 
    }, { quoted: currentMsg });

    try {
        const axios = require('axios');
        // 🛠️ FIX: ඔයා ලබා දුන් අලුත් API URL එක මෙතනට ඇතුළත් කර ඇත
        const apiUrl = `https://api-sithija-main2-production.up.railway.app/lyrics?text=${encodeURIComponent(searchQuery)}`;
        
        const response = await axios.get(apiUrl);
        const resData = response.data;

        console.log("--- NEW LYRICS API OUTPUT ---");
        console.log(JSON.stringify(resData, null, 2)); 

        let lyricsText = "";
        let songTitle = searchQuery;
        let artistName = "Unknown";
        let imageUrl = null;

        // 🛠️ New API Structure Mapping
        if (resData && resData.result) {
            // අලුත් API එකේ දත්ත එන්නේ resData.result එක ඇතුලේ data object එකක් විදිහටයි
            const data = resData.result.data || resData.result;
            
            if (typeof data === 'object') {
                lyricsText = data.lyrics || "";
                songTitle = data.title || songTitle;
                artistName = data.artist || data.artists || artistName;
                imageUrl = data.image || null;
            } else if (typeof data === 'string') {
                lyricsText = data;
            }
        }

        // පදවැල් හමු නොවුණහොත් හෝ හිස් නම්
        if (!lyricsText || lyricsText.trim() === "") {
            await botSocket.sendMessage(targetChat, { 
                text: "❌ *සමාවෙන්න!* සින්දුවේ පද වැල් (Lyrics) සොයාගත නොහැකි විය. වෙනත් නමකින් උත්සාහ කරන්න." 
            }, { quoted: currentMsg });
            return;
        }

        const botFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || 
                          (typeof config !== 'undefined' && config.BOT_FOOTER) || 
                          "Sithija Bot Multi-Device";

        const caption = `*🎤 ꜱᴏɴɢ ʟʏʀɪᴄ ꜰɪɴᴅᴇʀ 🎤*

┌───────────────────
├ 🎵 *Title:* ${songTitle}
├ 🧑‍🎤 *Artist:* ${artistName}
└───────────────────

*📝 L Y R I C S :*

${lyricsText}

> ${botFooter}`;

        // පින්තූරයක් තිබේ නම් සහ එය නිවැරදි URL එකක් නම් පමණක් එය සමඟ යැවීම
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
            await botSocket.sendMessage(targetChat, {
                image: { url: imageUrl },
                caption: caption
            }, { quoted: currentMsg });
        } else {
            await botSocket.sendMessage(targetChat, { text: caption }, { quoted: currentMsg });
        }

        // සාර්ථක නම් ✅ Reaction එකක් දැමීම
        await botSocket.sendMessage(targetChat, { react: { text: '✅', key: currentMsg.key } });

    } catch (e) {
        console.error("Lyrics Command Error:", e);
        await botSocket.sendMessage(targetChat, { 
            text: `❌ *දෝෂයක් සිදු විය!*\n\n_Error:_ ${e.message}` 
        }, { quoted: currentMsg });
    }
}
break;
         case 'animost':
    if (!args.length) {
        await socket.sendMessage(sender, {
             image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
            caption: formatMessage(
                '❌ ERROR',
                '*කරුණාකර ඇනිමේ එකේ නම ලබාදෙන්න! උදා: .lakiya anime*',
                `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
            )
        }, { quoted: msg });
        break;
    }

    const animeQuery777 = args.join(' ');
    await socket.sendMessage(sender, { text: '🎬 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜...' });

    const sessionId = Date.now().toString() + Math.random().toString(36);
    function extractDownloadLinks(content) {
        const links = [];
        
        if (!content) return links;
        const drivePattern = /https:\/\/cloud\.sinhalachr\.workers\.dev\/[^\s"']+/g;
        const driveMatches = content.match(drivePattern);
        if (driveMatches) {
            driveMatches.forEach(url => {
                links.push({
                    url: url,
                    quality: extractQualityFromUrl(url),
                    size: extractSizeFromContent(content, url),
                    type: 'direct'
                });
            });
        }
        const tgPattern = /https:\/\/t\.me\/[^\s"']+/g;
        const tgMatches = content.match(tgPattern);
        if (tgMatches) {
            tgMatches.forEach(url => {
                links.push({
                    url: url,
                    quality: extractQualityFromContent(content, url),
                    size: extractSizeFromContent(content, url),
                    type: 'telegram'
                });
            });
        }

        const gdrivePattern = /https:\/\/drive\.google\.com\/[^\s"']+/g;
        const gdriveMatches = content.match(gdrivePattern);
        if (gdriveMatches) {
            gdriveMatches.forEach(url => {
                links.push({
                    url: url,
                    quality: extractQualityFromContent(content, url),
                    size: extractSizeFromContent(content, url),
                    type: 'gdrive'
                });
            });
        }
        
        return links;
    }
    function extractQualityLinks(content) {
        const qualities = [];
        
        if (!content) return qualities;
        const qualityPattern = /(\d{3,4}P)\s*\|\s*([\d.]+(?:GB|MB))/gi;
        let match;
        
        while ((match = qualityPattern.exec(content)) !== null) {
            const quality = match[1];
            const size = match[2];
            const urlMatch = content.substring(Math.max(0, match.index - 500), match.index + 500)
                .match(/https:\/\/[^\s"']+(?:mp4|mkv|workers\.dev|drive\.google)[^\s"']*/i);
            
            if (urlMatch) {
                qualities.push({
                    quality: quality,
                    size: size,
                    url: urlMatch[0]
                });
            }
        }

        const altQualityPattern = /(\d{3,4}P)[^\d]*?([\d.]+(?:GB|MB))/gi;
        while ((match = altQualityPattern.exec(content)) !== null) {
            const quality = match[1];
            const size = match[2];
            
            // Check if this quality already exists
            if (!qualities.some(q => q.quality === quality)) {
                const urlMatch = content.substring(Math.max(0, match.index - 500), match.index + 500)
                    .match(/https:\/\/[^\s"']+(?:mp4|mkv|workers\.dev|drive\.google)[^\s"']*/i);
                
                if (urlMatch) {
                    qualities.push({
                        quality: quality,
                        size: size,
                        url: urlMatch[0]
                    });
                }
            }
        }
        
        return qualities;
    }

    function extractQualityFromUrl(url) {
        if (url.includes('1080p') || url.includes('1080P')) return '1080P';
        if (url.includes('720p') || url.includes('720P')) return '720P';
        if (url.includes('480p') || url.includes('480P')) return '480P';
        if (url.includes('360p') || url.includes('360P')) return '360P';
        return 'HD';
    }
    function extractQualityFromContent(content, url) {
        const urlIndex = content.indexOf(url);
        if (urlIndex > -1) {
            const surrounding = content.substring(Math.max(0, urlIndex - 300), urlIndex + 300);
            const qualityPattern = /\b(\d{3,4}P)\b/i;
            const qualityMatch = surrounding.match(qualityPattern);
            if (qualityMatch) return qualityMatch[1].toUpperCase();
        }
        return 'HD';
    }
    function extractSizeFromContent(content, url) {
        const sizePattern = /([\d.]+(?:GB|MB))/gi;
        const urlIndex = content.indexOf(url);
        if (urlIndex > -1) {
            const surrounding = content.substring(Math.max(0, urlIndex - 200), urlIndex + 200);
            const sizeMatch = surrounding.match(sizePattern);
            if (sizeMatch) return sizeMatch[0];
        }
        return 'N/A';
    }
    
    try {
        const searchResponse = await axios.get(`${config.API_MAIN_URL}/animostlk/search?query=${encodeURIComponent(animeQuery777)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
        const searchData = searchResponse.data;

        if (!searchData.status || !searchData.results || searchData.results.length === 0) {
            await socket.sendMessage(sender, {
                image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                caption: formatMessage(
                    '❌ NO RESULTS',
                    '*Movie Not Found 😞*',
                    `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                )
            }, { quoted: msg });
            break;
        }

        const animeResults = searchData.results.slice(0, 20);
        
        // Create search results message
        let listText = `*𝗔𝗡𝗜𝗠𝗢𝗦𝗧𝗟𝗞 𝗦𝗘𝗔𝗥𝗖𝗛*
*🔢 ʀᴇᴘʟʏ ʙᴇʟᴏᴡ ɴᴜᴍʙᴇʀ*`;

        animeResults.forEach((item, index) => {
            const labels = item.labels?.join(', ') || 'Anime';
            listText += `*${index + 1}║ ${item.title}*\n`;
        });

        listText += `\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;
        
        const sentMsg = await socket.sendMessage(sender, {
            image: { url: config.ANIMOSTLK || 'https://i.ibb.co/0VyPRcvm/Chat-GPT-Image-Jun-14-2026-09-26-06-PM.png' },
            caption: listText
        }, { quoted: msg });

        const messageID = sentMsg.key.id;
        const handleSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const messageType = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSentMsg && sender === replyMek.key.remoteJid) {
                socket.ev.off('messages.upsert', handleSelection);
                
                const choice = parseInt(messageType) - 1;
                if (isNaN(choice) || choice < 0 || choice >= animeResults.length) {
                    await socket.sendMessage(sender, {
                         image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                        caption: formatMessage(
                            '❌ INVALID SELECTION',
                            `*වැරදි අංකයක්! 1-${animeResults.length} අතර තෝරන්න!*`,
                            `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                        )
                    }, { quoted: replyMek });
                    return;
                }

                const selectedItem = animeResults[choice];
                
                await socket.sendMessage(sender, { 
                    text: `📖 𝙁𝙚𝙩𝙘𝙝𝙞𝙣𝙜 𝙙𝙚𝙩𝙖𝙞𝙡𝙨 𝙛𝙤𝙧: ${selectedItem.title.substring(0, 40)}...` 
                }, { quoted: replyMek });

                try {
                    const detailsResponse = await axios.get(`${config.API_MAIN_URL}/animostlk/info?url=${encodeURIComponent(selectedItem.link)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
                    const detailsData = detailsResponse.data;

                    if (!detailsData.status || !detailsData.data) {
                        throw new Error('Failed to fetch anime details');
                    }
                    const animeInfo = detailsData.data;
                    const downloadLinks = extractDownloadLinks(animeInfo.content || '');
                    const qualityLinks = extractQualityLinks(animeInfo.content || '');
                    const categories = animeInfo.labels || selectedItem.labels || ['Anime'];
                    const categoryStr = categories.join(' • ');
                    const yearMatch = animeInfo.plainContent?.match(/(\d{4})/);
                    const year = yearMatch ? yearMatch[1] : 'N/A';
                    const durationMatch = animeInfo.plainContent?.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
                    const duration = durationMatch ? `${durationMatch[1]}h ${durationMatch[2] || '0'}m` : 'N/A';
                    const infoCaption = formatMessage(
                        ` ${animeInfo.title || selectedItem.title}`,
                        `▫️📂 *𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆* ➟ _${categoryStr}_
📅 *𝗬𝗲𝗮𝗿* ➟ _${year}_
⏱️ *𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻* ➟ _${duration}_
🔗 *𝗦𝗼𝘂𝗿𝗰𝗲* ➟ _Animostlk_
📖 *sᴛᴏʀʏ:*_${animeInfo.description?.substring(0, 400) || 'No description available'}${animeInfo.description?.length > 400 ? '...' : ''}_`,
                        `${sessionConfig.MOVIE_FOOTER || config.MOTION_FOOTER || '☘️ 𝗔𝗻𝗶𝗺𝗼𝘀𝘁𝗹𝗸'}`
                    );

                    const infoMsg = await socket.sendMessage(sender, {
                        image: { url: selectedItem.poster || animeInfo.poster || config.ANIME_POSTER || 'https://i.ibb.co/0VyPRcvm/Chat-GPT-Image-Jun-14-2026-09-26-06-PM.png' },
                        caption: infoCaption
                    }, { quoted: replyMek });

                    // If download links available, show them
                    if (qualityLinks.length > 0 || downloadLinks.length > 0) {
                        let downloadText = `*𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 𝗢𝗣𝗧𝗜𝗢𝗡𝗦*\n\n`;
                        
                        if (qualityLinks.length > 0) {
                            downloadText += `*📥 Available Qualities:*\n\n`;
                            qualityLinks.forEach((link, idx) => {
                                const typeIcon = link.url.includes('telegram') ? '📱' : (link.url.includes('drive') ? '☁️' : '🎬');
                                downloadText += `* ${idx + 1}┃ ${link.quality}* - ${link.size || 'Size N/A'}\n`;
                            });
                        } else {
                            downloadText += `*📥 Download Links:*\n`;
                            downloadLinks.forEach((link, idx) => {
                                const typeIcon = link.type === 'telegram' ? '📱' : (link.type === 'gdrive' ? '☁️' : '🎬');
                                const typeName = link.type === 'telegram' ? 'Telegram' : (link.type === 'gdrive' ? 'Google Drive' : 'Direct');
                                downloadText += `* ${idx + 1}┃  ${typeName}* ${link.quality !== 'HD' ? `- ${link.quality}` : ''} (${link.size})\n`;
                            });
                        }
                        
                        downloadText += `\n*Reply with number to download*\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;
                        
                        const downloadMsg = await socket.sendMessage(sender, {
                            text: downloadText
                        }, { quoted: infoMsg });
                        
                        const downloadMsgID = downloadMsg.key.id;
                        const linksToUse = qualityLinks.length > 0 ? qualityLinks : downloadLinks;
                        const handleDownload = async ({ messages: downloadMessages }) => {
                            const downloadMek = downloadMessages[0];
                            if (!downloadMek?.message) return;
                            
                            const downloadChoice = downloadMek.message.conversation || downloadMek.message.extendedTextMessage?.text;
                            const isReplyToDownloadMsg = downloadMek.message.extendedTextMessage?.contextInfo?.stanzaId === downloadMsgID;
                            
                            if (isReplyToDownloadMsg && sender === downloadMek.key.remoteJid) {
                                socket.ev.off('messages.upsert', handleDownload);
                                
                                const choiceNum = parseInt(downloadChoice) - 1;
                                
                                if (isNaN(choiceNum) || choiceNum < 0 || choiceNum >= linksToUse.length) {
                                    await socket.sendMessage(sender, {
                                         image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                                        caption: formatMessage(
                                            '❌ INVALID SELECTION',
                                            `*වැරදි අංකයක්! 1-${linksToUse.length} අතර තෝරන්න!*`,
                                            `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                                        )
                                    }, { quoted: downloadMek });
                                    return;
                                }
                                
                                const selectedLink = linksToUse[choiceNum];
                                
                                await socket.sendMessage(sender, { 
                                    text: `⏳ 𝙂𝙚𝙩𝙩𝙞𝙣𝙜 ${selectedLink.quality || 'download'} 𝙡𝙞𝙣𝙠...` 
                                }, { quoted: downloadMek });
                                
                                try {
                                    await socket.sendMessage(sender, { react: { text: '📥', key: downloadMek.key } });

                                    if (selectedLink.url.includes('telegram')) {
                                        await socket.sendMessage(sender, {
                                            text: `🎬 *${animeInfo.title || selectedItem.title}*\n\n📥 *Download Link:*\n${selectedLink.url}\n\n💾 *Quality:* ${selectedLink.quality || 'Unknown'}\n📦 *Size:* ${selectedLink.size || 'N/A'}\n\n⚠️ *Open in browser and download*`,
                                        }, { quoted: downloadMek });
                                    } else if (selectedLink.url.includes('drive.google.com')) {
                                        await socket.sendMessage(sender, {
                                            text: `🎬 *${animeInfo.title || selectedItem.title}*\n\n📥 *Google Drive Link:*\n${selectedLink.url}\n\n💾 *Quality:* ${selectedLink.quality || 'HD'}\n📦 *Size:* ${selectedLink.size || 'N/A'}\n\n⚠️ *Open in browser and download*`,
                                        }, { quoted: downloadMek });
                                    } else {
                                        await socket.sendMessage(sender, {
                                            document: { url: selectedLink.url },
                                            mimetype: 'video/mp4',
                                            fileName: `${animeInfo.title || selectedItem.title} ${selectedLink.quality || 'HD'}.mp4`,
                                            caption: formatMessage(
                                                `${animeInfo.title || selectedItem.title}`,
                                                ` *𝗤𝘂𝗮𝗹𝗶𝘁𝘆* ➟ _${selectedLink.quality || 'HD'}_`,
                                                `${sessionConfig.MOVIE_FOOTER || config.MOTION_FOOTER || '☘️ 𝗔𝗻𝗶𝗺𝗼𝘀𝘁𝗹𝗸'}`
                                            )
                                        }, { quoted: downloadMek });
                                    }
                                    
                                    await socket.sendMessage(sender, { react: { text: '✅', key: downloadMek.key } });
                                    
                                } catch (downloadError) {
                                    console.error('Download error:', downloadError);
                                    await socket.sendMessage(sender, {
                                         image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                                        caption: formatMessage(
                                            '❌ DOWNLOAD ERROR',
                                            `*Download ලබාගැනීමේ දෝෂයක්.*\n${downloadError.message}`,
                                            `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                                        )
                                    }, { quoted: downloadMek });
                                }
                            }
                        };
                        
                        socket.ev.on('messages.upsert', handleDownload);
                        setTimeout(() => {
                            socket.ev.off('messages.upsert', handleDownload);
                        }, 60000);
                    } else {
                        // No download links, just show info
                        await socket.sendMessage(sender, {
                            text: formatMessage(
                                ` *𝗜𝗡𝗙𝗢 𝗢𝗡𝗟𝗬*`,
                                ` *𝗡𝗼𝘁𝗶𝗰𝗲* ➟ _මෙම ඇනිමේ සඳහා download links නොමැත._

 *𝗢𝗿𝗶𝗴𝗶𝗻𝗮𝗹 𝗣𝗼𝘀𝘁* ➟ ${selectedItem.link}
`,
                                `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER || ' 𝗔𝗻𝗶𝗺𝗼𝘀𝘁𝗹𝗸'}`
                            )
                        }, { quoted: infoMsg });
                    }
                    
                } catch (detailsError) {
                    console.error('Details error:', detailsError);
                    await socket.sendMessage(sender, {
                         image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                        caption: formatMessage(
                            '❌ ERROR',
                            `*Details ලබාගැනීමේ දෝෂයක්*\n${detailsError.message}`,
                            `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                        )
                    }, { quoted: replyMek });
                }
            }
        };
        
        socket.ev.on('messages.upsert', handleSelection);
        setTimeout(() => {
            socket.ev.off('messages.upsert', handleSelection);
        }, 60000);
        
    } catch (error) {
        console.error('Animostlk command error:', error);
        await socket.sendMessage(sender, {
             image: { url:  sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
            caption: formatMessage(
                '❌ ERROR',
                `*දෝෂයක් ඇතිවුණා:* ${error.message || 'Unknown error'}`,
                `${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
            )
        }, { quoted: msg });
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
├ 🔍 *Query:* ${searchQuery}
├ 📸 *Image:* ${i + 1}/${topResults.length}
├ 🚀 *Server:* Sithija API
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
              
        case 'xnxx':
    if (!args.length) {
        await socket.sendMessage(sender, {
            image: { url: config.SITHIJA_IMAGE_PATH },
            caption: formatMessage(
                '❌ ERROR',
                '*කරුණාකර චිත්‍රපටයේ හෝ video එකේ නම ලබාදෙන්න!*\nඋදා: `.xvideos mia`',
                `${config.BOT_FOOTER2}`
            )
        }, { quoted: msg });
        break;
    }

    const xvQuery = args.join(' ');
    await socket.sendMessage(sender, { text: '🔞 Searching on XVideos...' });

    try {
        // 1. SEARCH API
        const searchResponse = await axios.get(`https://vajira-official-apis.vercel.app/api/xnxx-search?q=${encodeURIComponent(xvQuery)}&api_key=vajira-VajiraOfficial2003`);
        const searchData = searchResponse.data;

        if (!searchData.success || !searchData.results || searchData.results.length === 0) {
            await socket.sendMessage(sender, {
                image: { url: config.SITHIJA_IMAGE_PATH },
                caption: formatMessage(
                    '❌ NO RESULTS',
                    '*මෙම keyword එකට videos හමුවෙන්නේ නැහැ 😞*',
                    `${config.BOT_FOOTER}`
                )
            }, { quoted: msg });
            break;
        }

        const videos = searchData.results.slice(0, 12);

        let listText = `🔞 *𝗫𝗩𝗜𝗗𝗘𝗢𝗦 𝗦𝗘𝗔𝗥𝗖𝗛 : ${xvQuery}*\n\n*🎥 SELECT YOUR VIDEO*\n*🔢 Reply with a Number 👇*\n\n`;

        videos.forEach((video, index) => {
            listText += `*${index + 1} ║》 ${video.title}*\n`;
        });

        listText += `> ${config.BOT_FOOTER}`;

        const sentMsg = await socket.sendMessage(sender, {
            image: { url: config.SITHIJA_IMAGE_PATH|| 'https://i.imgur.com/xxxx.png' }, // ඔයාගේ xvideos logo එකක් දාන්න
            caption: listText
        }, { quoted: msg });

        const messageID = sentMsg.key.id;

        const handleXvSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const messageText = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSent = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSent && sender === replyMek.key.remoteJid) {
                const choice = parseInt(messageText) - 1;

                if (isNaN(choice) || choice < 0 || choice >= videos.length) {
                    await socket.sendMessage(sender, {
                        image: { url: config.SITHIJA_IMAGE_PATH },
                        caption: formatMessage('❌ INVALID', `*වැරදි අංකයක්! 1-${videos.length} අතර තෝරන්න*`, config.BOT_FOOTER)
                    }, { quoted: replyMek });
                    return;
                }

                const selectedVideo = videos[choice];

                await socket.sendMessage(sender, { text: '🔞 Fetching video details...' }, { quoted: replyMek });

                try {
                    const dlResponse = await axios.get(`https://vajira-official-apis.vercel.app/api/xnxx-dl?url=${encodeURIComponent(selectedVideo.url)}&api_key=vajira-VajiraOfficial2003`);
                    const dlData = dlResponse.data;

                    if (!dlData.success || !dlData.direct_link) {
                        throw new Error('Failed to get download link');
                    }

                    const finalDownloadUrl = dlData.download_url || dlData.direct_link; 
                       await socket.sendMessage(sender, {
                        document: { url: finalDownloadUrl },
                        mimetype: 'video/mp4',
                        fileName: `${selectedVideo.title}.mp4`,
                        caption: formatMessage(
                            `🔞 ${selectedVideo.title}`,
                            `⏱ Duration: ${selectedVideo.duration}\nSite: XVideos`,
                            `${config.BOT_FOOTER}`
                        )
                    }, { quoted: replyMek });

                    await socket.sendMessage(sender, { react: { text: '✅', key: replyMek.key } });

                } catch (dlError) {
                    console.error('XVideos DL Error:', dlError);
                    await socket.sendMessage(sender, {
                        image: { url: config.ERROR },
                        caption: formatMessage(
                            '❌ DOWNLOAD ERROR',
                            `*Video link එක ලබාගැනීමට නොහැකි විය.*\n${dlError.message}`,
                            config.BOT_FOOTER
                        )
                    }, { quoted: replyMek });
                } finally {
                    socket.ev.off('messages.upsert', handleXvSelection);
                }
            }
        };

        socket.ev.on('messages.upsert', handleXvSelection);

    } catch (error) {
        console.error('XVideos command error:', error);
        await socket.sendMessage(sender, {
            image: { url: config.ERROR },
            caption: formatMessage(
                '❌ ERROR',
                `*දෝෂයක් ඇතිවිය:* ${error.message}`,
                config.BOT_FOOTER
            )
        }, { quoted: msg });
    }
    break;            
case 'setting': {
     
    
    
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
        'AUTO_VIEW_STATUS','BOT_FOOTER','MODE','PREFIX', 'AUTO_LIKE_STATUS'
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

    // 🛠️ Search Query එක නිවැරදිව ලබා ගැනීම
    const searchQuery = (typeof args !== 'undefined' && args.length > 0) ? args.join(" ") : (typeof text !== 'undefined' ? text.trim() : "");
    
    if (!searchQuery) {
        await botSocket.sendMessage(targetChat, { 
            text: "⚠️ *බාගත යුතු ඇප් එකේ නම ඇතුළත් කරන්න!* 💡 _උදා:_ .an1 vector" 
        }, { quoted: currentMsg });
        return;
    }

    // 📥 Reaction එකක් දැමීම
    await botSocket.sendMessage(targetChat, { react: { text: '📥', key: currentMsg.key } });

    // සෙවීම ආරම්භ කළ බව දැනුම් දීම
    await botSocket.sendMessage(targetChat, { 
        text: "⏳ _*Searching for APK...*_\n_Please hold on a second!_ 🚀" 
    }, { quoted: currentMsg });

    try {
        const axios = require('axios');
        // ඔබේ Railway API එකට request එක යැවීම
        const apiUrl = `https://api-sithija-main2-production.up.railway.app/download-android1?q=${encodeURIComponent(searchQuery)}`;
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
    const menuMsg = await socket.sendMessage(sender, {
        image: { url: config.SITHIJA_IMAGE_PATH2 },
        caption: ` 💬 𝑯𝒊 𝑩𝒐𝒕 𝑼𝒔𝒆𝒓 ! 𝑯𝒐𝒘 𝑨𝒓𝒆 𝒀𝒐𝒖 ?

🤖 𝙄'𝙢 𝙎𝙞𝙢𝙥𝙡𝙚 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️

┌─❖ 𝑺𝒀𝑺𝑻𝑬𝑴 𝑶𝑽𝑬𝑹𝑽𝑰𝑬𝑾
│ 👑 𝑫𝒆𝒗𝒆𝒍𝒐𝒑𝒆𝒓 : 𝑺𝒊𝒕𝒉𝒊𝒋𝒂
│ 📦 𝑽𝒆𝒓𝒔𝒊𝒐𝒏   : 2.0.0
│ 🟢 𝑶𝒏𝒍𝒊𝒏𝒆    : 𝑻𝒓𝒖𝒆
└─────────────❖

┌─❖ 𝑴𝑬𝑵𝑼 𝑷𝑨𝑵𝑬𝑳
│ 🍀 [1] 𝑴𝒂𝒊𝒏
│ 🎥 [2] 𝑴𝒐𝒗𝒊𝒆𝒔
│ 🛠️ [3] 𝑻𝒐𝒐𝒍𝒔
│ 📥 [4] 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅𝒔
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
├ 🎥 ${sessionConfig.PREFIX || config.PREFIX}pupilmovie <query>
│   ╰➤ 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑺𝒊𝒏𝒉𝒂𝒍𝒂 𝑫𝒖𝒃𝒃𝒆𝒅
│      𝑴𝒐𝒗𝒊𝒆𝒔 & 𝑻𝑽 𝑺𝒆𝒓𝒊𝒆𝒔
│
├ 🎥 ${sessionConfig.PREFIX || config.PREFIX}animost <query>
│   ╰➤ 𝑺𝒆𝒂𝒓𝒄𝒉 & 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑺𝒊𝒏𝒉𝒂𝒍𝒂 𝑫𝒖𝒃𝒃𝒆𝒅 𝑴𝒐𝒗𝒊𝒆𝒔       
│
├ 🎥 ${sessionConfig.PREFIX || config.PREFIX}ktv <query>
│   ╰➤ 𝑺𝒆𝒂𝒓𝒄𝒉 & 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑲𝒐𝒓𝒆𝒂𝒏 𝑫𝒓𝒂𝒎𝒂𝒔
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

case 'menu2': {
    // Buttons Array එක නිර්මාණය කිරීම
    const buttons = [
        { buttonId: '1', buttonText: { displayText: '🍀 Main Menu' }, type: 1 },
        { buttonId: '2', buttonText: { displayText: '🎥 Movies' }, type: 1 },
        { buttonId: '3', buttonText: { displayText: '🛠️ Tools' }, type: 1 },
        { buttonId: '4', buttonText: { displayText: '📥 Downloads' }, type: 1 }
    ];

    const menuCaption = `💬 𝑯𝒊 𝑩𝒐𝒕 𝑼𝒔𝒆𝒓 ! 𝑯𝒐𝒘 𝑨𝒓𝒆 𝒀𝒐𝒖 ?

🤖 𝙄'𝙢 𝙎𝙞𝙢𝙥𝙡ε 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️

┌─❖ 𝑺𝒀𝑺𝑻𝑬𝑴 𝑶𝑽𝑬𝑹𝑽𝑰𝑬𝑾
│ 👑 𝑫𝒆𝒗𝒆𝒍𝒐𝒑𝒆𝒓 : 𝑺𝒊𝒕𝒉𝒊𝒋𝒂
│ 📦 𝑽𝒆𝒓𝒔𝒊𝒐𝒏   : 2.0.1
│ 🟢 𝑶𝒏𝒍𝒊𝒏𝒆    : 𝑻𝒓𝒖𝒆
└─────────────❖

📌 Please click a button below to select an option.

${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

    // Interactive Button Message එක සකස් කිරීම
    const buttonMessage = {
        image: { url: config.SITHIJA_IMAGE_PATH2 },
        caption: menuCaption,
        footer: sessionConfig.BOT_FOOTER || config.BOT_FOOTER,
        buttons: buttons,
        headerType: 4
    };

    // Message එක Send කිරීම
    const menuMsg = await socket.sendMessage(sender, buttonMessage, { quoted: sudu });
    
    if (!global.activeMenuUsers) global.activeMenuUsers = new Set();
    global.activeMenuUsers.add(sender);
    
    const menuListener = async (messageUpdate) => {
        const mek = messageUpdate.messages[0];
        if (!mek.message || mek.key.fromMe) return;

        // Button Response එක නිවැරදිව හඳුනා ගැනීම (Fix)
        const selectedButtonId = mek.message.buttonsResponseMessage?.selectedButtonId || 
                                 mek.message.templateButtonReplyMessage?.selectedId;
        
        let messageType = selectedButtonId || 
                           mek.message.conversation || 
                           mek.message.extendedTextMessage?.text || 
                           '';
        messageType = messageType.trim();
        
        const isFromSameUser = mek.key.remoteJid === sender;
        const isStillActive = global.activeMenuUsers.has(sender);
        
        if (isFromSameUser && isStillActive && ['1','2','3','4'].includes(messageType)) {
            await socket.sendMessage(sender, { 
                react: { text: '✅', key: mek.key } 
            });
            
            switch (messageType) {
                case '1': 
                    await socket.sendMessage(sender, {
                        image: { url: config.SITHIJA_IMAGE_PATH },
                        caption: `𝙎𝙞𝙢𝙥𝙡е 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️
┌─❖ 🟢 𝑩𝑶𝑻 𝑺𝒀𝑺𝑻𝑬𝑴 ❖─┐
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}menu
│   ╰➤ 𝑶𝒑𝒆𝒏 𝑰𝒏𝒕𝒆𝒓𝒂𝒄𝒕𝒊𝒗𝒆 𝑴𝒂𝒊𝒏 𝑴𝒆𝒏𝒖
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}alive
│   ╰➤ 𝑪𝒉𝒆𝒄𝒌 𝑩𝒐𝒕 𝑺𝒕𝒂𝒕𝒖𝒔 & 𝑼𝒑𝒕𝒊𝒎𝒆
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}ping
│   ╰➤ 𝑻𝒆𝒔𝒕 𝑹𝒆𝒔𝒑𝒐ᓐ𝒔𝒆 𝑺𝒑𝒆𝒆𝒅
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}owner
│   ╰➤ 𝑪𝒐𝒏𝒕𝒂𝒄𝒕 𝑩𝒐𝒕 𝑫𝒆𝒗𝒆𝒍𝒐𝒑𝒆𝒓
│
├ ❖ ${sessionConfig.PREFIX || config.PREFIX}setting
│   ╰➤ 𝑪𝒉𝒂𝒏𝒈𝒆 𝑩𝒐𝒕 𝑺𝒆𝒕𝒕𝒊𝒏𝒈𝒔
│
└───────────────────────❖
${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                    }, { quoted: mek });
                    break;
                    
                case '2': 
                    await socket.sendMessage(sender, {
                        image: { url: config.SITHIJA_IMAGE_PATH },
                        caption: `𝙎𝙞𝙢𝙥𝙡е 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️

┌─❖ 🍿 𝑬𝑵𝑻𝑬𝑹𝑻𝑨𝑰𝑵𝑴𝑬𝑵𝑻 ❖─┐
│
├ 🎥 ${sessionConfig.PREFIX || config.PREFIX}cinesubz <query>
│   ╰➤ 𝑺𝒆𝒂𝒓𝒄𝒉 & 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑴𝒐𝒗𝒊𝒆𝒔
│      𝑻𝑽 𝑺𝒆𝒓𝒊𝒆𝒔 𝑭𝒓𝒐𝒎 𝑪𝒊𝒏𝒆𝒔𝒖𝒃𝒛
│
├ 🎥 ${sessionConfig.PREFIX || config.PREFIX}pupilmovie <query>
│   ╰➤ 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑺𝒊𝒏𝒉𝒂𝒍𝒂 𝑫𝒖𝒃𝒃𝒆𝒅
│      𝑴𝒐𝒗𝒊𝒆𝒔 & 𝑻𝑽 𝑺𝒆𝒓𝒊𝒆𝒔
│
├ 🎥 ${sessionConfig.PREFIX || config.PREFIX}animost <query>
│   ╰➤ 𝑺𝒆𝒂𝒓𝒄𝒉 & 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑺𝒊𝒏𝒉𝒂𝒍𝒂 𝑫𝒖𝒃𝒃𝒆𝒅 𝑴𝒐𝒗𝒊𝒆𝒔       
│
├ 🎥 ${sessionConfig.PREFIX || config.PREFIX}ktv <query>
│   ╰➤ 𝑺𝒆𝒂𝒓𝒄𝒉 & 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑲𝒐𝒓𝒆𝒂𝒏 𝑫𝒓𝒂𝒎𝒂𝒔
│
└─────────────────────────❖

${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                    }, { quoted: mek });
                    break;

                case '3': 
                    await socket.sendMessage(sender, {
                        image: { url: config.SITHIJA_IMAGE_PATH },
                        caption: `𝙎𝙞𝙢𝙥𝙡е 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️
                        
┌─❖ ⚡ 𝑼𝑻𝑰𝑳𝑰𝑻𝒀 𝑻𝑶𝑶𝑳𝑺 ❖─┐
│
├ 🛠️ ${sessionConfig.PREFIX || config.PREFIX}jid
│   ╰➤ 𝑮𝒆𝒕 𝑼𝒔𝒆𝒓 𝒐𝒓 𝑮𝒓𝒐𝒖𝒑 𝑱𝑰𝑫
│
├ 🛠️ ${sessionConfig.PREFIX || config.PREFIX}forward <jid>
│   ╰➤ 𝑭𝒐𝒓𝒘𝒂𝒓𝒅 𝑷𝒉𝒐𝒕𝒐𝒔 & 𝑽𝒊𝒅𝒆𝒐𝒔
│      𝑻𝒐 𝑺𝒆𝒍𝒆𝒄𝒕𝒆𝒅 𝑱𝑰𝑫
│
└─────────────────────────❖

${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                    }, { quoted: mek });
                    break;

                case '4': 
                    await socket.sendMessage(sender, {
                        image: { url: config.SITHIJA_IMAGE_PATH },
                        caption: `𝙎𝙞𝙢𝙥𝙡е 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️
                        
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
└─────────────────────────❖
   
${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                    }, { quoted: mek });
                    break;
            }

            console.log(`📱 User ${sender} clicked button ID: ${messageType}`);
            
            // වැඩේ ඉවර වුණාම Listener එක ක්ලෝස් කරනවා
            global.activeMenuUsers.delete(sender);
            socket.ev.off('messages.upsert', menuListener);
        }
        
        else if (isFromSameUser && isStillActive && messageType.startsWith(sessionConfig.PREFIX || config.PREFIX)) {
            global.activeMenuUsers.delete(sender);
            socket.ev.off('messages.upsert', menuListener);
            console.log(`🚪 User ${sender} exited menu via command`);
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
}
break;
              
case 'alive': {
    try {
        const aliveMsg = `💬 𝑯𝒊 𝑩𝒐𝒕 𝑼𝒔𝒆𝒓 ! 𝑯𝒐𝒘 𝑨𝒓𝒆 𝒀𝒐𝒖 ?

🤖 𝙄'𝙢 𝙎𝙞𝙢𝙥𝙡𝙚 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️

┌─❖ 𝑺𝒀𝑺𝑻𝑬𝑴 𝑴𝑶𝑵𝑰𝑻𝑶𝑹 ❖─┐
│ 🟢 𝑵𝒆𝒕𝒘𝒐𝒓𝒌 : 𝑺𝒕𝒂𝒃𝒍𝒆
│ 📗 𝑩𝒖𝒊𝒍𝒅   : 𝒗2.0.0
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

case 'fb2': {
    // 🛠️ බොට්ටුවේ ව්‍යුහය අනුව variables ආරක්ෂිතව වෙන් කර ගැනීම
    const botSocket = (typeof socket !== 'undefined') ? socket : (typeof conn !== 'undefined' ? conn : null);
    const targetChat = (typeof sender !== 'undefined') ? sender : (typeof from !== 'undefined' ? from : null);
    const currentMsg = (typeof msg !== 'undefined') ? msg : (typeof mek !== 'undefined' ? mek : null);

    if (!botSocket || !targetChat) {
        console.log("Error: Bot socket or Chat ID variable not found!");
        return;
    }

    // ලින්ක් එක වෙන් කර ගැනීම
    const videoUrl = (typeof args !== 'undefined' && args.length > 0) ? args[0] : (typeof text !== 'undefined' ? text.trim() : "");

    if (!videoUrl || !videoUrl.startsWith('http')) {
        await botSocket.sendMessage(targetChat, { 
            text: "⚠️ *කරුණාකර නිවැරදි Facebook වීඩියෝ ලින්ක් එකක් ලබා දෙන්න!* \n💡 _උදා:_ .fb2 https://www.facebook.com/..." 
        }, { quoted: currentMsg });
        return;
    }

    await botSocket.sendMessage(targetChat, { react: { text: '🔍', key: currentMsg.key } });
    await botSocket.sendMessage(targetChat, { text: "⏳ _*Fetching video qualities...*_\n_Please hold on a second!_ 📥" }, { quoted: currentMsg });

    try {
        const axios = require('axios');
        // ස්ථිරවම වැඩ කරන නව API එකක් (නොමිලේ භාවිතා කල හැක)
        const apiUrl = `https://api.dreaded.site/api/fbdl?url=${encodeURIComponent(videoUrl)}`;
        
        const response = await axios.get(apiUrl);
        const resData = response.data;

        if (!resData.status || !resData.result) {
            await botSocket.sendMessage(targetChat, { text: "❌ *කණගාටුයි!* වීඩියෝ ලින්ක් එක සොයා ගැනීමට නොහැකි විය. වෙනත් ලින්ක් එකක් උත්සාහ කරන්න." }, { quoted: currentMsg });
            return;
        }

        const hdLink = resData.result.hd || null;
        const sdLink = resData.result.sd || resData.result.normal || null;

        const botFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || 
                          (typeof config !== 'undefined' && config.BOT_FOOTER) || 
                          "Sithija Bot Multi-Device";

        let menuText = `*🎬 ꜰᴀᴄᴇʙᴏᴏᴋ ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀ減*\n\n`;
        menuText += `*ℹ️ Title:* ${resData.result.title || 'FB Video'}\n`;
        menuText += `┌───────────────────\n`;
        
        // මෙතනදී | ලකුණ වෙනුවට පැහැදිලිව වෙන් කරගන්න [SPIT] යෙදුවා
        if (sdLink) {
            menuText += `├ 1️⃣ *SD Quality (Normal)*\n│ 🎯 _කෙලින්ම බාගැනීමට පහත කෝඩ් එක Copy කර Send කරන්න:_\n│ \`.fbdl sd[SPIT]${videoUrl}\`\n`;
        }
        if (hdLink) {
            menuText += `├───────────────────\n`;
            menuText += `├ 2️⃣ *HD Quality (High)*\n│ 🎯 _කෙලින්ම බාගැනීමට පහත කෝඩ් එක Copy කර Send කරන්න:_\n│ \`.fbdl hd[SPIT]${videoUrl}\`\n`;
        }
        
        menuText += `└───────────────────\n\n> ${botFooter}`;

        await botSocket.sendMessage(targetChat, { text: menuText }, { quoted: currentMsg });
        await botSocket.sendMessage(targetChat, { react: { text: '✅', key: currentMsg.key } });

    } catch (error) {
        console.error("FB2 Fetch Error:", error);
        await botSocket.sendMessage(targetChat, { text: `❌ *API දෝෂයකි:* ${error.message}` }, { quoted: currentMsg });
    }
    break;
}

case 'fbdl': {
    const botSocket = (typeof socket !== 'undefined') ? socket : (typeof conn !== 'undefined' ? conn : null);
    const targetChat = (typeof sender !== 'undefined') ? sender : (typeof from !== 'undefined' ? from : null);
    const currentMsg = (typeof msg !== 'undefined') ? msg : (typeof mek !== 'undefined' ? mek : null);

    // සම්පූර්ණ text එක ලබා ගැනීම
    const inputData = (typeof text !== 'undefined' && text) ? text.trim() : ((typeof args !== 'undefined' && args.length > 0) ? args.join(" ") : "");
    if (!inputData || !inputData.includes('[SPIT]')) return;

    // Quality එක සහ URL එක වෙන් කර ගැනීම
    const parts = inputData.split('[SPIT]');
    const quality = parts[0].replace(/.*fbdl\s+/, '').trim(); // command එක අයින් කර quality එක පමණක් ගැනීම
    const rawUrl = parts[1].trim();

    await botSocket.sendMessage(targetChat, { react: { text: '📥', key: currentMsg.key } });
    await botSocket.sendMessage(targetChat, { text: `⏳ _*Downloading video in ${quality.toUpperCase()} quality...*_\n_Please wait, uploading to WhatsApp!_ 🚀` }, { quoted: currentMsg });

    try {
        const axios = require('axios');
        const apiUrl = `https://api.dreaded.site/api/fbdl?url=${encodeURIComponent(rawUrl)}`;
        
        const response = await axios.get(apiUrl);
        const resData = response.data;

        let finalDownloadUrl = null;
        if (resData.status && resData.result) {
            if (quality.toLowerCase() === 'hd') {
                finalDownloadUrl = resData.result.hd || resData.result.sd;
            } else {
                finalDownloadUrl = resData.result.sd || resData.result.normal;
            }
        }

        if (finalDownloadUrl) {
            // Buffer එක නිවැරදිව සකසා ගැනීම (Fixing Buffer Error)
            const videoResponse = await axios.get(finalDownloadUrl, { responseType: 'arraybuffer' });
            const videoBuffer = Buffer.from(videoResponse.data, 'binary');

            await botSocket.sendMessage(targetChat, { 
                video: videoBuffer, 
                caption: `*ලබාදුන් Facebook වීඩියෝව සාර්ථකව බාගත කරන ලදී!* ✅\n\n*Quality:* ${quality.toUpperCase()}`,
                mimetype: 'video/mp4'
            }, { quoted: currentMsg });

            await botSocket.sendMessage(targetChat, { react: { text: '✅', key: currentMsg.key } });
        } else {
            await botSocket.sendMessage(targetChat, { text: "❌ වීඩියෝ ගොනුව බාගත කිරීමට නොහැකි විය. ලින්ක් එක බිඳී ඇත." }, { quoted: currentMsg });
        }

    } catch (error) {
        console.error("FB Download Error:", error);
        await botSocket.sendMessage(targetChat, { text: `❌ *බාගත කිරීමේ දෝෂයකි:* ${error.message}` }, { quoted: currentMsg });
    }
    break;
}
              
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

┌───────────────────
├ 📱 *App Name:* ${apk.name || searchQuery}
├ ⚙️ *Version:* ${apk.version || 'Unknown'}
├ 📦 *Package:* ${apk.package_id || 'Unknown'}
├ 🚀 *Server:* Sithija Production API
└───────────────────

> 📥 _පහතින් ඔයාගේ APK එක Upload වෙනවා..._`;

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
              
case 'chatgpt':
case 'gpt':
case 'ai2': {
    // ආරම්භයේදීම 🧠 Reaction එකක් දැමීම
    await socket.sendMessage(sender, { react: { text: '🧠', key: msg.key } });

    const userPrompt = args.join(" ");
    if (!userPrompt) {
        await socket.sendMessage(sender, { 
            text: "⚠️ *ඔයාට දැනගන්න ඕන දේ ඇතුළත් කරන්න!* 💡 _උදා:_ .chatgpt sky is blue?" 
        }, { quoted: msg });
        return;
    }

    // AI එක සිතන බව (Typing...) පෙන්වීමට message එකක් යැවීම
    const loadingMsg = await socket.sendMessage(sender, { 
        text: "🤔 _*ChatGPT is thinking...*_\n_Please hold on a second!_ 🧠" 
    }, { quoted: msg });

    try {
        // 🛠️ ඔයාගේ Railway ChatGPT API එකට request එක යැවීම (query parameter එක prompt ලෙස වෙනස් කර ඇත)
        const apiUrl = `https://api-sithija-main2-production.up.railway.app/chatgpt?prompt=${encodeURIComponent(userPrompt)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        // API Response එක අනුව දත්ත පවතින තැන පරීක්ෂා කිරීම
        const aiReply = data.result || data.response || data.text || data;

        if (aiReply) {
            // බොට්ටුවේ Footer එක සඳහා variable එක ආරක්ෂිතව තේරීම
            const botFooter = (typeof sessionConfig !== 'undefined' && sessionConfig.BOT_FOOTER) || 
                              (typeof config !== 'undefined' && config.BOT_FOOTER) || 
                              "Sithija Bot Multi-Device";

            // පිළිතුර ලස්සනට සකස් කිරීම
            const formattedReply = `*✨ ᴄʜᴀᴛɢᴘᴛ ᴀɪ ᴀꜱꜱɪꜱᴛᴀɴᴛ ✨*\n\n${aiReply}\n\n> ${botFooter}`;

            // සාර්ථකව පිළිතුර WhatsApp එකට යැවීම
            await socket.sendMessage(sender, { text: formattedReply }, { quoted: msg });
            
            // අවසන් වූ පසු ✨ Reaction එකක් දැමීම
            await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
        } else {
            await socket.sendMessage(sender, { 
                text: "❌ *සමාවෙන්න!* ChatGPT එකෙන් පිළිතුරක් ලබා ගැනීමට නොහැකි විය. 🥲" 
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
                                                        
                                                        const darkShanResponse = await axios.get(`https://new77777.vercel.app/movie/cinesubz?url=${encodeURIComponent(selectedEpisodeLink.url)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
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
case 'pupilmovie':
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*Please provide a movie name! Example: .pupilmovie spider*'
        }, { quoted: msg });
        break;
    }

    const movieQueryF = args.join(' ');
    await socket.sendMessage(sender, { text: '🎬 𝘗𝘜𝘗𝘐𝘓𝘝𝘐𝘋𝘌𝘖 • 🔎 Searching Sinhala Dubbed Movies...' });

    try {
        const searchResponse = await axios.get(`http://nexoraapi.laksidunimsara.com/pupilvideo/search?query=${encodeURIComponent(movieQueryF)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
        const searchData = searchResponse.data;

        if (!searchData.status || !searchData.data?.results || searchData.data.results.length === 0) {
            await socket.sendMessage(sender, {
                text: '❌ NO RESULTS\n\n*No movies found! 😞*'
            }, { quoted: msg });
            break;
        }

        const movies = searchData.data.results.slice(0, 25);
        let listText = `SEARCH: ${movieQueryF}\n\nReply with number to select:\n\n`;
        movies.forEach((movie, index) => {
            listText += `${index + 1}. ${movie.title}\n`;
        });

        listText += `\n${config.BOT_FOOTER}`;

        const sentMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });
        const messageID = sentMsg.key.id;
        
        const handleSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const messageType = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSentMsg && sender === replyMek.key.remoteJid) {
                const choice = parseInt(messageType) - 1;
                if (isNaN(choice) || choice < 0 || choice >= movies.length) {
                    await socket.sendMessage(sender, {
                        text: `❌ INVALID SELECTION\n\n*Invalid number! Choose between 1-${movies.length}! 😕*`
                    }, { quoted: replyMek });
                    return;
                }

                const selectedMovie = movies[choice];
                
                await socket.sendMessage(sender, { 
                    text: '🎬 𝗙𝗲𝘁𝗰𝗵𝗶𝗻𝗴 𝗠𝗼𝘃𝗶𝗲 𝗗𝗲𝘁𝗮𝗶𝗹𝘀...' 
                }, { quoted: replyMek });

                try {
                    const infoResponse = await axios.get(`http://nexoraapi.laksidunimsara.com/pupilvideo/movie?url=${encodeURIComponent(selectedMovie.url)}&api_key=lakiya_6dfa6b43064dd56b5c71acb12fc9b30e4d88dd0deb19c8b14f897d12fc87b8e6`);
                    const infoData = infoResponse.data;

                    if (!infoData.status || !infoData.data) {
                        throw new Error('Failed to fetch movie details');
                    }

                    const movieInfo = infoData.data;
                    const allDownloadLinks = movieInfo.download_links || [];
                    const filteredLinks = allDownloadLinks;

                    if (filteredLinks.length === 0) {
                        await socket.sendMessage(sender, {
                            text: '❌ NO DOWNLOADS\n\n*No download links available for this movie!*'
                        }, { quoted: replyMek });
                        return;
                    }
                    
                    const processedLinks = filteredLinks.map(link => {
                        const url = link.url || '';
                        if (url.includes('iws.sinhalachr.workers.dev') && !url.includes('download=true')) {
                            const separator = url.includes('?') ? '&' : '?';
                            return {
                                ...link,
                                url: url + separator + 'download=true'
                            };
                        }
                        return link;
                    });
                    
                    const detailsText = 
`🎬 〔 𝗠𝗢𝗩𝗜𝗘 𝗗𝗘𝗧𝗔𝗜𝗟𝗦 〕

☘️ Title: ${movieInfo.title}

⭐ IMDB Rating: ${movieInfo.metadata?.imdb_rating || 'N/A'}/10
📅 Release Year: ${movieInfo.metadata?.year || 'N/A'}
⏳ Duration: ${movieInfo.metadata?.runtime || 'N/A'}
🎭 Genres: ${movieInfo.categories?.join(', ') || 'N/A'}
✍️ Author: ${movieInfo.author || 'N/A'}

📖 Story:
${movieInfo.description?.substring(0, 200) || 'No description available'}...`;

                    await socket.sendMessage(sender, {
                        image: { url: movieInfo.poster || sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                        caption: detailsText
                    }, { quoted: replyMek });
                    
                    const downloadOptionsText = `☘️ 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 𝗢𝗣𝗧𝗜𝗢𝗡𝗦 \n\nReply with number to download:\n\n${processedLinks.map((d, i) => {
                        let platformEmoji = '📥';
                        if (d.url.includes('t.me/')) platformEmoji = '📱';
                        if (d.url.includes('cloud.sinhalachr.workers.dev')) platformEmoji = '☁️';
                        if (d.url.includes('iws.sinhalachr.workers.dev')) platformEmoji = '🌐';
                        
                        return `${i + 1}. ${platformEmoji} ${d.quality || 'Unknown'} | ${d.platform || 'Direct'} | ${d.file_size || 'N/A'}`;
                    }).join('\n')}\n\n${config.BOT_FOOTER}`;

                    const downloadMsg = await socket.sendMessage(sender, { text: downloadOptionsText }, { quoted: replyMek });
                    const infoMsgID = downloadMsg.key.id;
                    
                    const handleDownload = async ({ messages: downloadMessages }) => {
                        const downloadMek = downloadMessages[0];
                        if (!downloadMek?.message) return;

                        const downloadChoice = downloadMek.message.conversation || downloadMek.message.extendedTextMessage?.text;
                        const isReplyToInfoMsg = downloadMek.message.extendedTextMessage?.contextInfo?.stanzaId === infoMsgID;

                        if (isReplyToInfoMsg && sender === downloadMek.key.remoteJid) {
                            const choiceNum = parseInt(downloadChoice) - 1;
                            
                            if (isNaN(choiceNum) || choiceNum < 0 || choiceNum >= processedLinks.length) {
                                await socket.sendMessage(sender, {
                                    text: `❌ INVALID SELECTION\n\n*Invalid number! Choose between 1-${processedLinks.length}!*`
                                }, { quoted: downloadMek });
                                return;
                            }

                            const selectedDownload = processedLinks[choiceNum];
                            const downloadUrl = selectedDownload.url;
                            
                            await socket.sendMessage(sender, { 
                                text: `⏳ Getting your download link...` 
                            }, { quoted: downloadMek });

                            try {
                                await socket.sendMessage(sender, { react: { text: '📥', key: downloadMek.key } });
                                
                                if (downloadUrl.includes('t.me/')) {
                                    await socket.sendMessage(sender, {
                                        text: `🔗 Telegram Download Link\n\n${downloadUrl}\n\n⚠️ Click the link above to download from Telegram.`
                                    }, { quoted: downloadMek });
                                } 
                                else if (downloadUrl.includes('sinhalachr.workers.dev')) {
                                    await socket.sendMessage(sender, {
                                        document: { url: downloadUrl },
                                        mimetype: 'video/mp4',
                                        fileName: `${movieInfo.title} [${selectedDownload.quality || 'WEB-DL'}].mp4`,
                                        caption: `${movieInfo.title}\n\n[${selectedDownload.quality || 'WEB-DL'} - ${selectedDownload.file_size || 'N/A'}]\n${config.BOT_FOOTER}`
                                    }, { quoted: downloadMek });
                                } else {
                                    await socket.sendMessage(sender, {
                                        document: { url: downloadUrl },
                                        mimetype: 'video/mp4',
                                        fileName: `${movieInfo.title} [${selectedDownload.quality || 'WEB-DL'}].mp4`,
                                        caption: `${movieInfo.title}\n\n[${selectedDownload.quality || 'WEB-DL'} - ${selectedDownload.file_size || 'N/A'}]\n${config.BOT_FOOTER}`
                                    }, { quoted: downloadMek });
                                }

                                await socket.sendMessage(sender, { react: { text: '✅', key: downloadMek.key } });

                            } catch (downloadError) {
                                console.error('Download error:', downloadError);
                                await socket.sendMessage(sender, {
                                    text: `❌ DOWNLOAD ERROR\n\n*Error getting download link.*\nPlease try again later.`
                                }, { quoted: downloadMek });
                            } finally {
                                socket.ev.off('messages.upsert', handleDownload);
                                socket.ev.off('messages.upsert', handleSelection);
                            }
                        }
                    };

                    socket.ev.on('messages.upsert', handleDownload);

                } catch (infoError) {
                    console.error('Movie info error:', infoError);
                    await socket.sendMessage(sender, {
                        text: `❌ ERROR\n\n*Error getting movie details:* ${infoError.message}`
                    }, { quoted: replyMek });
                    socket.ev.off('messages.upsert', handleSelection);
                }
            }
        };

        socket.ev.on('messages.upsert', handleSelection);

    } catch (error) {
        console.error('Movie command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ ERROR\n\n*An error occurred:* ${error.message || 'Unknown error'}`
        }, { quoted: msg });
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
