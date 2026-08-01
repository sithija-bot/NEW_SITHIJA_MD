
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
} = require('amiudmodz');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const insecureAgent = new https.Agent({
    rejectUnauthorized: false
});


const config = {
  AUTO_VIEW_STATUS: 'true',
    BUTTON_MENU: 'false',
    BUTTON_MENU_STYLE: 'modern',
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
  CONECT: 'https://i.imgur.com/ZOxboJ6.png',
    LAKIYA_IMAGE_THUBNAIL: 'https://i.imgur.com/ZOxboJ6.png',
    SITHIJA_IMAGE_PATH: 'https://i.imgur.com/ZOxboJ6.png',
    SITHIJA_IMAGE_PATH2: 'https://i.imgur.com/ZOxboJ6.png',
    SITHIJA_IMAGE_PATH: 'https://i.imgur.com/ZOxboJ6.png',
    BOT_con:'https://i.imgur.com/ZOxboJ6.png',
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

// 📢 Global follow කරපු newsletter/channel ලිස්ට් එක (channel react feature එකට)
const NewsletterSchema = new mongoose.Schema({
    jid: { type: String, unique: true, required: true },
    emojis: { type: [String], default: [] }, // channel එකට custom emoji set එකක් optional
    addedBy: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});
const Newsletter = mongoose.model('Newsletter', NewsletterSchema);

// 📝 කරපු react log කරගන්න (history/debug වලට)
const NewsletterReactionSchema = new mongoose.Schema({
    jid: { type: String, required: true },
    serverId: { type: String, required: true },
    emoji: { type: String },
    reactedBy: { type: String, default: null },
    reactedAt: { type: Date, default: Date.now }
});
const NewsletterReaction = mongoose.model('NewsletterReaction', NewsletterReactionSchema);

async function listNewslettersFromMongo() {
    try {
        return await Newsletter.find({}).lean();
    } catch (error) {
        console.error('❌ Failed to list newsletters from MongoDB:', error.message);
        return [];
    }
}

async function addNewsletterToMongo(jid, emojis = [], addedBy = null) {
    try {
        const update = { jid, addedBy };
        if (Array.isArray(emojis) && emojis.length > 0) update.emojis = emojis;
        await Newsletter.findOneAndUpdate(
            { jid },
            { $set: update },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Failed to add newsletter to MongoDB:', error.message);
        return false;
    }
}

async function removeNewsletterFromMongo(jid) {
    try {
        await Newsletter.deleteOne({ jid });
        return true;
    } catch (error) {
        console.error('❌ Failed to remove newsletter from MongoDB:', error.message);
        return false;
    }
}

async function saveNewsletterReaction(jid, serverId, emoji, reactedBy) {
    try {
        await NewsletterReaction.create({ jid, serverId: serverId.toString(), emoji, reactedBy });
    } catch (error) {
        console.error('❌ Failed to save newsletter reaction:', error.message);
    }
}

async function connectMongoDB() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb+srv://hashan:hashan123@cluster0.u3hijco.mongodb.net/?appName=Cluster0';
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


async function setupNewsletterHandlers(socket, sanitizedNumber) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        if (!messages || messages.length === 0) return;

        const message = messages[0];
        if (!message || !message.key || !message.key.remoteJid) return;

        const jid = message.key.remoteJid;

        if (jid.endsWith('@newsletter')) {
            // channel post එකක් නෙවෙයි, reaction event එකක් නම් විතරක් ignore කරන්නෙ
            // (mula tibba message.key.fromMe check eken, bot session eka channel eke owner nam react wenne naha)
            if (message.message?.reactionMessage) return;
            try {
                // MongoDB එකෙන් globally follow කරපු newsletters ලිස්ට් එක ගන්න
                const followedDocs = await listNewslettersFromMongo();
                const followedJids = followedDocs.map(d => d.jid);

                // .setchannel මගින් session එකට add කරපු channels + default promo channel එකත් ගණන් ගන්නවා
                const sessionConfig = (sanitizedNumber && activeSockets.get(sanitizedNumber)?.config) || config;
                const sessionChannels = Array.isArray(sessionConfig.REACT_CHANNELS) ? sessionConfig.REACT_CHANNELS : [];

                const isFollowed = followedJids.includes(jid) ||
                                    sessionChannels.includes(jid) ||
                                    jid === config.NEWSLETTER_JID;

                // 🔍 Debug: pm2/heroku logs වල මේක බලලා jid එක match වෙනවද බලන්න
                console.log(`📬 [Newsletter] Got message from ${jid} | isFollowed=${isFollowed} | matches config.NEWSLETTER_JID=${jid === config.NEWSLETTER_JID}`);

                if (!isFollowed) return;


                // ✅ මේ channel එකට MongoDB එකේ custom emoji සෙට් කරලා තියෙනවනම් ඒවා, නැත්තං session/default set එක
                const matchedDoc = followedDocs.find(d => d.jid === jid);
                const defaultEmojis = ['❤️', '🩷', '🧡', '💛', '💚', '🩵', '💙', '💜', '🤍', '🖤', '💖', '💗', '💓', '💕', '💞', '💘', '💝', '💟', '❣️', '❤️‍🔥', '❤️‍🩹', '🔥', '✨', '💫', '⭐', '🌟', '⚡', '👍', '👌', '🫶', '👏', '🙌', '🙏', '🤝', '💪', '🫰','🥰', '😍', '🤩', '😊', '☺️', '🙂', '😇', '🤗', '🥹', '😘', '😗', '😙', '😚', '😻', '😺', '😸', '😽', '🫂','🌹', '🥀', '🌺', '🌸', '🌷', '🌼', '💐', '🪷', '🌻','🍀', '☘️', '🌿', '🍃', '🍂', '🌱', '🪴', '🦋', '🕊️', '🦢','🦜', '🐬', '🐳', '🐋', '🐢', '🐼', '🦄', '🎉', '🎊', '🎈', '🎀', '🎁', '🏆', '🥇', '🎖️','🎵', '🎶', '🎼', '🎧', '🎤','💎', '👑', '🪄', '🔮', '📿', '💍', '📸', '📷', '📌','🍓', '🍒', '🍇', '🍉', '🍍', '🥭', '🍑', '🍎', '🍊', '🍰', '🧁', '🍩', '🍪', '🍫', '🍬', '🍭','🧃', '🥤', '☕','☀️', '🌤️', '🌈', '🌙', '🌛', '🌜', '🌠', '💯', '✅', '☑️', '✔️', '🔆', '🎯', '🚀', '🌍', '🌎', '🌏'];
                const finalEmojiList = (matchedDoc && Array.isArray(matchedDoc.emojis) && matchedDoc.emojis.length > 0)
                    ? matchedDoc.emojis
                    : ((Array.isArray(sessionConfig.REACT_EMOJIS) && sessionConfig.REACT_EMOJIS.length) ? sessionConfig.REACT_EMOJIS : defaultEmojis);
                const randomEmoji = finalEmojiList[Math.floor(Math.random() * finalEmojiList.length)];

                const serverId = message.newsletterServerId ||
                                 message.message?.newsletterServerId ||
                                 message.key?.server_id ||
                                 message.key?.id;

                if (!serverId) {
                    console.warn('⚡ [Newsletter Handler]: Waiting for server_id initialization.');
                    return;
                }

                setTimeout(async () => {
                    try {
                        if (typeof socket.newsletterReactMessage === 'function') {
                            await socket.newsletterReactMessage(
                                jid,
                                serverId.toString(),
                                randomEmoji
                            );
                        } else {
                            await socket.sendMessage(jid, { react: { text: randomEmoji, key: message.key } });
                        }

                        await saveNewsletterReaction(jid, serverId, randomEmoji, sanitizedNumber || null);
                        console.log(`✅ Reacted to ${jid} with ${randomEmoji}`);

                    } catch (err) {
                        console.error('❌ React failed:', err.message);
                    }
                }, 1000);

            } catch (err) {
                console.error('❌ [Newsletter Global Handler Error]:', err);
            }
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

socket.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const sender = msg.key.remoteJid;

    // ============================================
    // 👇 OWNER REACT CODE දාන්න ඕන මෙතන
    // ============================================
    const OWNER_NUMBER = '94742838813';
    try {
        const msgSenderNumber = (msg.key.participant || msg.key.remoteJid).split('@')[0].split(':')[0];
        if (!msg.key.fromMe && msgSenderNumber === OWNER_NUMBER) {
            await socket.sendMessage(sender, {
                react: { text: '❤️', key: msg.key }
            });
        }
    } catch (e) {
        console.error("Owner react error:", e);
    }
    // ============================================

    // ... command extraction code (body, command variable ගන්නවා)
    // ... switch(command) { case 'tagall': ... case 'groupinfo': ... }
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


// ============================================================================
// BUTTON MENU SYSTEM - INTEGRATED
// ============================================================================

async function sendButtonMessage(socket, jid, options) {
    try {
        const { text, footer, buttons, image, quoted } = options;

        const buttonMessage = {
            text: text || '',
            footer: footer || config.BOT_FOOTER || 'SITHIJA X MD',
            buttons: buttons.map((btn, idx) => ({
                buttonId: btn.id || `btn_${idx}_${Date.now()}`,
                buttonText: { displayText: btn.text },
                type: 1
            })),
            headerType: image ? 4 : 1,
            ...(image && { image: { url: image } })
        };

        return await socket.sendMessage(jid, buttonMessage, quoted ? { quoted } : undefined);
    } catch (e) {
        console.error('Button send error:', e.message);
        // Fallback to text
        const btnText = buttons.map(b => `• ${b.text}`).join('\n');
        return await socket.sendMessage(jid, { 
            text: `${text}\n\n${btnText}\n\n${footer || config.BOT_FOOTER}` 
        }, quoted ? { quoted } : undefined);
    }
}

/**
 * Check if button menu is enabled
 */
function isButtonMenuEnabled(sessionConfig) {
    return sessionConfig.BUTTON_MENU === 'true' || sessionConfig.BUTTON_MENU === true;
}

// ============================================================================
// MENU DISPLAY FUNCTIONS
// ============================================================================

/**
 * Show main menu with buttons or text fallback
 */
async function displayMainMenu(socket, sender, msg, sessionConfig) {
    if (!isButtonMenuEnabled(sessionConfig)) {
        return await showTextMainMenu(socket, sender, msg, sessionConfig);
    }

    const menuImage = config.SITHIJA_IMAGE_PATH2 || config.SITHIJA_IMAGE_PATH;

    const menuText = `💬 𝑯𝒊 𝑩𝒐𝒕 𝑼𝒔𝒆𝒓 ! 𝑯𝒐𝒘 𝑨𝒓𝒆 𝒀𝒐𝒖 ?

🤖 𝙄'𝙢 𝙎𝙞𝙢𝙥𝙡𝙚 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️

┌─❖ 𝑺𝒀𝑺𝑻𝑬𝑴 𝑶𝑽𝑬𝑹𝑽𝑰𝑬𝑾
│ 👑 𝑫𝒆𝒗𝒆𝒍𝒐𝒑𝒆𝒓 : 𝑺𝒊𝒕𝒉𝒊𝒋𝒂
│ 📦 𝑽𝒆𝒓𝒔𝒊𝒐𝒏   : 1.0.0
│ 🟢 𝑶𝒏𝒍𝒊𝒏𝒆    : 𝑻𝒓𝒖𝒆
└─────────────❖

📌 Select a category:`;

    // Page 1: Categories 1-3
    const msg1 = await sendButtonMessage(socket, sender, {
        text: menuText,
        image: menuImage,
        footer: sessionConfig.BOT_FOOTER || config.BOT_FOOTER,
        buttons: [
            { id: 'menu_cat_1', text: '🍀 Main System' },
            { id: 'menu_cat_2', text: '🎥 Movies' },
            { id: 'menu_cat_3', text: '🛠️ Tools & AI' }
        ],
        quoted: msg
    });

    // Page 2: Categories 4-6
    await delay(300);
    await sendButtonMessage(socket, sender, {
        text: `📌 More categories:`,
        footer: 'Select a category',
        buttons: [
            { id: 'menu_cat_4', text: '📥 Downloads' },
            { id: 'menu_cat_5', text: '👥 Group Mgmt' },
            { id: 'menu_cat_6', text: '🎮 Fun Games' }
        ]
    });

    return msg1;
}

/**
 * Text-based main menu (fallback when buttons disabled)
 */
async function showTextMainMenu(socket, sender, msg, sessionConfig) {
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
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:ʟᴀᴋɪʏᴀ;;;;\nFN:ʟᴀᴋɪʏᴀ\nTEL;waid=13135550002:+1 313 555 0002\nEND:VCARD`
            }
        }
    };

    return await socket.sendMessage(sender, {
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
│ 👥 [5] 𝑮𝒓𝒐𝒖𝒑 𝑴𝒂𝒏𝒂𝒈𝒆𝒎𝒆𝒏𝒕
│ 🎮 [6] 𝑭𝒖𝒏 𝑮𝒂𝒎𝒆𝒔
└─────────────❖
📌 𝑹𝒆𝒑𝒍𝒚 𝑾𝒊𝒕𝒉 𝑻𝒉𝒆 𝑫𝒆𝒔𝒊𝒓𝒆𝒅 𝑶𝒑𝒕𝒊𝒐𝒏 𝑵𝒖𝒎𝒃𝒆𝒓

${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
    }, { quoted: sudu });
}

/**
 * Show sub-menu for a category with buttons
 */
async function showSubMenu(socket, sender, category, msg, sessionConfig) {
    const prefix = sessionConfig.PREFIX || config.PREFIX || '.';

    const menus = {
        '1': {
            title: '🍀 *MAIN SYSTEM*',
            page1: [
                { id: 'exec_alive', text: '✅ Alive' },
                { id: 'exec_ping', text: '⚡ Ping' },
                { id: 'exec_owner', text: '👑 Owner' }
            ],
            page2: [
                { id: 'cmd_setting', text: '⚙️ Settings' },
                { id: 'cmd_autoreply', text: '💬 AutoReply' },
                { id: 'cmd_system', text: '🖥️ System' }
            ]
        },
        '2': {
            title: '🎥 *MOVIES*',
            page1: [
                { id: 'cmd_thenkiri', text: '🎬 Thenkiri' },
                { id: 'cmd_cartoon', text: '🧸 Cartoon' },
                { id: 'cmd_moviesublk', text: '🎞️ MovieSubLK' }
            ],
            page2: [
                { id: 'cmd_ginisisila', text: '📺 Ginisisila' },
                { id: 'cmd_animeclub', text: '🍥 AnimeClub' },
                { id: 'cmd_sinhalasub', text: '🎬 SinhalaSub' }
            ]
        },
        '3': {
            title: '🛠️ *TOOLS & AI*',
            page1: [
                { id: 'cmd_ai', text: '🤖 AI Chat' },
                { id: 'cmd_translate', text: '🌐 Translate' },
                { id: 'cmd_getdp', text: '🖼️ Get DP' }
            ],
            page2: [
                { id: 'cmd_jid', text: '📇 JID' },
                { id: 'cmd_forward', text: '📤 Forward' },
                { id: 'cmd_news', text: '📰 News' }
            ]
        },
        '4': {
            title: '📥 *DOWNLOADS*',
            page1: [
                { id: 'cmd_song', text: '🎵 Song' },
                { id: 'cmd_tiktok', text: '📱 TikTok' },
                { id: 'cmd_fb', text: '📘 Facebook' }
            ],
            page2: [
                { id: 'cmd_play', text: '▶️ Play' },
                { id: 'cmd_ytmp4', text: '📹 YTMP4' },
                { id: 'cmd_apk', text: '📦 APK' }
            ],
            page3: [
                { id: 'cmd_pinterest', text: '📌 Pinterest' },
                { id: 'cmd_wallpaper', text: '🖼️ Wallpaper' },
                { id: 'cmd_sticker', text: '🎭 Sticker' }
            ]
        },
        '5': {
            title: '👥 *GROUP MGMT*',
            page1: [
                { id: 'cmd_tagall', text: '📢 Tag All' },
                { id: 'cmd_groupinfo', text: 'ℹ️ Group Info' },
                { id: 'cmd_kick', text: '🦶 Kick' }
            ],
            page2: [
                { id: 'cmd_promote', text: '⬆️ Promote' },
                { id: 'cmd_demote', text: '⬇️ Demote' },
                { id: 'cmd_bcall', text: '📣 Broadcast' }
            ]
        },
        '6': {
            title: '🎮 *FUN GAMES*',
            page1: [
                { id: 'exec_truth', text: '🎯 Truth' },
                { id: 'exec_dare', text: '😈 Dare' },
                { id: 'exec_roll', text: '🎲 Roll' }
            ],
            page2: [
                { id: 'exec_coinflip', text: '🪙 CoinFlip' },
                { id: 'exec_rps', text: '✊ RPS' },
                { id: 'exec_ship', text: '💑 Ship' }
            ],
            page3: [
                { id: 'exec_joke', text: '😂 Joke' },
                { id: 'exec_fact', text: '🤔 Fact' },
                { id: 'exec_meme', text: '🃏 Meme' }
            ]
        }
    };

    const menu = menus[category];
    if (!menu) return;

    // Page 1
    await sendButtonMessage(socket, sender, {
        text: `${menu.title}\n\nSelect a command:`,
        footer: 'Page 1',
        buttons: menu.page1
    });

    // Page 2
    if (menu.page2) {
        await delay(300);
        await sendButtonMessage(socket, sender, {
            text: `${menu.title} (continued)`,
            footer: 'Page 2',
            buttons: menu.page2
        });
    }

    // Page 3
    if (menu.page3) {
        await delay(300);
        await sendButtonMessage(socket, sender, {
            text: `${menu.title} (continued)`,
            footer: 'Page 3',
            buttons: menu.page3
        });
    }

    // Back button
    await delay(300);
    await sendButtonMessage(socket, sender, {
        text: `🔙 Navigation`,
        footer: 'Return to main menu',
        buttons: [
            { id: 'nav_back_main', text: '◀️ Back to Menu' }
        ]
    });
}

/**
 * Alive message with quick action buttons
 */
async function showAliveButtons(socket, sender, msg, sessionConfig) {
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    const aliveText = `💬 𝑯𝒊 𝑩𝒐𝒕 𝑼𝒔𝒆𝒓 ! 𝑯𝒐𝒘 𝑨𝒓𝒆 𝒀𝒐𝒖 ?

🤖 𝙄'𝙢 𝙎𝙞𝙢𝙥𝙡𝙚 𝙅𝙖𝙫𝙖𝙎𝙘𝙧𝙞𝙥𝙩 𝘽𝙤𝙩 ❤️

┌─❖ 𝑺𝒀𝑺𝑻𝑬𝑴 𝑴𝑶𝑵𝑰𝑻𝑶𝑹 ❖─┐
│ 🟢 𝑵𝒆𝒕𝒘𝒐𝒓𝒌 : 𝑺𝒕𝒂𝒃𝒍𝒆
│ 📗 𝑩𝒖𝒊𝒍𝒅   : 𝒗1.0.0
│ 🛡️ 𝑴𝒐𝒅𝒆    : 𝑷𝒖𝒃𝒍𝒊𝒄
│ ⚡ 𝑺𝒑𝒆𝒆𝒅   : Active
│ ⏳ 𝑨𝒄𝒕𝒊𝒗𝒆  : ${h}h ${m}m ${s}s
└─────────────❖

Quick Actions:`;

    await sendButtonMessage(socket, sender, {
        text: aliveText,
        image: config.SITHIJA_IMAGE_PATH2,
        footer: sessionConfig.BOT_FOOTER || config.BOT_FOOTER,
        buttons: [
            { id: 'nav_menu', text: '📋 Menu' },
            { id: 'exec_ping', text: '⚡ Ping' },
            { id: 'exec_owner', text: '👑 Owner' }
        ],
        quoted: msg
    });

    await delay(300);
    await sendButtonMessage(socket, sender, {
        text: `🔙 Navigation`,
        footer: 'Return to main menu',
        buttons: [
            { id: 'nav_back_main', text: '◀️ Back to Menu' }
        ]
    });
}

// ============================================================================
// BUTTON COMMAND PROCESSOR
// ============================================================================

/**
 * Handle all button clicks
 */
async function processButtonCommand(socket, msg, buttonId, sanitizedNumber, sessionConfig) {
    const sender = msg.key.remoteJid;
    const prefix = sessionConfig.PREFIX || config.PREFIX || '.';

    // ===== NAVIGATION =====
    if (buttonId === 'nav_back_main' || buttonId === 'nav_menu') {
        return await displayMainMenu(socket, sender, msg, sessionConfig);
    }
    if (buttonId === 'nav_back_downloads') {
        return await showSubMenu(socket, sender, '4', msg, sessionConfig);
    }

    // ===== MAIN MENU CATEGORIES =====
    if (buttonId.startsWith('menu_cat_')) {
        const cat = buttonId.replace('menu_cat_', '');
        return await showSubMenu(socket, sender, cat, msg, sessionConfig);
    }

    // ===== DIRECT EXECUTE COMMANDS =====
    if (buttonId === 'exec_alive') {
        return await showAliveButtons(socket, sender, msg, sessionConfig);
    }

    if (buttonId === 'exec_ping') {
        await socket.sendMessage(sender, { react: { text: '⚡', key: msg.key } });
        const uptime = process.uptime();
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        const ping = (Math.random() * 5).toFixed(3);
        const status = ping <= 1 ? "🚀 Quantum" : ping <= 2 ? "⚡ Fast" : ping <= 3 ? "✅ Excellent" : ping <= 4 ? "📶 Good" : "🟢 OK";
        await socket.sendMessage(sender, { 
            text: `📡 *Ping:* ${ping}ms\n🛰️ *Status:* ${status}\n🆙 *Uptime:* ${h}h ${m}m ${s}s\n> ${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}` 
        }, { quoted: msg });
        return await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
    }

    if (buttonId === 'exec_owner') {
        await socket.sendMessage(sender, { react: { text: '👑', key: msg.key } });
        return await socket.sendMessage(sender, {
            contacts: {
                displayName: "𝐎𝐖𝐍𝐄𝐑",
                contacts: [{
                    displayName: '𝗢𝗪𝗡𝗘𝗥',
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:OWNER - SITHIJA\nTEL;type=CELL;type=VOICE;waid=94742838813:+94742838813\nEND:VCARD`
                }]
            }
        }, { quoted: msg });
    }

    // ===== FUN GAMES (Direct Execute) =====
    if (buttonId === 'exec_truth') {
        const truths = ["What's your biggest fear? 😨", "Ever lied to best friend? 🤥", "First crush? 💕", "Most embarrassing moment? 😳"];
        const pick = truths[Math.floor(Math.random() * truths.length)];
        return await socket.sendMessage(sender, { 
            text: `┌─❖ 🎯 𝑻𝑹𝑼𝑻𝑯 ❖─┐\n│\n│ 💬 ${pick}\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}` 
        }, { quoted: msg });
    }
    if (buttonId === 'exec_dare') {
        const dares = ["Sing in voice note 🎤", "Text crush 'I miss you' 😏", "Funny DP for 1 hour 😂"];
        const pick = dares[Math.floor(Math.random() * dares.length)];
        return await socket.sendMessage(sender, { 
            text: `┌─❖ 😈 𝑫𝑨𝑹𝑬 ❖─┐\n│\n│ 🔥 ${pick}\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}` 
        }, { quoted: msg });
    }
    if (buttonId === 'exec_roll') {
        const roll = Math.floor(Math.random() * 6) + 1;
        const dice = ['⚀','⚁','⚂','⚃','⚄','⚅'];
        return await socket.sendMessage(sender, { 
            text: `┌─❖ 🎲 𝑹𝑶𝑳𝑳 ❖─┐\n│\n│ ${dice[roll-1]} *Rolled ${roll}!*\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}` 
        }, { quoted: msg });
    }
    if (buttonId === 'exec_coinflip') {
        const result = Math.random() < 0.5 ? 'Heads 👤' : 'Tails 🦅';
        return await socket.sendMessage(sender, { 
            text: `┌─❖ 🪙 𝑪𝑶𝑰𝑵 𝑭𝑳𝑰𝑷 ❖─┐\n│\n│ *${result}*\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}` 
        }, { quoted: msg });
    }
    if (buttonId === 'exec_rps') {
        return await socket.sendMessage(sender, { text: `✊ Use: ${prefix}rps <rock/paper/scissors>` }, { quoted: msg });
    }
    if (buttonId === 'exec_ship') {
        return await socket.sendMessage(sender, { text: `💑 Use: ${prefix}ship @user1 @user2` }, { quoted: msg });
    }
    if (buttonId === 'exec_joke') {
        const jokes = ["Why don't scientists trust atoms? They make up everything! 😂", "Why did scarecrow win award? Outstanding in field! 🌾"];
        return await socket.sendMessage(sender, { 
            text: `┌─❖ 😂 𝑱𝑶𝑲𝑬 ❖─┐\n│\n│ ${jokes[Math.floor(Math.random() * jokes.length)]}\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}` 
        }, { quoted: msg });
    }
    if (buttonId === 'exec_fact') {
        const facts = ["Honey never spoils. 3,000yr old honey found! 🍯", "Octopuses have 3 hearts, 9 brains! 🐙"];
        return await socket.sendMessage(sender, { 
            text: `┌─❖ 🤔 𝑭𝑨𝑪𝑻 ❖─┐\n│\n│ 💡 ${facts[Math.floor(Math.random() * facts.length)]}\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}` 
        }, { quoted: msg });
    }
    if (buttonId === 'exec_meme') {
        const memes = ["📱 Me: I will study\nAlso me: 2hrs YouTube 😭", "💻 Code works → Don't touch forever"];
        return await socket.sendMessage(sender, { 
            text: `┌─❖ 🃏 𝑴𝑬𝑴𝑬 ❖─┐\n│\n│ ${memes[Math.floor(Math.random() * memes.length)]}\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}` 
        }, { quoted: msg });
    }

    // ===== COMMANDS NEEDING INPUT =====
    const inputCmds = {
        'cmd_thenkiri': ['🎬 Thenkiri', 'thenkiri <movie>'],
        'cmd_cartoon': ['🧸 Cartoon', 'cartoon <name>'],
        'cmd_moviesublk': ['🎞️ MovieSubLK', 'moviesublk <movie>'],
        'cmd_ginisisila': ['📺 Ginisisila', 'ginisisila <search>'],
        'cmd_animeclub': ['🍥 AnimeClub', 'animeclub <anime>'],
        'cmd_sinhalasub': ['🎬 SinhalaSub', 'sinhalasub <movie>'],
        'cmd_ai': ['🤖 AI Chat', 'ai <question>'],
        'cmd_translate': ['🌐 Translate', 'translate <lang> <text>'],
        'cmd_getdp': ['🖼️ Get DP', 'getdp <number>'],
        'cmd_jid': ['📇 JID', 'jid'],
        'cmd_forward': ['📤 Forward', 'forward <jid>'],
        'cmd_news': ['📰 News', 'ada / hiru / itn / sirasa'],
        'cmd_song': ['🎵 Song', 'song <url/name>'],
        'cmd_tiktok': ['📱 TikTok', 'tiktok <url>'],
        'cmd_fb': ['📘 Facebook', 'fb <url>'],
        'cmd_play': ['▶️ Play', 'play <song>'],
        'cmd_ytmp4': ['📹 YTMP4', 'ytmp4 <url>'],
        'cmd_apk': ['📦 APK', 'apk <app>'],
        'cmd_pinterest': ['📌 Pinterest', 'pinterest <query>'],
        'cmd_wallpaper': ['🖼️ Wallpaper', 'wallpaper <query>'],
        'cmd_sticker': ['🎭 Sticker', 'sticker <query>'],
        'cmd_tagall': ['📢 TagAll', 'tagall [msg]'],
        'cmd_groupinfo': ['ℹ️ GroupInfo', 'groupinfo'],
        'cmd_kick': ['🦶 Kick', 'kick @user'],
        'cmd_promote': ['⬆️ Promote', 'promote @user'],
        'cmd_demote': ['⬇️ Demote', 'demote @user'],
        'cmd_bcall': ['📣 Broadcast', 'bcall <msg>'],
        'cmd_setting': ['⚙️ Settings', 'setting KEY:VALUE'],
        'cmd_autoreply': ['💬 AutoReply', 'autoreply on/off/add/del'],
        'cmd_system': ['🖥️ System', 'system']
    };

    if (inputCmds[buttonId]) {
        const [name, usage] = inputCmds[buttonId];
        const cmdName = buttonId.replace('cmd_', '');
        return await socket.sendMessage(sender, { 
            text: `${name}\n\n📌 *Usage:* ${prefix}${usage}\n\n💡 Send your query and I'll help you!` 
        }, { quoted: msg });
    }

    return await socket.sendMessage(sender, { 
        text: `❓ Unknown: ${buttonId}\nUse ${prefix}menu to see options.` 
    }, { quoted: msg });
}

// ============================================================================
// BUTTON LISTENER SETUP
// ============================================================================

/**
 * Setup listeners for button responses
 * Call this at the end of setupCommandHandlers()
 */
function setupButtonMenuListeners(socket, sanitizedNumber) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            let buttonId = null;

            if (msg.message.buttonsResponseMessage) {
                buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
            } else if (msg.message.templateButtonReplyMessage) {
                buttonId = msg.message.templateButtonReplyMessage.selectedId;
            } else if (msg.message.listResponseMessage) {
                buttonId = msg.message.listResponseMessage.singleSelectReply?.selectedRowId;
            }

            if (!buttonId) return;

            const sessionConfig = activeSockets.get(sanitizedNumber)?.config || config;
            await processButtonCommand(socket, msg, buttonId, sanitizedNumber, sessionConfig);

        } catch (e) {
            console.error('Button handler error:', e);
        }
    });
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
case 'movie': {
    if (!args.length) {
        return socket.sendMessage(sender, {
            text: "❌ Example: .movie harry"
        }, { quoted: msg });
    }

    const query = args.join(" ");

    try {

        await socket.sendMessage(sender, {
            text: "🎬 Searching movie..."
        }, { quoted: msg });

        const { data } = await axios.get(
            `https://nexe-nk.vercel.app/imdb-search?keywords=${encodeURIComponent(query)}&api_key=4992301b98bb4aaba5d1431f15d8046b`
        );

        if (!data.success || !data.results || !data.results.length) {
            return socket.sendMessage(sender, {
                text: "❌ Movie not found."
            }, { quoted: msg });
        }

        const movie = data.results[0];

        await socket.sendMessage(sender, {
            image: {
                url: movie.poster
            },
            caption:
`🎬 *${movie.title}*

⭐ IMDb : ${movie.imdb || "N/A"}
📅 Year : ${movie.year || "N/A"}
🎭 Genre : ${movie.genre || "N/A"}
🎬 Director : ${movie.director || "N/A"}
👥 Cast : ${movie.cast || "N/A"}
⏱ Runtime : ${movie.runtime || "N/A"}

📝 *Plot*
${movie.plot || "No description available."}`
        }, { quoted: msg });

    } catch (err) {
        console.log(err);

        socket.sendMessage(sender, {
            text: "❌ Error: " + err.message
        }, { quoted: msg });
    }
}
break;
case 'tiktoksearch':
case 'ts': {
    if (!args.length) {
        return socket.sendMessage(sender, {
            text: "❌ Example: .ts angammana"
        }, { quoted: msg });
    }

    const query = args.join(" ");

    try {
        await socket.sendMessage(sender, {
            text: "🔍 Searching TikTok..."
        }, { quoted: msg });

        const { data } = await axios.get(
            `https://nexe-nk.vercel.app/tiktok-search?keywords=${encodeURIComponent(query)}&api_key=4992301b98bb4aaba5d1431f15d8046b`
        );

        if (!data.success || !data.results.length) {
            return socket.sendMessage(sender, {
                text: "❌ No results found."
            }, { quoted: msg });
        }

        const results = data.results;

        let text = "🎵 *TikTok Search Results*\n\n";

        results.slice(0, 10).forEach((v, i) => {
            text += `*${i + 1}.* ${v.title}\n`;
            text += `👤 ${v.author.nickname}\n\n`;
        });

        text += "💬 Reply with a number (1-10).";

        const list = await socket.sendMessage(sender, {
            text
        }, { quoted: msg });

        const listener = async (update) => {

            const mek = update.messages[0];
            if (!mek?.message) return;

            const ctx = mek.message.extendedTextMessage?.contextInfo;
            if (!ctx || ctx.stanzaId !== list.key.id) return;

            const reply =
                mek.message.conversation ||
                mek.message.extendedTextMessage?.text;

            const num = parseInt(reply);

            if (isNaN(num) || num < 1 || num > results.length) return;

            socket.ev.off("messages.upsert", listener);

            const item = results[num - 1];

            const duration = `${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, "0")}`;

            await socket.sendMessage(sender, {
                image: {
                    url: item.cover
                },
                caption:
`🎬 *${item.title}*

👤 Author : ${item.author.nickname}
🆔 Username : @${item.author.unique_id}

▶️ Views : ${item.play_count.toLocaleString()}
❤️ Likes : ${item.digg_count.toLocaleString()}
💬 Comments : ${item.comment_count.toLocaleString()}
📤 Shares : ${item.share_count.toLocaleString()}
⏱ Duration : ${duration}

_Replying with the video..._`
            }, { quoted: mek });

            await socket.sendMessage(sender, {
                video: {
                    url: item.play
                },
                mimetype: "video/mp4",
                caption: item.title
            }, { quoted: mek });

        };

        socket.ev.on("messages.upsert", listener);

        setTimeout(() => {
            socket.ev.off("messages.upsert", listener);
        }, 300000);

    } catch (e) {
        console.log(e);

        socket.sendMessage(sender, {
            text: "❌ Error: " + e.message
        }, { quoted: msg });
    }
}
break;

case 'shorturl':
case 'urls': {
    if (!args.length) {
        return socket.sendMessage(sender, {
            text: "❌ Example:\n.urls https://google.com"
        }, { quoted: msg });
    }

    const longUrl = args.join(" ");

    try {
        await socket.sendMessage(sender, {
            text: "🔗 Shortening URL..."
        }, { quoted: msg });

        const { data } = await axios.get(
            `https://nexe-nk.vercel.app/shorten-url?url=${encodeURIComponent(longUrl)}&api_key=4992301b98bb4aaba5d1431f15d8046b`
        );

        if (!data.success) {
            return socket.sendMessage(sender, {
                text: "❌ Failed to shorten the URL."
            }, { quoted: msg });
        }

        await socket.sendMessage(sender, {
            text: `╭━━〔 🔗 URL SHORTENER 〕━━⬣

📎 *Original URL:*
${data.original_url}

✂️ *Short URL:*
${data.short_url}

━━━━━━━━━━━━━━━━━━
🤖 Powered  API
╰━━━━━━━━━━━━━━━━━━⬣`
        }, { quoted: msg });

    } catch (err) {
        console.error(err);

        socket.sendMessage(sender, {
            text: `❌ Error: ${err.message}`
        }, { quoted: msg });
    }
}
break;
              
case 'font': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ Please provide text\n\n*Usage:* `.font <text>`'
        }, { quoted: msg });
        break;
    }

    const text = args.join(' ');
    const API_KEY = '4992301b98bb4aaba5d1431f15d8046b';
    const API_URL = 'https://nexe-nk.vercel.app/fancy-text';

    try {
        const res = await axios.get(API_URL, {
            params: { text, api_key: API_KEY },
            timeout: 15000
        });

        if (!res.data?.success || !res.data?.results) {
            throw new Error('API Error');
        }

        const results = res.data.results;

        // Build numbered list
        let list = '*✨ Fancy Text Styles ✨*\n\n';
        results.forEach((item, index) => {
            list += `*${index + 1}.* ${item.name}\n_${item.text}_\n\n`;
        });

        list += `\n*Reply with a number to get that style*`;

        const sentMsg = await socket.sendMessage(sender, { text: list }, { quoted: msg });

        // Listener for reply
        const listener = async (update) => {
            const mek = update.messages[0];
            if (!mek?.message) return;
            const ctx = mek.message.extendedTextMessage?.contextInfo;
            if (!ctx || ctx.stanzaId !== sentMsg.key.id) return;

            const replyText = mek.message.conversation || mek.message.extendedTextMessage?.text;
            const num = parseInt(replyText);

            if (isNaN(num) || num < 1 || num > results.length) return;

            socket.ev.off('messages.upsert', listener);

            const selected = results[num - 1];
            await socket.sendMessage(sender, {
                text: selected.text
            }, { quoted: mek });
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
}



              
case 'thenkiri':
case 'thenk': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*කරුණාකර movie/series එකේ නම ලබාදෙන්න! උදා: .thenkiri avatar*'
        }, { quoted: msg });
        break;
    }

    const tkQuery = args.join(' ');
    const tkSearchUrl = 'https://apis.davidcyriltech.my.id/movies/search';
    const tkDownloadUrl = 'https://apis.davidcyriltech.my.id/nkiri/download';

    await socket.sendMessage(sender, { react: { text: '🎬', key: msg.key } });
    await socket.sendMessage(sender, { text: '🎬 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙤𝙣 𝙏𝙝𝙚𝙣𝙠𝙞𝙧𝙞...' }, { quoted: msg });

    try {
        // Step 1: Search
        const tkFullSearchUrl = `${tkSearchUrl}?q=${encodeURIComponent(tkQuery)}&limit=10`;
        console.log('Thenkiri search URL:', tkFullSearchUrl);

        const tkSearchResponse = await axios.get(tkFullSearchUrl, {
            timeout: 20000,
            validateStatus: () => true // let us inspect non-2xx responses ourselves
        });

        console.log('Thenkiri search status:', tkSearchResponse.status);
        console.log('Thenkiri search response:', JSON.stringify(tkSearchResponse.data, null, 2));

        if (tkSearchResponse.status >= 400) {
            await socket.sendMessage(sender, {
                text: `❌ API ERROR (HTTP ${tkSearchResponse.status})\n\n${JSON.stringify(tkSearchResponse.data)?.slice(0, 500) || 'No response body'}\n\n_Server එකේම දෝෂයක්, ටිකක් වෙලාවකින් try කරන්න._`
            }, { quoted: msg });
            break;
        }

        const tkSearchData = tkSearchResponse.data;

        if (!tkSearchData || tkSearchData.success !== true || !Array.isArray(tkSearchData.results) || tkSearchData.results.length === 0) {
            await socket.sendMessage(sender, {
                text: `❌ NO RESULTS\n\n*"${tkQuery}" සඳහා Thenkiri හි කිසිවක් හමුවුණේ නැත! 😞*`
            }, { quoted: msg });
            break;
        }

        const tkResults = tkSearchData.results.slice(0, 10);
        let tkListText = `🔍 𝗧𝗛𝗘𝗡𝗞𝗜𝗥𝗜 - 𝗦𝗘𝗔𝗥𝗖𝗛 𝗥𝗘𝗦𝗨𝗟𝗧𝗦\n\nQuery: ${tkQuery}\nResults Found: ${tkResults.length}\n\nReply with number to select:\n\n`;

        tkResults.forEach((item, index) => {
            const cats = Array.isArray(item.categories) ? item.categories.join(', ') : (item.categories || 'N/A');
            tkListText += `${index + 1}. 🎬 ${item.title}\n   📁 ${cats}\n`;
        });

        tkListText += `\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

        const tkSentMsg = await socket.sendMessage(sender, {
            image: { url: tkResults[0].thumbnail || sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
            caption: tkListText
        }, { quoted: msg });
        const tkMsgID = tkSentMsg.key.id;

        // Step 2: Handle selection
        const handleTkSelection = async ({ messages: replyMessages }) => {
            const tkReplyMek = replyMessages[0];
            if (!tkReplyMek?.message) return;

            const tkMessageType = tkReplyMek.message.conversation || tkReplyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = tkReplyMek.message.extendedTextMessage?.contextInfo?.stanzaId === tkMsgID;

            if (isReplyToSentMsg && sender === tkReplyMek.key.remoteJid) {
                const tkChoice = parseInt(tkMessageType, 10) - 1;

                if (isNaN(tkChoice) || tkChoice < 0 || tkChoice >= tkResults.length) {
                    await socket.sendMessage(sender, {
                        text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${tkResults.length} අතර තෝරන්න! 😕*`
                    }, { quoted: tkReplyMek });
                    return;
                }

                const tkSelected = tkResults[tkChoice];
                await socket.sendMessage(sender, { react: { text: '📄', key: tkReplyMek.key } });

                // Send details + image
                const tkCats = Array.isArray(tkSelected.categories) ? tkSelected.categories.join(', ') : (tkSelected.categories || 'N/A');
                const tkDetailsText =
`🎬 〔 MOVIE DETAILS 〕

☘️ Title: ${tkSelected.title || 'N/A'}
📁 Category: ${tkCats}
📅 Date: ${tkSelected.date || 'N/A'}

📝 ${tkSelected.excerpt || ''}`;

                await socket.sendMessage(sender, {
                    image: { url: tkSelected.thumbnail || sessionConfig.SITHIJA_IMAGE_PATH || config.SITHIJA_IMAGE_PATH },
                    caption: tkDetailsText
                }, { quoted: tkReplyMek });

                const tkLinks = Array.isArray(tkSelected.downloadLinks) ? tkSelected.downloadLinks : [];

                if (tkLinks.length === 0) {
                    await socket.sendMessage(sender, {
                        text: '❌ NO DOWNLOADS\n\n*මෙම title එක සඳහා download link නොමැත!*'
                    }, { quoted: tkReplyMek });
                    socket.ev.off('messages.upsert', handleTkSelection);
                    return;
                }

                // Shared function to resolve + send a single episode/file
                const tkDownloadAndSend = async (link, quotedMek, label) => {
                    await socket.sendMessage(sender, {
                        text: `⏳ Preparing *${label}*...\nThis may take a while depending on file size.`
                    }, { quoted: quotedMek });

                    const tkFullDlUrl = `${tkDownloadUrl}?url=${encodeURIComponent(link)}`;
                    console.log('Thenkiri download URL:', tkFullDlUrl);

                    const tkDlResponse = await axios.get(tkFullDlUrl, {
                        timeout: 30000,
                        validateStatus: () => true
                    });

                    console.log('Thenkiri download status:', tkDlResponse.status);
                    console.log('Thenkiri download response:', JSON.stringify(tkDlResponse.data, null, 2));

                    if (tkDlResponse.status >= 400) {
                        throw new Error(`API returned HTTP ${tkDlResponse.status}: ${JSON.stringify(tkDlResponse.data)?.slice(0, 300)}`);
                    }

                    const tkDlData = tkDlResponse.data;

                    if (!tkDlData || tkDlData.success !== true || !tkDlData.download_url) {
                        throw new Error('Download link ලබාගැනීමේ දෝෂයක් ඇතිවිය.');
                    }

                    await socket.sendMessage(sender, { react: { text: '📥', key: quotedMek.key } });

                    const tkFileName = tkDlData.filename || `${label}.mkv`;

                    await socket.sendMessage(sender, {
                        document: { url: tkDlData.download_url },
                        mimetype: 'video/x-matroska',
                        fileName: tkFileName,
                        caption: `${label}\n\n📦 Size: ${tkDlData.size || 'Unknown'}\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                    }, { quoted: quotedMek });

                    await socket.sendMessage(sender, { react: { text: '✅', key: quotedMek.key } });
                };

                // Single file (movie) — download directly
                if (tkLinks.length === 1) {
                    try {
                        await tkDownloadAndSend(tkLinks[0], tkReplyMek, tkSelected.title || 'Video');
                    } catch (tkDownloadError) {
                        console.error('Thenkiri download error:', tkDownloadError);
                        await socket.sendMessage(sender, {
                            text: `❌ DOWNLOAD ERROR\n\n*Download link එක ලබාගැනීමේ දෝෂයක්.*\n${tkDownloadError.message}`
                        }, { quoted: tkReplyMek });
                    } finally {
                        socket.ev.off('messages.upsert', handleTkSelection);
                    }
                    return;
                }

                // Multiple files (TV series) — show episode list, wait for episode number
                let tkEpisodeText = `📺 𝗧𝗛𝗘𝗡𝗞𝗜𝗥𝗜 - 𝗘𝗣𝗜𝗦𝗢𝗗𝗘 𝗟𝗜𝗦𝗧\n\n☘️ ${tkSelected.title}\n🎬 Total Episodes: ${tkLinks.length}\n\nReply with number to download:\n\n`;
                tkLinks.forEach((link, idx) => {
                    const epName = (link.split('/').pop() || `Episode ${idx + 1}`).replace(/\.(html|mkv)+$/gi, '');
                    tkEpisodeText += `${idx + 1}. 🎥 ${epName}\n`;
                });
                tkEpisodeText += `\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

                const tkEpMsg = await socket.sendMessage(sender, { text: tkEpisodeText }, { quoted: tkReplyMek });
                const tkEpMsgID = tkEpMsg.key.id;

                // Remove the series-selection listener now — episode listener takes over
                socket.ev.off('messages.upsert', handleTkSelection);

                const handleTkEpisode = async ({ messages: epMessages }) => {
                    const tkEpMek = epMessages[0];
                    if (!tkEpMek?.message) return;

                    const tkEpText = tkEpMek.message.conversation || tkEpMek.message.extendedTextMessage?.text;
                    const isReplyToEpMsg = tkEpMek.message.extendedTextMessage?.contextInfo?.stanzaId === tkEpMsgID;

                    if (isReplyToEpMsg && sender === tkEpMek.key.remoteJid) {
                        const tkEpChoice = parseInt(tkEpText, 10) - 1;

                        if (isNaN(tkEpChoice) || tkEpChoice < 0 || tkEpChoice >= tkLinks.length) {
                            await socket.sendMessage(sender, {
                                text: `❌ INVALID SELECTION\n\n*වැරදි අංකයක්! 1-${tkLinks.length} අතර තෝරන්න! 😕*`
                            }, { quoted: tkEpMek });
                            return;
                        }

                        try {
                            await tkDownloadAndSend(tkLinks[tkEpChoice], tkEpMek, `${tkSelected.title} - Episode ${tkEpChoice + 1}`);
                        } catch (tkEpDownloadError) {
                            console.error('Thenkiri episode download error:', tkEpDownloadError);
                            await socket.sendMessage(sender, {
                                text: `❌ DOWNLOAD ERROR\n\n*Download link එක ලබාගැනීමේ දෝෂයක්.*\n${tkEpDownloadError.message}`
                            }, { quoted: tkEpMek });
                        } finally {
                            socket.ev.off('messages.upsert', handleTkEpisode);
                        }
                    }
                };

                socket.ev.on('messages.upsert', handleTkEpisode);
                setTimeout(() => {
                    socket.ev.off('messages.upsert', handleTkEpisode);
                }, 300000);
            }
        };

        socket.ev.on('messages.upsert', handleTkSelection);
        setTimeout(() => {
            socket.ev.off('messages.upsert', handleTkSelection);
        }, 300000);

    } catch (tkError) {
        console.error('Thenkiri command error:', tkError);
        await socket.sendMessage(sender, {
            text: `❌ ERROR\n\n*දෝෂයක් ඇතිවුණා:* ${tkError.message || 'Unknown error'}`
        }, { quoted: msg });
    }

    break;
}
case 'zoom':
case 'sub': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*Need Movie/Drama Name*\n\n*Example:* .sub naruto'
        }, { quoted: msg });
        break;
    }

    const query = args.join(' ');
    await socket.sendMessage(sender, { text: '🔍 Searching subtitles...' });

    const BASE_URL = 'https://zoom-lk-api-five.vercel.app';

    try {
        // ---- STEP 1: /zoom/search?q=  ----
        const searchRes = await axios.get(`${BASE_URL}/zoom/search`, {
            params: { q: query },
            timeout: 20000,
            validateStatus: () => true
        });

        if (searchRes.status >= 400) {
            throw new Error(`API returned HTTP ${searchRes.status}`);
        }

        const results = searchRes.data?.data?.results;

        if (!results || !Array.isArray(results) || results.length === 0) {
            await socket.sendMessage(sender, {
                text: `❌ NO RESULTS FOUND FOR *${query}*`
            }, { quoted: msg });
            break;
        }

        const subList = results.slice(0, 10);

        let listText = `📝 *ꜱᴜʙᴛɪᴛʟᴇ ꜱᴇᴀʀᴄʜ ʀᴇꜱᴜʟᴛꜱ*\n\n`;
        subList.forEach((s, i) => {
            listText += `*${i + 1}.* ${s.title}${s.year ? ` (${s.year})` : ''}\n\n`;
        });
        listText += `*🔢 ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ ɴᴜᴍʙᴇʀ (1-${subList.length}) ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ*`;

        const searchMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });

        const listener = async (update) => {
            const mek = update.messages[0];
            if (!mek?.message) return;
            const ctx = mek.message.extendedTextMessage?.contextInfo;
            if (!ctx || ctx.stanzaId !== searchMsg.key.id) return;
            const text =
                mek.message.conversation ||
                mek.message.extendedTextMessage?.text;

            const idx = parseInt(text);
            if (isNaN(idx) || idx < 1 || idx > subList.length) return;
            socket.ev.off('messages.upsert', listener);

            const selected = subList[idx - 1];
            await socket.sendMessage(sender, { react: { text: '⬇️', key: mek.key } });

            try {
                // ---- STEP 2: /zoom/subtitle?url=<subtitle page url> ----
                // Uses the subtitle page URL from search results
                const dlRes = await axios.get(`${BASE_URL}/zoom/subtitle`, {
                    params: { url: selected.url },
                    timeout: 20000,
                    validateStatus: () => true
                });

                if (dlRes.status >= 400) {
                    throw new Error(`API returned HTTP ${dlRes.status}`);
                }

                const dlData = dlRes.data?.data;
                const links = dlData?.download_links;

                if (!links || !Array.isArray(links) || links.length === 0) {
                    throw new Error('No download links returned by API');
                }

                // Find the real file link (url contains /sub-download/)
                const realLink = links.find(l => l.url && l.url.includes('/sub-download/'));

                if (!realLink) {
                    throw new Error('Could not identify the actual download link');
                }

                const title = dlData.title || selected.title || 'subtitle';
                const fileName = title.replace(/[^a-zA-Z0-9]/g, '_');

                // Simple caption - no photo, minimal details
                let caption = `📝 *${title}*`;
                if (dlData.year) caption += ` (${dlData.year})`;
                if (dlData.imdb_rating) caption += `\n⭐ IMDB: ${dlData.imdb_rating}`;
                if (dlData.quality) caption += `\n📺 Quality: ${dlData.quality}`;
                if (dlData.subtitle_type) caption += `\n📄 Type: ${dlData.subtitle_type}`;

                await socket.sendMessage(sender, {
                    document: { url: realLink.url },
                    mimetype: 'application/x-rar-compressed',
                    fileName: `${fileName}.rar`,
                    caption: caption
                }, { quoted: mek });

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
            text: '❌ ERROR\n\n' + (err.response?.data?.message || err.message)
        }, { quoted: msg });
    }

    break;
}


// ========== FUN GAMES (10+ items each) ==========

case 'truth': {
    const truths = [
        "What's your biggest fear in life? 😨",
        "Have you ever lied to your best friend? 🤥",
        "Who was your first crush? 💕",
        "What's the most embarrassing thing you've done? 😳",
        "What's a secret you've never told anyone? 🤫",
        "Have you ever cheated on a test? 📚",
        "What's your weirdest habit? 🙃",
        "If you could swap lives with someone for a day, who? 🔄",
        "What's the worst gift you ever received? 🎁",
        "What's the last thing you searched on your phone? 📱",
        "Have you ever pretended to be sick to skip school/work? 🤒",
        "Who do you secretly stalk on social media? 👀"
    ];
    const pick = truths[Math.floor(Math.random() * truths.length)];
    return socket.sendMessage(sender, {
        text: `┌─❖ 🎯 𝑻𝑹𝑼𝑻𝑯 ❖─┐\n│\n│ 💬 ${pick}\n│\n│ 👤 For: @${sender.split('@')[0]}\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`,
        mentions: [sender]
    }, { quoted: msg });
}
break;

case 'dare': {
    const dares = [
        "Send a voice note singing your favorite song 🎤",
        "Text your crush 'I miss you' 😏",
        "Change your DP to something funny for 1 hour 😂",
        "Send the last photo in your gallery here 📸",
        "Do 10 push-ups and send a video 💪",
        "Call a random contact and sing Happy Birthday 🎂",
        "Type with your eyes closed for next 3 messages 👀",
        "Send 'We need to talk' to your ex 💔",
        "Act like a monkey on voice note for 30 sec 🐒",
        "Reveal your screen time for today 📊",
        "Send a funny selfie right now 🤳",
        "Talk in baby voice for next 5 messages 👶"
    ];
    const pick = dares[Math.floor(Math.random() * dares.length)];
    return socket.sendMessage(sender, {
        text: `┌─❖ 😈 𝑫𝑨𝑹𝑬 ❖─┐\n│\n│ 🔥 ${pick}\n│\n│ 👤 For: @${sender.split('@')[0]}\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`,
        mentions: [sender]
    }, { quoted: msg });
}
break;

case 'roll': {
    const roll = Math.floor(Math.random() * 6) + 1;
    const dice = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    return socket.sendMessage(sender, {
        text: `┌─❖ 🎲 𝑹𝑶𝑳𝑳 ❖─┐\n│\n│ ${dice[roll-1]} *You rolled a ${roll}!*\n│\n│ 🎲 Dice: ${roll}/6\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
    }, { quoted: msg });
}
break;

case 'coinflip': {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '👤' : '🦅';
    return socket.sendMessage(sender, {
        text: `┌─❖ 🪙 𝑪𝑶𝑰𝑵 𝑭𝑳𝑰𝑷 ❖─┐\n│\n│ ${emoji} *${result}!*\n│\n│ 🪙 Result: ${result}\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
    }, { quoted: msg });
}
break;

case 'rps': {
    const args = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().split(' ');
    const userChoice = args[1]?.toLowerCase();
    const choices = ['rock','paper','scissors'];
    const emojis = { rock:'✊', paper:'✋', scissors:'✌️' };

    if (!userChoice || !choices.includes(userChoice)) {
        return socket.sendMessage(sender, {
            text: `┌─❖ ✊ 𝑹𝑷𝑺 ❖─┐\n│\n│ ❌ Invalid choice!\n│\n│ 📌 Usage: ${sessionConfig.PREFIX || config.PREFIX}rps <rock/paper/scissors>\n│\n│ ✊ Rock  ✋ Paper  ✌️ Scissors\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
        }, { quoted: msg });
    }

    const botChoice = choices[Math.floor(Math.random() * 3)];
    let result;
    if (userChoice === botChoice) result = "🤝 It's a Tie!";
    else if ((userChoice==='rock'&&botChoice==='scissors')||(userChoice==='paper'&&botChoice==='rock')||(userChoice==='scissors'&&botChoice==='paper')) result = "🎉 You Win!";
    else result = "😢 Bot Wins!";

    return socket.sendMessage(sender, {
        text: `┌─❖ ✊ 𝑹𝑷𝑺 ❖─┐\n│\n│ 🧑 You: ${emojis[userChoice]} ${userChoice.toUpperCase()}\n│ 🤖 Bot: ${emojis[botChoice]} ${botChoice.toUpperCase()}\n│\n│ 🏆 *${result}*\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
    }, { quoted: msg });
}
break;


case 'ship': {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let user1, user2;
    
    if (mentioned.length >= 2) { user1 = mentioned[0]; user2 = mentioned[1]; }
    else if (mentioned.length === 1) { user1 = sender; user2 = mentioned[0]; }
    else {
        return socket.sendMessage(sender, {
            text: `┌─❖ 💑 𝑺𝑯𝑰𝑷 ❖─┐\n│\n│ ❌ Mention 1 or 2 users!\n│\n│ 📌 ${sessionConfig.PREFIX || config.PREFIX}ship @user\n│ 📌 ${sessionConfig.PREFIX || config.PREFIX}ship @user1 @user2\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
        }, { quoted: msg });
    }

    const seed = user1.split('@')[0] + user2.split('@')[0];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    const pct = Math.abs(hash % 101);
    
    let bar = '';
    for (let i = 0; i < 10; i++) bar += i < Math.round(pct/10) ? '❤️' : '🖤';
    
    let status;
    if (pct >= 90) status = '🔥 Soulmates!';
    else if (pct >= 70) status = '💕 Perfect Match!';
    else if (pct >= 50) status = '💘 Good Couple';
    else if (pct >= 30) status = '💔 Maybe...';
    else status = '😬 Not Compatible';

    return socket.sendMessage(sender, {
        text: `┌─❖ 💑 𝑺𝑯𝑰𝑷 ❖─┐\n│\n│ 👤 @${user1.split('@')[0]}\n│ 💕 @${user2.split('@')[0]}\n│\n│ ${bar} *${pct}%*\n│\n│ 📊 *${status}*\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`,
        mentions: [user1, user2]
    }, { quoted: msg });
}
break;

case 'joke': {
    const jokes = [
        "Why don't scientists trust atoms? Because they make up everything! 😂",
        "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
        "I told my wife she was drawing her eyebrows too high. She looked surprised! 😲",
        "Why don't eggs tell jokes? They'd crack each other up! 🥚",
        "What do you call a fake noodle? An impasta! 🍝",
        "Why did the math book look sad? Because it had too many problems! 📚",
        "I'm reading a book on anti-gravity. It's impossible to put down! 📖",
        "Why do seagulls fly over the sea? Because if they flew over the bay, they'd be bagels! 🥯",
        "What do you call a bear with no teeth? A gummy bear! 🐻",
        "Why can't you give Elsa a balloon? Because she will let it go! ❄️",
        "What do you call cheese that isn't yours? Nacho cheese! 🧀",
        "Why did the bicycle fall over? Because it was two-tired! 🚲"
    ];
    const pick = jokes[Math.floor(Math.random() * jokes.length)];
    return socket.sendMessage(sender, {
        text: `┌─❖ 😂 𝑱𝑶𝑲𝑬 ❖─┐\n│\n│ ${pick}\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
    }, { quoted: msg });
}
break;

case 'fact': {
    const facts = [
        "Honey never spoils. 3,000-year-old honey was found in Egyptian tombs! 🍯",
        "Octopuses have 3 hearts, 9 brains, and blue blood! 🐙",
        "Bananas are berries, but strawberries aren't! 🍌",
        "A day on Venus is longer than a year on Venus! 🪐",
        "Wombat poop is cube-shaped! 💩",
        "Sloths can hold their breath for 40 minutes! 🦥",
        "The Eiffel Tower grows taller in summer! 🗼",
        "Sharks existed before trees! 🦈",
        "There's a jellyfish that is biologically immortal! 🪼",
        "A cloud can weigh over a million pounds! ☁️",
        "Your brain uses 20% of your body's energy! 🧠",
        "A group of flamingos is called a 'flamboyance'! 🦩"
    ];
    const pick = facts[Math.floor(Math.random() * facts.length)];
    return socket.sendMessage(sender, {
        text: `┌─❖ 🤔 𝑭𝑨𝑪𝑻 ❖─┐\n│\n│ 💡 ${pick}\n│\n│ 🧠 Did you know?\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
    }, { quoted: msg });
}
break;

case 'meme': {
    const memes = [
        "📱 Me: I will study\nAlso me: 2 hours YouTube 😭",
        "💻 Code works → I don't touch it again forever",
        "😂 Brain: sleep\nMe: 3AM coding",
        "🍕 Me: I'm on a diet\nAlso me: *orders pizza*",
        "📚 Teacher: This won't be on the test\nTest: *has everything*",
        "⏰ Alarm: 6AM\nMe: 5 more minutes\nMe: *wakes up at 12PM*",
        "💰 Salary credited\nMe: *buys everything*\nMe 3 days later: broke 😢",
        "🎮 Mom: Stop playing games\nMe: Just 5 more minutes\n*3 hours later*",
        "📱 WiFi: Connected\nAlso WiFi: No internet 😤",
        "😎 Me in mirror: handsome\nCamera: reality check 📸",
        "🏋️ Gym membership: bought\nMe: never went once 💀",
        "🍜 Cooking tutorial: 10 mins\nMe: 2 hours later still cooking"
    ];
    const pick = memes[Math.floor(Math.random() * memes.length)];
    return socket.sendMessage(sender, {
        text: `┌─❖ 🃏 𝑴𝑬𝑴𝑬 ❖─┐\n│\n│ ${pick}\n│\n└─────────────❖\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
    }, { quoted: msg });
}
break;
case 'sinhalacartoon':
case 'cartoon': {
    const DEFAULT_FOOTER = ``;

    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `❌ ERROR\n\n*Need Cartoon Name*\n\n*Example:* .cartoon ben 10`
        }, { quoted: msg });
        break;
    }

    const cartoonQuery = args.join(' ');
    await socket.sendMessage(sender, { text: '🔍 Searching cartoons...' });

    const API_BASE = "https://new-api-cartoon.vercel.app";
    const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500";

    try {
        // ---- STEP 1: Search ----
        const searchResponse = await axios.get(`${API_BASE}/search?q=${encodeURIComponent(cartoonQuery)}`, {
            timeout: 20000,
            validateStatus: () => true
        });

        if (searchResponse.status >= 400) {
            throw new Error(`API returned HTTP ${searchResponse.status}`);
        }

        const searchData = searchResponse.data;
        const results = searchData.data?.results;

        if (!results || !Array.isArray(results) || results.length === 0) {
            await socket.sendMessage(sender, {
                text: `❌ NO RESULTS FOUND FOR *${cartoonQuery}*`
            }, { quoted: msg });
            break;
        }

        const cartoonResults = results.slice(0, 10);

        let listText = `🎬 *ᴄᴀʀᴛᴏᴏɴ ꜱᴇᴀʀᴄʜ ʀᴇꜱᴜʟᴛꜱ*\n\n`;
        cartoonResults.forEach((item, i) => {
            const typeIcon = item.type === 'cartoon-series' ? '📺' : '🎬';
            listText += `*${i + 1}.* ${typeIcon} ${item.title}${item.year ? ` (${item.year})` : ''}\n⭐ ${item.rating || 'N/A'} | 📊 ${item.quality || 'N/A'}\n\n`;
        });
        listText += `*🔢 ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ ɴᴜᴍʙᴇʀ (1-${cartoonResults.length}) ᴛᴏ ꜱᴇʟᴇᴄᴛ*`;

        const searchMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });

        // ---- STEP 2: Handle Selection (zoom style listener) ----
        const listener = async (update) => {
            const mek = update.messages[0];
            if (!mek?.message) return;
            const ctx = mek.message.extendedTextMessage?.contextInfo;
            if (!ctx || ctx.stanzaId !== searchMsg.key.id) return;
            const text = mek.message.conversation || mek.message.extendedTextMessage?.text;

            const idx = parseInt(text);
            if (isNaN(idx) || idx < 1 || idx > cartoonResults.length) return;
            socket.ev.off('messages.upsert', listener);

            const selectedItem = cartoonResults[idx - 1];
            const isSeries = selectedItem.type === 'cartoon-series';
            await socket.sendMessage(sender, { react: { text: '⬇️', key: mek.key } });

            try {
                // ---- STEP 3: Get Downloads ----
                const dlResponse = await axios.get(`${API_BASE}/downloads?url=${encodeURIComponent(selectedItem.url)}`, {
                    timeout: 20000,
                    validateStatus: () => true
                });

                if (dlResponse.status >= 400) {
                    throw new Error(`API returned HTTP ${dlResponse.status}`);
                }

                const dlData = dlResponse.data;
                const info = dlData?.data;
                const downloadInfo = info?.download_info;

                if (!info) {
                    throw new Error('Failed to fetch download details');
                }

                // ---- Send Poster + Details ----
                let detailsText = `🎬 *${info.title}*`;
                if (info.year) detailsText += ` (${info.year})`;
                detailsText += `\n`;
                if (info.imdb_rating || info.rating) detailsText += `⭐ Rating: ${info.imdb_rating || info.rating}\n`;
                if (info.quality) detailsText += `📊 Quality: ${info.quality}\n`;
                if (info.genres) detailsText += `🎭 Genres: ${info.genres.join(', ')}\n`;
                if (info.description) {
                    const desc = info.description.length > 200 ? info.description.substring(0, 200) + '...' : info.description;
                    detailsText += `📝 ${desc}\n`;
                }

                const posterUrl = info.image || selectedItem.poster || DEFAULT_IMAGE;
                await socket.sendMessage(sender, {
                    image: { url: posterUrl },
                    caption: detailsText
                }, { quoted: mek });

                // ---- STEP 4: Episode/Series Flow ----
                if (downloadInfo && downloadInfo.episodes && downloadInfo.episodes.length > 0) {
                    const directEpisodes = downloadInfo.sources?.direct || [];

                    if (directEpisodes.length === 0) {
                        throw new Error('No download links available');
                    }

                    // Filter unique episodes
                    const uniqueEpisodes = [];
                    const seenEpisodes = new Set();
                    directEpisodes.forEach(ep => {
                        if (!seenEpisodes.has(ep.episode)) {
                            seenEpisodes.add(ep.episode);
                            uniqueEpisodes.push(ep);
                        }
                    });

                    let epListText = `📥 *ᴅᴏᴡɴʟᴏᴀᴅ ʟɪꜱᴛ*\n\n`;
                    epListText += `📺 *${info.title}*\n`;
                    epListText += `🎬 *Items:* ${uniqueEpisodes.length}\n\n`;
                    uniqueEpisodes.forEach((ep, i) => {
                        epListText += `*${i + 1}.* 🎥 ${ep.title} (${ep.type})\n`;
                    });
                    epListText += `\n*🔢 ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ ɴᴜᴍʙᴇʀ (1-${uniqueEpisodes.length}) ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ*`;

                    const epMsg = await socket.sendMessage(sender, { text: epListText }, { quoted: mek });

                    // Handle Episode Selection
                    const epListener = async (epUpdate) => {
                        const epMek = epUpdate.messages[0];
                        if (!epMek?.message) return;
                        const epCtx = epMek.message.extendedTextMessage?.contextInfo;
                        if (!epCtx || epCtx.stanzaId !== epMsg.key.id) return;
                        const epText = epMek.message.conversation || epMek.message.extendedTextMessage?.text;

                        const epIdx = parseInt(epText);
                        if (isNaN(epIdx) || epIdx < 1 || epIdx > uniqueEpisodes.length) return;
                        socket.ev.off('messages.upsert', epListener);

                        const selectedEp = uniqueEpisodes[epIdx - 1];
                        await socket.sendMessage(sender, { react: { text: '⬇️', key: epMek.key } });

                        try {
                            await socket.sendMessage(sender, {
                                document: { url: selectedEp.url },
                                mimetype: 'video/mp4',
                                fileName: `${selectedEp.filename || info.title + ' - ' + selectedEp.title}.mp4`,
                                caption: `🎬 *${info.title}*\n📌 *${selectedEp.title}*\n💾 *Type:* ${selectedEp.type}`
                            }, { quoted: epMek });

                            await socket.sendMessage(sender, { react: { text: '✅', key: epMek.key } });

                        } catch (dlError) {
                            await socket.sendMessage(sender, {
                                text: '❌ DOWNLOAD ERROR\n\n' + dlError.message
                            }, { quoted: epMek });
                            await socket.sendMessage(sender, { react: { text: '❌', key: epMek.key } });
                        }
                    };

                    socket.ev.on('messages.upsert', epListener);
                    setTimeout(() => {
                        socket.ev.off('messages.upsert', epListener);
                    }, 300000);

                } else {
                    throw new Error('No episodes found for this item');
                }

                await socket.sendMessage(sender, { react: { text: '✅', key: mek.key } });

            } catch (err) {
                await socket.sendMessage(sender, {
                    text: '❌ ERROR\n\n' + (err.response?.data?.message || err.message)
                }, { quoted: mek });
                await socket.sendMessage(sender, { react: { text: '❌', key: mek.key } });
            }
        };

        socket.ev.on('messages.upsert', listener);
        setTimeout(() => {
            socket.ev.off('messages.upsert', listener);
        }, 300000);

    } catch (error) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n' + (error.response?.data?.message || error.message)
        }, { quoted: msg });
    }

    break;
}
case 'xnxx': {
    if (!args.length) {
        return socket.sendMessage(sender, {
            text: "❌ Example: .xnxx mia"
        }, { quoted: msg });
    }

    const query = args.join(" ");

    try {
        await socket.sendMessage(sender, {
            text: "🔍 Searching..."
        }, { quoted: msg });

        // SEARCH API
        const search = await axios.get(
            `https://apis.davidcyriltech.my.id/xxx/xvideos?q=${encodeURIComponent(query)}`
        );

        const results = search.data.data.results;

        if (!results || !results.length) {
            return socket.sendMessage(sender, {
                text: "❌ No results found."
            }, { quoted: msg });
        }

        let txt = "📺 *SEARCH RESULTS*\n\n";

        results.slice(0, 10).forEach((v, i) => {
            txt += `*${i + 1}.* ${v.title}\n`;
        });

        txt += "\n💬 Reply with a number.";

        const list = await socket.sendMessage(sender, {
            text: txt
        }, { quoted: msg });

        const listener = async (update) => {
            const mek = update.messages[0];
            if (!mek?.message) return;

            const ctx = mek.message.extendedTextMessage?.contextInfo;
            if (!ctx || ctx.stanzaId !== list.key.id) return;

            const reply =
                mek.message.conversation ||
                mek.message.extendedTextMessage?.text;

            const num = parseInt(reply);

            if (isNaN(num) || num < 1 || num > results.length) return;

            socket.ev.off("messages.upsert", listener);

            const item = results[num - 1];

            try {
                // DETAILS API
                const details = await axios.get(
                    `https://apis.davidcyriltech.my.id/xvideo?url=${encodeURIComponent(item.url)}`
                );

                const data = details.data;

                // Thumbnail
                await socket.sendMessage(sender, {
                    image: {
                        url: data.thumbnail
                    },
                    caption: `🎬 *${data.title}*

👤 Creator: ${data.creator || "Unknown"}`
                }, { quoted: mek });

                // Video File
                await socket.sendMessage(sender, {
                    document: {
                        url: data.download_url
                    },
                    mimetype: "video/mp4",
                    fileName: `${data.title}.mp4`
                }, { quoted: mek });

            } catch (e) {
                console.error(e);

                await socket.sendMessage(sender, {
                    text: `❌ ${e.message}`
                }, { quoted: mek });
            }
        };

        socket.ev.on("messages.upsert", listener);

        setTimeout(() => {
            socket.ev.off("messages.upsert", listener);
        }, 300000);

    } catch (e) {
        console.error(e);

        await socket.sendMessage(sender, {
            text: `❌ ${e.message}`
        }, { quoted: msg });
    }
}
break;

              

              
case 'pupil':
case 'pupilmovie': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `❌ ERROR\n\n*Need Movie Name*\n\n*Example:* .pupil harry potter`
        }, { quoted: msg });
        break;
    }

    const pupilQuery = args.join(' ');
    const API_KEY = '4992301b98bb4aaba5d1431f15d8046b';
    const API_BASE = 'https://nexe-nk.vercel.app';
    const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500";

    await socket.sendMessage(sender, { text: '🔍 Searching movies...' });

    try {
        // ---- STEP 1: Search ----
        const searchResponse = await axios.get(`${API_BASE}/pupilvideo-search?keywords=${encodeURIComponent(pupilQuery)}&api_key=${API_KEY}`, {
            timeout: 20000,
            validateStatus: () => true
        });

        if (searchResponse.status >= 400) {
            throw new Error(`API returned HTTP ${searchResponse.status}`);
        }

        const searchData = searchResponse.data;
        const results = searchData.results;

        if (!results || !Array.isArray(results) || results.length === 0) {
            await socket.sendMessage(sender, {
                text: `❌ NO RESULTS FOUND FOR *${pupilQuery}*`
            }, { quoted: msg });
            break;
        }

        const pupilResults = results.slice(0, 10);

        let listText = `🎬 *ᴘᴜᴘɪʟᴠɪᴅᴇᴏ ꜱᴇᴀʀᴄʜ ʀᴇꜱᴜʟᴛꜱ*\n\n`;
        pupilResults.forEach((item, i) => {
            const labels = item.labels ? item.labels.join(', ') : 'N/A';
            listText += `*${i + 1}.* 🎬 ${item.title}\n🏷️ ${labels}\n\n`;
        });
        listText += `*🔢 ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ ɴᴜᴍʙᴇʀ (1-${pupilResults.length}) ᴛᴏ ꜱᴇʟᴇᴄᴛ*`;

        const searchMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });

        // ---- STEP 2: Handle Selection ----
        const listener = async (update) => {
            const mek = update.messages[0];
            if (!mek?.message) return;
            const ctx = mek.message.extendedTextMessage?.contextInfo;
            if (!ctx || ctx.stanzaId !== searchMsg.key.id) return;
            const text = mek.message.conversation || mek.message.extendedTextMessage?.text;

            const idx = parseInt(text);
            if (isNaN(idx) || idx < 1 || idx > pupilResults.length) return;
            socket.ev.off('messages.upsert', listener);

            const selectedItem = pupilResults[idx - 1];
            await socket.sendMessage(sender, { react: { text: '⬇️', key: mek.key } });

            try {
                // ---- STEP 3: Get Downloads ----
                const dlResponse = await axios.get(`${API_BASE}/pupilvideo-download?url=${encodeURIComponent(selectedItem.url)}&api_key=${API_KEY}`, {
                    timeout: 20000,
                    validateStatus: () => true
                });

                if (dlResponse.status >= 400) {
                    throw new Error(`API returned HTTP ${dlResponse.status}`);
                }

                const dlData = dlResponse.data;
                const info = dlData?.result;

                if (!info) {
                    throw new Error('Failed to fetch download details');
                }

                // ---- Send Poster + Details ----
                let detailsText = `🎬 *${info.title}*\n`;
                if (info.labels) detailsText += `🏷️ Labels: ${info.labels.join(', ')}\n`;
                if (info.description) {
                    const desc = info.description.length > 250 ? info.description.substring(0, 250) + '...' : info.description;
                    detailsText += `📝 ${desc}\n`;
                }

                const posterUrl = info.poster || selectedItem.thumbnail || DEFAULT_IMAGE;
                await socket.sendMessage(sender, {
                    image: { url: posterUrl },
                    caption: detailsText
                }, { quoted: mek });

                // ---- STEP 4: Download Links Flow ----
                const downloadLinks = info.download_links || [];

                if (downloadLinks.length === 0) {
                    throw new Error('No download links available');
                }

                let dlListText = `📥 *ᴅᴏᴡɴʟᴏᴀᴅ ʟɪɴᴋꜱ*\n\n`;
                dlListText += `🎬 *${info.title}*\n`;
                dlListText += `🔗 *Links:* ${downloadLinks.length}\n\n`;
                downloadLinks.forEach((link, i) => {
                    dlListText += `*${i + 1}.* 💾 ${link.label} (${link.size || 'N/A'})\n📡 Source: ${link.source || 'N/A'}\n`;
                });
                dlListText += `\n*🔢 ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ ɴᴜᴍʙᴇʀ (1-${downloadLinks.length}) ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ*`;

                const dlMsg = await socket.sendMessage(sender, { text: dlListText }, { quoted: mek });

                // Handle Download Selection
                const dlListener = async (dlUpdate) => {
                    const dlMek = dlUpdate.messages[0];
                    if (!dlMek?.message) return;
                    const dlCtx = dlMek.message.extendedTextMessage?.contextInfo;
                    if (!dlCtx || dlCtx.stanzaId !== dlMsg.key.id) return;
                    const dlText = dlMek.message.conversation || dlMek.message.extendedTextMessage?.text;

                    const dlIdx = parseInt(dlText);
                    if (isNaN(dlIdx) || dlIdx < 1 || dlIdx > downloadLinks.length) return;
                    socket.ev.off('messages.upsert', dlListener);

                    const selectedLink = downloadLinks[dlIdx - 1];
                    await socket.sendMessage(sender, { react: { text: '⬇️', key: dlMek.key } });

                    try {
                        await socket.sendMessage(sender, {
                            document: { url: selectedLink.url },
                            mimetype: 'video/mp4',
                            fileName: `${info.title}.mp4`,
                            caption: `🎬 *${info.title}*\n💾 *Size:* ${selectedLink.size || 'N/A'}\n📡 *Source:* ${selectedLink.source || 'N/A'}`
                        }, { quoted: dlMek });

                        await socket.sendMessage(sender, { react: { text: '✅', key: dlMek.key } });

                    } catch (dlError) {
                        await socket.sendMessage(sender, {
                            text: '❌ DOWNLOAD ERROR\n\n' + dlError.message
                        }, { quoted: dlMek });
                        await socket.sendMessage(sender, { react: { text: '❌', key: dlMek.key } });
                    }
                };

                socket.ev.on('messages.upsert', dlListener);
                setTimeout(() => {
                    socket.ev.off('messages.upsert', dlListener);
                }, 300000);

                await socket.sendMessage(sender, { react: { text: '✅', key: mek.key } });

            } catch (err) {
                await socket.sendMessage(sender, {
                    text: '❌ ERROR\n\n' + (err.response?.data?.message || err.message)
                }, { quoted: mek });
                await socket.sendMessage(sender, { react: { text: '❌', key: mek.key } });
            }
        };

        socket.ev.on('messages.upsert', listener);
        setTimeout(() => {
            socket.ev.off('messages.upsert', listener);
        }, 300000);

    } catch (error) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n' + (error.response?.data?.message || error.message)
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

case 'groupinfo':
case 'gpinfo': {
    try {
        if (!sender.endsWith('@g.us')) {
            await socket.sendMessage(sender, {
                text: `⚠️ මේ command එක group එකක් ඇතුලෙ විතරයි use කරන්න පුළුවන්.`
            }, { quoted: msg });
            break;
        }

        const groupMetadata = await socket.groupMetadata(sender);
        const groupName = groupMetadata.subject || 'Unknown Group';
        const participants = groupMetadata.participants || [];
        const totalMembers = participants.length;
        const createdDate = groupMetadata.creation
            ? new Date(groupMetadata.creation * 1000).toLocaleDateString('en-GB')
            : 'Unknown';

        const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        const totalAdmins = admins.length;

        let ownerNumber = groupMetadata.owner
            ? groupMetadata.owner.split('@')[0]
            : (participants.find(p => p.admin === 'superadmin')?.id.split('@')[0] || 'Unknown');

        const infoText =
`📋 *GROUP DETAILS*

🏷️ *Name*        : ${groupName}
🆔 *Group ID*     : ${sender}
👑 *Owner*        : ${ownerNumber}
📅 *Created*      : ${createdDate}
👥 *Members*      : ${totalMembers}
👮 *Admins*       : ${totalAdmins}

_Fetched just now_`;

        let groupPfp;
        try {
            groupPfp = await socket.profilePictureUrl(sender, 'image');
        } catch {
            groupPfp = null;
        }

        if (groupPfp) {
            await socket.sendMessage(sender, {
                image: { url: groupPfp },
                caption: infoText
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, { text: infoText }, { quoted: msg });
        }

    } catch (error) {
        console.error("Group info command error:", error);
        await socket.sendMessage(sender, {
            text: `❌ Group details ගන්න බැරි වුණා!\n\nError: ${error.message}`
        }, { quoted: msg });
    }
    break;
}




              
case 'save':
case 'vv': {
    try {
        const sessionOwnerNumber = (number || '').replace(/[^0-9]/g, '');

        // 🔒 VV command එක Owner ට විතරයි
        if (command === 'vv' && !isOwner(sender, socket, msg.key.fromMe)) {
            return await socket.sendMessage(sender, {
                text: `*⚠️ Access Restricted*\n\n🚫 This command is only for the Bot Owner.\n\n> *SITHIJA MD*`,
                mentions: [sender]
            }, { quoted: msg });
        }

        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
            return await socket.sendMessage(sender, {
                text: '*❌ Please reply to a message.*'
            }, { quoted: msg });
        }

        // vv නම් saveChat එක Owner, නැත්තම් sender
        const saveChat = (command === 'vv') 
            ? (sessionOwnerNumber + '@s.whatsapp.net') 
            : sender;

        const media = await downloadQuotedMedia(quotedMsg);
        if (!media || !media.buffer) {
            return await socket.sendMessage(sender, {
                text: '❌ Failed to download media.'
            }, { quoted: msg });
        }

        // Image
        if (quotedMsg.imageMessage) {
            await socket.sendMessage(saveChat, {
                image: media.buffer,
                caption: media.caption || '✅ Saved'
            }, { quoted: msg });
        }
        // Video
        else if (quotedMsg.videoMessage) {
            await socket.sendMessage(saveChat, {
                video: media.buffer,
                caption: media.caption || '✅ Saved',
                mimetype: media.mime || 'video/mp4'
            }, { quoted: msg });
        }
        // Audio
        else if (quotedMsg.audioMessage) {
            await socket.sendMessage(saveChat, {
                audio: media.buffer,
                mimetype: media.mime || 'audio/mp4',
                ptt: media.ptt || false
            }, { quoted: msg });
        }
        // Document
        else if (quotedMsg.documentMessage) {
            const FileType = require('file-type');
            let ext = 'bin';
            try {
                const fileTypeResult = await FileType.fromBuffer(media.buffer);
                if (fileTypeResult) ext = fileTypeResult.ext;
            } catch (e) {}

            const fname = media.fileName || `saved_document.${ext}`;
            await socket.sendMessage(saveChat, {
                document: media.buffer,
                fileName: fname,
                mimetype: media.mime || 'application/octet-stream'
            }, { quoted: msg });
        }
        // Sticker
        else if (quotedMsg.stickerMessage) {
            await socket.sendMessage(saveChat, {
                image: media.buffer,
                caption: '✅ Sticker Saved'
            }, { quoted: msg });
        }
        // Text
        else {
            const text = quotedMsg.conversation || quotedMsg.message?.conversation;
            if (text) {
                await socket.sendMessage(saveChat, {
                    text: `✅ *Saved*\n\n${text}`
                }, { quoted: msg });
            }
        }

        // Success confirmation
        await socket.sendMessage(sender, {
            text: '🔥 *Successfully Processed!*'
        }, { quoted: msg });

    } catch (error) {
        console.error('❌ Error in save/oni/vv:', error);
        await socket.sendMessage(sender, {
            text: '*❌ Failed to process.*'
        }, { quoted: msg });
    }
    break;
}

        // === 4. Try to get group profile picture ===
case 'tagall':
case 'everyone': {
    try {
        if (!sender.endsWith('@g.us')) {
            await socket.sendMessage(sender, {
                text: `⚠️ මේ command එක group එකක් ඇතුලෙ විතරයි use කරන්න පුළුවන්.`
            }, { quoted: msg });
            break;
        }

        const groupMetadata = await socket.groupMetadata(sender);
        const groupName = groupMetadata.subject || 'Unknown Group';
        const participants = groupMetadata.participants || [];
        const totalMembers = participants.length;

        const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        const totalAdmins = admins.length;

        const mentions = participants.map(p => p.id);
        let memberList = participants
            .map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`)
            .join('\n');

        const customMsg = args && args.length > 0 ? args.join(' ') : null;

        const tagText =
`📢 *GROUP TAG ALL*

🏷️ *Group Name* : ${groupName}
👥 *Total Members* : ${totalMembers}
👮 *Admins* : ${totalAdmins}

${customMsg ? `💬 *Message:*\n${customMsg}\n\n` : ''}👇 *Members:*
${memberList}

_Tagged by bot_`;

        let groupPfp;
        try {
            groupPfp = await socket.profilePictureUrl(sender, 'image');
        } catch {
            groupPfp = null;
        }

        if (groupPfp) {
            await socket.sendMessage(sender, {
                image: { url: groupPfp },
                caption: tagText,
                mentions: mentions
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: tagText,
                mentions: mentions
            }, { quoted: msg });
        }

    } catch (error) {
        console.error("Tagall command error:", error);
        await socket.sendMessage(sender, {
            text: `❌ Tagall command එක run කරන්න බැරි වුණා!\n\nError: ${error.message}`
        }, { quoted: msg });
    }
    break;
}

              

                           

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
case 'seson':
case 'active': {
    try {
        // === 1. Count ACTIVE sessions + get numbers (with better connection check) ===
        let active = 0;
        let activeNumbers = [];

        const extractNumber = (sock) => {
            if (!sock || !sock.user) return null;
            let jid = sock.user.jid || sock.user.id || '';
            if (!jid) return null;
            return jid.split('@')[0].split(':')[0];
        };

        const isReallyActive = (sock) => {
            if (!sock || !sock.user) return false;
            // Extra check: WebSocket must be OPEN (readyState === 1)
            if (sock.ws && typeof sock.ws.readyState !== 'undefined') {
                return sock.ws.readyState === 1; // 1 = OPEN
            }
            return true; // If no ws info, trust sock.user
        };

        if (global.sessions && global.sessions instanceof Map) {
            for (let [id, sock] of global.sessions) {
                if (isReallyActive(sock)) {
                    active++;
                    const num = extractNumber(sock);
                    if (num) activeNumbers.push(num);
                }
            }
        } 
        else if (global.sessions && typeof global.sessions === 'object') {
            for (let id in global.sessions) {
                let sock = global.sessions[id];
                if (isReallyActive(sock)) {
                    active++;
                    const num = extractNumber(sock);
                    if (num) activeNumbers.push(num);
                }
            }
        }

        // Unique + sorted numbers
        activeNumbers = [...new Set(activeNumbers)].sort((a, b) => 
            a.localeCompare(b, undefined, { numeric: true })
        );

        // === 2. Count TOTAL from MongoDB ===
        let total = 0;

        if (typeof Session !== 'undefined' && Session.countDocuments) {
            total = await Session.countDocuments({});
        } 
        else if (global.db && global.db.collection) {
            const col = global.db.collection('sessions');
            total = await col.countDocuments({});
        }

        let deactive = total - active;

        // === 3. Beautiful Reply ===
        let numbersList = activeNumbers.length > 0 
            ? activeNumbers.map((n, i) => `${i + 1}. ${n}`).join('\n')
            : 'No active connections right now';

        const statsText = 
`📊 *SESSION STATISTICS*

✅ Active Sessions   : ${active}
❌ Deactive Sessions : ${deactive}
📌 Total Sessions    : ${total}

📱 *Connected Numbers (${active}):*
${numbersList}

_Updated just now_`;

        await socket.sendMessage(sender, {
            text: statsText
        }, { quoted: msg });

    } catch (error) {
        console.error("Session command error:", error);

        await socket.sendMessage(sender, {
            text: `❌ Session details ගන්න බැරි වුණා!\n\n` +
                  `⚠️ MongoDB connection හෝ model එක check කරන්න.\n` +
                  `Error: ${error.message}`
        }, { quoted: msg });
    }
    break;
}

    
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
case 'video':
case 'ig':
case 'insta': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*Need Video Link*\n\n_Supported: Instagram, YouTube, Facebook, Twitter/X, TikTok, etc._'
        }, { quoted: msg });
        break;
    }

    const videoUrl = args[0];

    // Basic URL validation
    const urlPattern = /^(https?:\/\/)/;
    if (!urlPattern.test(videoUrl)) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*Invalid URL*\n\nPlease send a valid video link.'
        }, { quoted: msg });
        break;
    }

    await socket.sendMessage(sender, { text: '🔍 Fetching video info...' });

    const API_KEY = 'sithi_usueu4rtuj37urjufu3euj';
    const INFO_URL = 'https://sithija-apis2-production.up.railway.app/api/video/info';
    const FILE_URL = 'https://sithija-apis2-production.up.railway.app/api/video/file';

    try {
        // Step 1: Fetch video info
        const infoRes = await axios.get(INFO_URL, {
            params: { apiKey: API_KEY, text: videoUrl },
            timeout: 30000
        });

        if (!infoRes.data?.success) {
            throw new Error(infoRes.data?.message || 'Info API Error');
        }

        const result = infoRes.data.results || {};
        const title = result.title || 'N/A';
        const uploader = result.uploader || 'N/A';
        const duration = result.duration || 'N/A';
        const thumbnail = result.thumbnail;
        const extractor = result.extractor || 'Video';

        // Build info card
        const infoCard = ` *📹 ${extractor.toUpperCase()} ᴠɪᴅᴇᴏ* 

*ᴛɪᴛʟᴇ* : _${title}_     
*👤 ᴜᴘʟᴏᴀᴅᴇʀ* ➟ _${uploader}_
*⏱️ ᴅᴜʀᴀᴛɪᴏɴ* ➟ _${duration || 'N/A'}_

*🔢 𝗥ᴇᴘʟʏ ᴡɪᴛʜ ᴀ 𝗡ᴜᴍʙᴇʀ 👇*

*01 ᴅᴏᴡɴʟᴏᴀᴅ ᴠɪᴅᴇᴏ*
`;

        // Step 2: Send info card with thumbnail
        const sentMsg = thumbnail
            ? await socket.sendMessage(sender, { 
                image: { url: thumbnail }, 
                caption: infoCard 
            }, { quoted: msg })
            : await socket.sendMessage(sender, { 
                text: infoCard 
            }, { quoted: msg });

        // Step 3: Listen for reply to download
        const listener = async (update) => {
            const mek = update.messages[0];
            if (!mek?.message) return;
            
            const ctx = mek.message.extendedTextMessage?.contextInfo;
            if (!ctx || ctx.stanzaId !== sentMsg.key.id) return;
            
            const text = mek.message.conversation || mek.message.extendedTextMessage?.text;
            if (text !== '1') return;
            
            // Remove listener
            socket.ev.off('messages.upsert', listener);

            await socket.sendMessage(sender, { react: { text: '⬇️', key: mek.key } });

            try {
                // Step 4: Fetch direct video file URL
                const fileRes = await axios.get(FILE_URL, {
                    params: { apiKey: API_KEY, text: videoUrl },
                    timeout: 60000,
                    maxRedirects: 5
                });

                // Handle different response types
                let videoLink = null;
                
                if (typeof fileRes.data === 'string' && fileRes.data.startsWith('http')) {
                    // Direct URL string response
                    videoLink = fileRes.data;
                } else if (fileRes.data?.success && fileRes.data?.results) {
                    // JSON with results object
                    const fileResult = fileRes.data.results;
                    videoLink = fileResult.url || fileResult.video || fileResult.link || fileResult.download;
                } else if (fileRes.request?.res?.responseUrl) {
                    // Followed redirect URL
                    videoLink = fileRes.request.res.responseUrl;
                }

                if (!videoLink) {
                    throw new Error('Could not retrieve video download link');
                }

                // Step 5: Send the video
                await socket.sendMessage(sender, {
                    video: { url: videoLink },
                    caption: `📹 ${title}\n\n👤 ${uploader}`
                }, { quoted: mek });

                await socket.sendMessage(sender, { react: { text: '✅', key: mek.key } });

            } catch (err) {
                await socket.sendMessage(sender, {
                    text: '❌ DOWNLOAD ERROR\n\n' + (err.response?.data?.message || err.message)
                }, { quoted: mek });

                await socket.sendMessage(sender, { react: { text: '❌', key: mek.key } });
            }
        };

        socket.ev.on('messages.upsert', listener);
        setTimeout(() => {
            socket.ev.off('messages.upsert', listener);
        }, 300000); // 5 minutes timeout

    } catch (err) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n' + (err.response?.data?.message || err.message)
        }, { quoted: msg });
    }

    break;
}


              
case 'play':
case 'song2': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*කරුණාකර ගීතයේ නම ලබාදෙන්න! උදා: .play faded*'
        }, { quoted: msg });
        break;
    }

    const songQuery = args.join(' ');
    const songApiBase = 'https://apis.davidcyriltech.my.id/song';
    const fs = require('fs');
    const path = require('path');

    await socket.sendMessage(sender, { react: { text: '🎵', key: msg.key } });

    try {
        // ─── STEP 1: Search API ───
        await socket.sendMessage(sender, { text: '🔍 Song API එකෙන් data ගන්නවා...' }, { quoted: msg });

        const songUrl = `${songApiBase}?query=${encodeURIComponent(songQuery)}`;
        const songRes = await axios.get(songUrl, {
            timeout: 60000,        // 60 seconds for API
            validateStatus: () => true
        });

        if (songRes.status >= 400 || !songRes.data?.result) {
            await socket.sendMessage(sender, {
                text: `❌ API ERROR\n\nHTTP ${songRes.status}\n${JSON.stringify(songRes.data)?.slice(0, 400) || 'No data'}`
            }, { quoted: msg });
            break;
        }

        const r = songRes.data.result;
        const audioUrl = r.audio?.download_url;
        const videoUrl = r.video?.download_url;
        const title = r.title || 'Unknown Song';

        // ─── STEP 2: Show Details ───
        const detailsText =
`🎵 〔 SONG DETAILS 〕

🎶 Title: ${title}
⏱️ Duration: ${r.duration || 'N/A'}
👁️ Views: ${r.views ? r.views.toLocaleString() : 'N/A'}
📅 Published: ${r.published || 'N/A'}

Reply with number to download:

1️⃣ 🎧 MP3 (Audio)
2️⃣ 📹 MP4 (Video)
3️⃣ 📄 Document MP3
4️⃣ 📄 Document MP4
5️⃣ 🎬 Video Note
6️⃣ 🎤 Voice Note (PTT)

${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

        const sentMsg = await socket.sendMessage(sender, {
            image: { url: r.thumbnail },
            caption: detailsText
        }, { quoted: msg });
        const sentMsgId = sentMsg.key.id;

        // ─── STEP 3: Handle Reply ───
        const handleSelection = async ({ messages: replyMessages }) => {
            const replyMsg = replyMessages[0];
            if (!replyMsg?.message) return;

            const replyText = replyMsg.message.conversation || replyMsg.message.extendedTextMessage?.text;
            const isReplyToSent = replyMsg.message.extendedTextMessage?.contextInfo?.stanzaId === sentMsgId;

            if (!isReplyToSent || sender !== replyMsg.key.remoteJid) return;

            const choice = parseInt(replyText, 10);
            if (isNaN(choice) || choice < 1 || choice > 6) {
                await socket.sendMessage(sender, {
                    text: `❌ වැරදි අංකයක්! 1-6 අතර තෝරන්න!`
                }, { quoted: replyMsg });
                return;
            }

            await socket.sendMessage(sender, { react: { text: '⏳', key: replyMsg.key } });

            // Determine what to download
            let targetUrl, fileExt, mimeType, sendType;
            switch (choice) {
                case 1: case 3: case 6:
                    if (!audioUrl) {
                        await socket.sendMessage(sender, { text: '❌ MP3 link නොමැත!' }, { quoted: replyMsg });
                        return;
                    }
                    targetUrl = audioUrl; fileExt = 'mp3'; mimeType = 'audio/mpeg';
                    sendType = choice === 1 ? 'audio' : choice === 3 ? 'docAudio' : 'ptt';
                    break;
                case 2: case 4: case 5:
                    if (!videoUrl) {
                        await socket.sendMessage(sender, { text: '❌ MP4 link නොමැත!' }, { quoted: replyMsg });
                        return;
                    }
                    targetUrl = videoUrl; fileExt = 'mp4'; mimeType = 'video/mp4';
                    sendType = choice === 2 ? 'video' : choice === 4 ? 'docVideo' : 'ptv';
                    break;
            }

            const tmpPath = path.join('./tmp', `song_${Date.now()}.${fileExt}`);
            
            try {
                // Ensure tmp folder exists
                if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true });

                // ─── DOWNLOAD FILE TO LOCAL ───
                await socket.sendMessage(sender, {
                    text: `⬇️ *${title}* download වෙමින්...\n(Timeout නිසා විනාඩි 2ක් පමණ ගතවිය හැක)`
                }, { quoted: replyMsg });

                const dlRes = await axios.get(targetUrl, {
                    responseType: 'arraybuffer',
                    timeout: 120000,           // 2 minutes for download
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                fs.writeFileSync(tmpPath, Buffer.from(dlRes.data));
                const fileSizeMB = (fs.statSync(tmpPath).size / (1024 * 1024)).toFixed(2);

                await socket.sendMessage(sender, {
                    text: `✅ Download complete: ${fileSizeMB}MB\n📤 WhatsApp ට upload වෙමින්...`
                }, { quoted: replyMsg });

                // ─── SEND FILE ───
                const fileBuffer = fs.readFileSync(tmpPath);

                switch (sendType) {
                    case 'audio':
                        await socket.sendMessage(sender, {
                            audio: fileBuffer,
                            mimetype: mimeType
                        }, { quoted: replyMsg });
                        break;
                    case 'video':
                        await socket.sendMessage(sender, {
                            video: fileBuffer,
                            caption: `📹 ${title}`
                        }, { quoted: replyMsg });
                        break;
                    case 'docAudio':
                        await socket.sendMessage(sender, {
                            document: fileBuffer,
                            mimetype: mimeType,
                            fileName: `${title}.mp3`,
                            caption: `📄 Document MP3\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                        }, { quoted: replyMsg });
                        break;
                    case 'docVideo':
                        await socket.sendMessage(sender, {
                            document: fileBuffer,
                            mimetype: mimeType,
                            fileName: `${title}.mp4`,
                            caption: `📄 Document MP4\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                        }, { quoted: replyMsg });
                        break;
                    case 'ptv':
                        await socket.sendMessage(sender, {
                            video: fileBuffer,
                            ptv: true
                        }, { quoted: replyMsg });
                        break;
                    case 'ptt':
                        await socket.sendMessage(sender, {
                            audio: fileBuffer,
                            mimetype: mimeType,
                            ptt: true
                        }, { quoted: replyMsg });
                        break;
                }

                await socket.sendMessage(sender, { react: { text: '✅', key: replyMsg.key } });

            } catch (err) {
                console.error('Download/Send error:', err.message);
                
                // ─── FALLBACK: Send direct links ───
                let errText = `⚠️ *Upload Failed*\n\n${err.message || 'Timeout / File too large'}\n\n*Direct Download Links:*`;
                if (audioUrl) errText += `\n🎧 MP3: ${audioUrl}`;
                if (videoUrl) errText += `\n📹 MP4: ${videoUrl}`;
                errText += `\n\n_Link එක copy කරලා browser එකෙන් download කරගන්න._`;
                
                await socket.sendMessage(sender, { text: errText }, { quoted: replyMsg });
                await socket.sendMessage(sender, { react: { text: '⚠️', key: replyMsg.key } });

            } finally {
                // ─── CLEANUP ───
                if (fs.existsSync(tmpPath)) {
                    try { fs.unlinkSync(tmpPath); } catch(e) {}
                }
                socket.ev.off('messages.upsert', handleSelection);
            }
        };

        socket.ev.on('messages.upsert', handleSelection);
        setTimeout(() => {
            socket.ev.off('messages.upsert', handleSelection);
        }, 300000);

    } catch (err) {
        console.error('Play command error:', err);
        await socket.sendMessage(sender, {
            text: `❌ ERROR\n\n${err.message || 'Unknown error'}`
        }, { quoted: msg });
    }

    break;
}
case 'anime':
case 'animeclub': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*Need Anime Name*\n\n*Example:* .anime naruto'
        }, { quoted: msg });
        break;
    }

    const query = args.join(' ');
    await socket.sendMessage(sender, { text: '🔍 Searching anime...' });

    const API_KEY = 'zanta_g7uzKg0LNUo6dHSDLSjKgtrr';
    const BASE_URL = 'https://api.zanta-mini.store/api';

    try {
        // STEP 1: Search
        const searchRes = await axios.get(`${BASE_URL}/animeclub/search`, {
            params: { apiKey: API_KEY, url: query },
            timeout: 20000
        });

        if (!searchRes.data?.success || !searchRes.data.results?.length) {
            await socket.sendMessage(sender, {
                text: '❌ NO RESULTS\n\n*No anime found for your query*'
            }, { quoted: msg });
            break;
        }

        const animeList = searchRes.data.results.slice(0, 10);

        let listText = `🎬 *ᴀɴɪᴍᴇ ꜱᴇᴀʀᴄʜ ʀᴇꜱᴜʟᴛꜱ*\n\n`;
        animeList.forEach((a, i) => {
            listText += `*${i + 1}.* ${a.title}\n     _${a.type || 'N/A'} • ${a.year || 'N/A'} • ${a.rating || 'N/A'}_\n\n`;
        });
        listText += `*🔢 ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ ɴᴜᴍʙᴇʀ (1-${animeList.length}) ᴛᴏ ꜱᴇʟᴇᴄᴛ*`;

        const searchMsg = await socket.sendMessage(sender, {
            image: { url: animeList[0].thumbnail },
            caption: listText
        }, { quoted: msg });

        // LISTENER 1: pick anime from search results
        const animeListener = async (update) => {
            const mek = update.messages[0];
            if (!mek?.message) return;
            const ctx = mek.message.extendedTextMessage?.contextInfo;
            if (!ctx || ctx.stanzaId !== searchMsg.key.id) return;
            const text =
                mek.message.conversation ||
                mek.message.extendedTextMessage?.text;

            const idx = parseInt(text);
            if (isNaN(idx) || idx < 1 || idx > animeList.length) return;
            socket.ev.off('messages.upsert', animeListener);

            const selected = animeList[idx - 1];
            await socket.sendMessage(sender, { text: '📥 Fetching details...' }, { quoted: mek });

            try {
                // STEP 2: Get episodes
                const epRes = await axios.get(`${BASE_URL}/animeclub/ep`, {
                    params: { apiKey: API_KEY, url: selected.url },
                    timeout: 20000
                });

                if (!epRes.data?.results?.length) {
                    throw new Error('No episodes found');
                }

                // Flatten all episodes across all seasons
                const flatEpisodes = [];
                epRes.data.results.forEach(seasonBlock => {
                    (seasonBlock.episodes || []).forEach(ep => {
                        flatEpisodes.push({
                            ...ep,
                            season: seasonBlock.season
                        });
                    });
                });

                let epText = `🎞️ *${selected.title}*\n\n`;
                epText += `* ⭐ 𝗥ᴀᴛɪɴɢ* ➟ _${selected.rating || 'N/A'}_\n`;
                epText += `* 📅 𝗬ᴇᴀʀ* ➟ _${selected.year || 'N/A'}_\n`;
                epText += `* 📺 𝗧ʏᴘᴇ* ➟ _${selected.type || 'N/A'}_\n`;
                epText += `* 🎬 𝗧ᴏᴛᴀʟ 𝗦ᴇᴀꜱᴏɴꜱ* ➟ _${epRes.data.total_seasons || 'N/A'}_\n\n`;
                epText += `*📋 ᴇᴘɪꜱᴏᴅᴇꜱ*\n\n`;

                flatEpisodes.forEach((ep, i) => {
                    epText += `*${i + 1}.* ${ep.episode_number} - ${ep.title}\n     _${ep.season} • ${ep.date || 'N/A'}_\n\n`;
                });
                epText += `*🔢 ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ ɴᴜᴍʙᴇʀ (1-${flatEpisodes.length}) ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ*`;

                const epMsg = await socket.sendMessage(sender, {
                    image: { url: selected.thumbnail },
                    caption: epText
                }, { quoted: mek });

                // LISTENER 2: pick episode
                const epListener = async (update2) => {
                    const mek2 = update2.messages[0];
                    if (!mek2?.message) return;
                    const ctx2 = mek2.message.extendedTextMessage?.contextInfo;
                    if (!ctx2 || ctx2.stanzaId !== epMsg.key.id) return;
                    const text2 =
                        mek2.message.conversation ||
                        mek2.message.extendedTextMessage?.text;

                    const epIdx = parseInt(text2);
                    if (isNaN(epIdx) || epIdx < 1 || epIdx > flatEpisodes.length) return;
                    socket.ev.off('messages.upsert', epListener);

                    const selectedEp = flatEpisodes[epIdx - 1];
                    await socket.sendMessage(sender, { react: { text: '⬇️', key: mek2.key } });

                    try {
                        // STEP 3: Get landing page redirect link
                        const dlRes = await axios.get(`${BASE_URL}/animeclub/dl`, {
                            params: { apiKey: API_KEY, url: selectedEp.url },
                            timeout: 30000
                        });

                        if (!dlRes.data?.success || !dlRes.data.results?.length) {
                            throw new Error('Download link not found');
                        }

                        const dlOption = dlRes.data.results[0];
                        const landingUrl = dlOption.redirect_url;

                        if (!landingUrl) throw new Error('Download link not found in API response');

                        // Fetch the landing/wait page HTML to extract the Google Drive file ID
                        const pageRes = await axios.get(landingUrl, {
                            timeout: 20000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        });

                        const html = pageRes.data;
                        const driveMatch = html.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);

                        if (!driveMatch) {
                            throw new Error('Could not extract Google Drive link from landing page');
                        }

                        const fileId = driveMatch[1];

                        // Reliable direct-download link that bypasses Google's large-file virus scan warning
                        const downloadLink = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;

                        const fileName = `${selected.title}_${selectedEp.episode_number}`.replace(/[^a-zA-Z0-9]/g, '_');

                        // Download the actual video bytes into a buffer first (avoids
                        // WhatsApp trying to fetch an HTML/redirect page instead of the mp4)
                        await socket.sendMessage(sender, { text: '⬇️ Downloading video, please wait...' }, { quoted: mek2 });

                        const videoRes = await axios.get(downloadLink, {
                            responseType: 'arraybuffer',
                            timeout: 120000, // large files need more time
                            maxContentLength: Infinity,
                            maxBodyLength: Infinity,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        });

                        // Some Drive links still respond with an HTML confirm page instead
                        // of the binary file — detect that case and fail clearly.
                        const contentType = videoRes.headers['content-type'] || '';
                        if (contentType.includes('text/html')) {
                            throw new Error('Received an HTML page instead of the video file (Drive confirmation page). Try again or check the link.');
                        }

                        const videoBuffer = Buffer.from(videoRes.data);

                        await socket.sendMessage(sender, {
                            document: videoBuffer,
                            mimetype: 'video/mp4',
                            fileName: `${fileName}.mp4`,
                            caption: `🎬 *${selected.title}*\n📺 ${selectedEp.episode_number} - ${selectedEp.title}\n🎚️ Quality: ${dlOption.quality || 'N/A'}\n🗣️ Language: ${dlOption.language || 'N/A'}`
                        }, { quoted: mek2 });

                        await socket.sendMessage(sender, { react: { text: '✅', key: mek2.key } });

                    } catch (err) {
                        await socket.sendMessage(sender, {
                            text: '❌ DOWNLOAD ERROR\n\n' + err.message
                        }, { quoted: mek2 });
                        await socket.sendMessage(sender, { react: { text: '❌', key: mek2.key } });
                    }
                };

                socket.ev.on('messages.upsert', epListener);
                setTimeout(() => {
                    socket.ev.off('messages.upsert', epListener);
                }, 300000);

            } catch (err) {
                await socket.sendMessage(sender, {
                    text: '❌ ERROR\n\n' + err.message
                }, { quoted: mek });
            }
        };

        socket.ev.on('messages.upsert', animeListener);
        setTimeout(() => {
            socket.ev.off('messages.upsert', animeListener);
        }, 300000);

    } catch (err) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n' + (err.response?.data?.message || err.message)
        }, { quoted: msg });
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
 case 'updown': {
    // 📱 UPDOWN - Uptodown App Downloader
    // Usage: .updown <app_name>
    // Example: .updown call of duty

    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `❌ *Usage Error*\n\n*.updown <app_name>*\n\n*Example:*\n\`.updown call of duty\`\n\`.updown minecraft\`\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
        }, { quoted: msg });
        break;
    }

    const appQuery = args.join(' ');

    await socket.sendMessage(sender, { react: { text: '📱', key: msg.key } });
    await socket.sendMessage(sender, {
        text: `🔍 *Searching Uptodown for:* "${appQuery}"\n\n⏳ Please wait...`
    }, { quoted: msg });

    const DL_API_KEY = 'key_c250c68599bea960';
    const SEARCH_URL = 'https://mr-thinuzz-api-build.vercel.app/api/uptodown/search';
    const APP_URL = 'https://mr-thinuzz-api-build.vercel.app/api/uptodown/app';
    const DOWNLOAD_URL = 'https://mr-thinuzz-api-build.vercel.app/api/uptodown/download';

    try {
        // ═══════ STEP 1: SEARCH UPTODOWN ═══════
        const searchRes = await axios.get(SEARCH_URL, {
            params: {
                query: appQuery,
                apiKey: DL_API_KEY
            },
            timeout: 30000
        });

        if (!searchRes.data?.status || !searchRes.data?.data?.results || searchRes.data.data.results.length === 0) {
            await socket.sendMessage(sender, {
                text: `❌ *No results found for:* "${appQuery}"\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
            }, { quoted: msg });
            break;
        }

        const results = searchRes.data.data.results.slice(0, 10);

        let listText = `📱 *UPTODOWN SEARCH RESULTS*\n\n*Query:* ${appQuery}\n*Results:* ${results.length}\n\nReply with number to select:\n\n`;
        results.forEach((item, i) => {
            listText += `*${i + 1}.* 📦 ${item.title}\n`;
            if (item.description) listText += `   _${item.description}_\n`;
        });
        listText += `\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

        const searchMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });
        const searchMsgId = searchMsg.key.id;

        // ═══════ STEP 2: HANDLE SELECTION ═══════
        const handleSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const replyText = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSearch = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === searchMsgId;

            if (!isReplyToSearch || sender !== replyMek.key.remoteJid) return;

            const choice = parseInt(replyText) - 1;
            if (isNaN(choice) || choice < 0 || choice >= results.length) {
                await socket.sendMessage(sender, {
                    text: `❌ *Invalid selection!* Please reply with a number between 1-${results.length}\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                }, { quoted: replyMek });
                return;
            }

            socket.ev.off('messages.upsert', handleSelection);

            const selected = results[choice];
            await socket.sendMessage(sender, {
                text: `⏳ *Fetching details for:*\n"${selected.title}"\n\nPlease wait...`
            }, { quoted: replyMek });
            await socket.sendMessage(sender, { react: { text: '📋', key: replyMek.key } });

            try {
                // ═══════ STEP 3: GET APP DETAILS ═══════
                const appRes = await axios.get(APP_URL, {
                    params: {
                        url: selected.url,
                        apiKey: DL_API_KEY
                    },
                    timeout: 30000
                });

                if (!appRes.data?.status || !appRes.data?.data) {
                    throw new Error(appRes.data?.message || 'App details API error');
                }

                const appData = appRes.data.data;

                // ═══════ STEP 4: GET DOWNLOAD LINK ═══════
                const dlRes = await axios.get(DOWNLOAD_URL, {
                    params: {
                        url: selected.url,
                        apiKey: DL_API_KEY
                    },
                    timeout: 30000
                });

                if (!dlRes.data?.status || !dlRes.data?.data) {
                    throw new Error(dlRes.data?.message || 'Download API error');
                }

                const dlData = dlRes.data.data;
                const downloadLink = dlData.download_url;

                // ═══════ STEP 5: SEND DETAILS CARD WITH IMAGE ═══════
                const detailsCaption =
`📱 *ᴀᴘᴘ ᴅᴇᴛᴀɪʟꜱ*

*📦 Title:* ${appData.title}
*🏢 Developer:* ${appData.developer || 'N/A'}
*🔢 Version:* ${appData.version || 'N/A'}
*⭐ Rating:* ${appData.rating || 'N/A'}
*📥 Downloads:* ${appData.downloads || 'N/A'}
*💾 Size:* ${appData.file_size || 'N/A'}
*📦 Type:* ${appData.file_type || 'N/A'}
*📅 Updated:* ${appData.last_updated || 'N/A'}
*🔗 Uptodown:* ${selected.url}

> ${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`;

                const messageOptions = {
                    contextInfo: {
                        isForwarded: false,
                        forwardingScore: 0,
                        externalAdReply: {
                            title: appData.title,
                            body: `⭐ ${appData.rating || 'N/A'} | 💾 ${appData.file_size || 'N/A'} | 📥 ${appData.downloads || 'N/A'}`,
                            thumbnailUrl: appData.icon || config.SITHIJA_IMAGE_PATH,
                            sourceUrl: selected.url,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        },
                        mentionedJid: []
                    }
                };

                if (appData.icon && appData.icon.startsWith('http')) {
                    await socket.sendMessage(sender, {
                        image: { url: appData.icon },
                        caption: detailsCaption,
                        ...messageOptions
                    }, { quoted: replyMek });
                } else {
                    await socket.sendMessage(sender, {
                        text: detailsCaption,
                        ...messageOptions
                    }, { quoted: replyMek });
                }

                // ═══════ STEP 6: SEND APK FILE DIRECTLY ═══════
                await socket.sendMessage(sender, {
                    react: { text: '⬆️', key: replyMek.key }
                });

                await socket.sendMessage(sender, {
                    text: `⏳ *Uploading APK...*\n💾 *Size:* ${appData.file_size || 'N/A'}\n\nThis may take a while depending on file size...`
                }, { quoted: replyMek });

                // Send APK as document
                const fileExt = appData.file_type ? appData.file_type.toLowerCase() : 'apk';
                const mimeType = fileExt === 'xapk' ? 'application/vnd.android.package-archive' : 'application/vnd.android.package-archive';

                await socket.sendMessage(sender, {
                    document: { url: downloadLink },
                    mimetype: mimeType,
                    fileName: `${appData.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_${appData.version || 'latest'}.${fileExt}`,
                    caption: `📦 *${appData.title}*\n🔢 *Version:* ${appData.version || 'N/A'}\n💾 *Size:* ${appData.file_size || 'N/A'}\n\n✅ Downloaded from Uptodown\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`,
                    contextInfo: {
                        isForwarded: false,
                        forwardingScore: 0,
                        externalAdReply: {
                            title: appData.title,
                            body: `📦 ${appData.version || 'N/A'} | 💾 ${appData.file_size || 'N/A'}`,
                            thumbnailUrl: appData.icon || config.SITHIJA_IMAGE_PATH,
                            sourceUrl: selected.url,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        }
                    }
                }, { quoted: replyMek });

                await socket.sendMessage(sender, { react: { text: '✅', key: replyMek.key } });

            } catch (err) {
                console.error('UPDOWN details error:', err);
                await socket.sendMessage(sender, {
                    text: `❌ *Error:*\n${err.message}\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
                }, { quoted: replyMek });
                await socket.sendMessage(sender, { react: { text: '❌', key: replyMek.key } });
            }
        };

        socket.ev.on('messages.upsert', handleSelection);
        setTimeout(() => {
            socket.ev.off('messages.upsert', handleSelection);
        }, 300000); // 5 minutes timeout

    } catch (err) {
        console.error('UPDOWN search error:', err);
        await socket.sendMessage(sender, {
            text: `❌ *Search Error:*\n${err.message}\n\n${sessionConfig.BOT_FOOTER || config.BOT_FOOTER}`
        }, { quoted: msg });
        await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
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
case 'npm':
case 'npmjs': {
    try {
        let pkgName = typeof q !== 'undefined' && q ? q : (typeof text !== 'undefined' ? text : '');
        
        if (!pkgName) {
            return await socket.sendMessage(sender, {
                text: `⚠️ කරුණාකර සෙවීම සඳහා NPM Package එකක නමක් ලබා දෙන්න!\n\n*Example:* .npm baileys`
            }, { quoted: msg });
        }

        const apiUrl = `https://hashu-apis-official.onrender.com/api/npm?apiKey=hashu_0a545d40271a1ac9af078037bacaf36d&text=${encodeURIComponent(pkgName)}`;

        const response = await axios.get(apiUrl);
        const resData = response.data;

        if (resData && resData.success && resData.results && resData.results.name) {
            const pkg = resData.results;

            const npmText = 
`📦 *NPM PACKAGE DETAILS*

📌 *Name:* ${pkg.name}
🏷️ *Latest Version:* ${pkg.latest}
📜 *License:* ${pkg.license || 'N/A'}
📝 *Description:* ${pkg.description || 'No description available'}
🔗 *Homepage:* ${pkg.homepage || 'N/A'}

_Powered by Hashu API_`;

            await socket.sendMessage(sender, {
                text: npmText
            }, { quoted: msg });

        } else {
            await socket.sendMessage(sender, {
                text: `❌ *${pkgName}* නමින් NPM Package එකක් සොයා ගැනීමට නොහැකි විය.`
            }, { quoted: msg });
        }

    } catch (error) {
        console.error("NPM command error:", error);

        await socket.sendMessage(sender, {
            text: `❌ NPM තොරතුරු ලබා ගැනීමේදී දෝෂයක් සිදු විය!\n\n` +
                  `Error: ${error.message}`
        }, { quoted: msg });
    }
    break;
}
case 'image':
case 'aiimg': {
    try {
        // User එවන text prompt එක ගන්න
        let prompt = typeof q !== 'undefined' && q ? q : (typeof text !== 'undefined' ? text : '');
        
        // Prompt එකක් නැත්නම් error message එවනවා
        if (!prompt) {
            await socket.sendMessage(sender, {
                text: `❌ *Error:* කරුණාකර image එකක් generate කරන්න ඕන text එකක් ලබා දෙන්න.\n\nඋදාහරණ:\n• .image a beautiful sunset over the ocean\n• .aiimg cyberpunk city neon lights`
            }, { quoted: msg });
            break;
        }

        // Loading message එකක් එවනවා
        await socket.sendMessage(sender, {
            text: `⏳ *AI Image Generating...*\n\n📝 Prompt: _${prompt}_\n\nකරුණාකර රැඳී සිටින්න, මේ පොඩ්ඩක් වෙලා යයි...`
        }, { quoted: msg });

        // API URL එක සකස් කිරීම
        const apiUrl = `https://hashu-apis-production.up.railway.app/api/aiimage?apiKey=hashu_9013c10019468c3f3305e2d6796e6cd6&text=${encodeURIComponent(prompt)}`;

        // API Request එක යැවීම
        const response = await axios.get(apiUrl);
        const resData = response.data;

        // Data නිවැරදිව ලැබී ඇත්දැයි පරීක්ෂා කිරීම
        if (resData && resData.success && resData.result) {
            const imageUrl = resData.result;

            // Image එක send කිරීම
            await socket.sendMessage(sender, {
                image: { url: imageUrl },
                caption: `🎨 *AI Generated Image*\n\n📝 *Prompt:* ${prompt}\n\n_Powered by Hashu API_`
            }, { quoted: msg });

        } else if (resData && resData.result) {
            // Success flag නැතත් result තියෙනවා නම්
            await socket.sendMessage(sender, {
                image: { url: resData.result },
                caption: `🎨 *AI Generated Image*\n\n📝 *Prompt:* ${prompt}\n\n_Powered by Hashu API_`
            }, { quoted: msg });

        } else {
            await socket.sendMessage(sender, {
                text: `❌ *Error:* "${prompt}" සඳහා image generate කිරීමට නොහැකි විය.\n\nකරුණාකර වෙනත් prompt එකක් උත්සාහ කරන්න.`
            }, { quoted: msg });
        }

    } catch (error) {
        console.error("AI Image command error:", error);

        await socket.sendMessage(sender, {
            text: `❌ *AI Image Error!*\n\n` +
                  `Error: ${error.message}\n\n` +
                  `කරුණාකර පසුව නැවත උත්සාහ කරන්න.`
        }, { quoted: msg });
    }
    break;
}



              
case 'moviesublk': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*කරුණාකර චිත්‍රපටයේ නම ලබාදෙන්න! උදා: .moviesublk new*'
        }, { quoted: msg });
        break;
    }

    const msQuery = args.join(' ');
    const msSearchUrl = 'https://moviesublk-new-api.vercel.app/search';
    const msDownloadApi = 'https://web-production-33c27.up.railway.app/gdrive/download?url=';
    
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
    const gdriveDownloadApi = 'https://web-production-33c27.up.railway.app/gdrive/download?url=';
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

case 'weather':
case 'weathernews': {
    try {
        let city = typeof q !== 'undefined' && q ? q : (typeof text !== 'undefined' ? text : '');
        
        if (!city) {
            city = 'Colombo';
        }

        const apiUrl = `https://hashu-apis-official.onrender.com/api/weather?apiKey=hashu_0a545d40271a1ac9af078037bacaf36d&text=${encodeURIComponent(city)}`;

        const response = await axios.get(apiUrl);
        const resData = response.data;

        if (resData && resData.success && resData.results) {
            const w = resData.results;

            const weatherText = 
`🌤️ *WEATHER INFORMATION*

📍 *Location:* ${w.location}
🌡️ *Temperature:* ${w.temperature}
☁️ *Condition:* ${w.condition}
💨 *Wind Speed:* ${w.windspeed}
⏰ *Time:* ${w.time}

_Powered by Hashu API_`;

            await socket.sendMessage(sender, {
                text: weatherText
            }, { quoted: msg });

        } else {
            await socket.sendMessage(sender, {
                text: `❌ *${city}* නගරය සඳහා කාලගුණ තොරතුරු සොයා ගැනීමට නොහැකි විය.`
            }, { quoted: msg });
        }

    } catch (error) {
        console.error("Weather command error:", error);

        await socket.sendMessage(sender, {
            text: `❌ කාලගුණ තොරතුරු ලබා ගැනීමේදී දෝෂයක් සිදු විය!\n\n` +
                  `Error: ${error.message}`
        }, { quoted: msg });
    }
    break;
}
              
   

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
case 'yts': {
    if (!args.length) {
        return await socket.sendMessage(sender, {
            text: `❌ *𝐄𝐱𝐚𝐦𝐩𝐥𝐞:*\n*${config.PREFIX}yt alan walker faded*`
        }, { quoted: msg });
    }

    const query = args.join(" ");

    await socket.sendMessage(sender, {
        text: "🔍 *𝐒𝐞𝐚𝐫𝐜𝐡𝐢𝐧𝐠 𝐘𝐨𝐮𝐓𝐮𝐛𝐞...*"
    }, { quoted: msg });

    try {
        const { data } = await axios.get(
            `https://yt-search-api-amber.vercel.app/search?q=${encodeURIComponent(query)}`
        );

        const results = data?.data?.results;

        if (!results || !results.length) {
            return await socket.sendMessage(sender, {
                text: "❌ *𝐍𝐨 𝐫𝐞𝐬𝐮𝐥𝐭𝐬 𝐟𝐨𝐮𝐧𝐝.*"
            }, { quoted: msg });
        }

        // First 10 results
        const limit = Math.min(results.length, 10);

        let listText = `🎬 *𝐘𝐨𝐮𝐓𝐮𝐛𝐞 𝐒𝐞𝐚𝐫𝐜𝐡 𝐑𝐞𝐬𝐮𝐥𝐭𝐬*\n`;
        listText += `🔎 *Query:* ${query}\n`;
        listText += `📊 *Found:* ${data.data.count} videos\n\n`;

        for (let i = 0; i < limit; i++) {
            const item = results[i];

            listText += `*${i + 1}.* ${item.title}\n`;
            listText += `   👤 ${item.channel}\n`;
            listText += `   ⏱️ ${item.duration}\n`;
            listText += `   📅 ${item.published}\n`;
            listText += `   👁️ ${item.views}\n`;
            listText += `   🔗 ${item.url}\n\n`;
        }

        listText += `✅ *𝐒𝐡𝐨𝐰𝐢𝐧𝐠 ${limit} 𝐨𝐟 ${data.data.count} 𝐫𝐞𝐬𝐮𝐥𝐭𝐬*`;

        await socket.sendMessage(sender, {
            text: listText
        }, { quoted: msg });

    } catch (err) {
        console.log("YT Search Error:", err);
        await socket.sendMessage(sender, {
            text: `❌ *Error:* ${err.message}`
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
case 'twitter':
case 'x':
case 'tw': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `❌ *𝐄𝐫𝐫𝐨𝐫*\n\nකරුණාකර Twitter/X link එක ලබාදෙන්න!\n\n*උදාහරණ:*\n\`.tw https://x.com/username/status/xxxxx\``
        }, { quoted: msg });
        break;
    }

    const twitterUrl = args[0];
    const API_KEY = '4992301b98bb4aaba5d1431f15d8046b';
    const BASE_URL = 'https://nexe-nk.vercel.app/twitter-download';

    await socket.sendMessage(sender, {
        text: "⏳ *𝐅𝐞𝐭𝐜𝐡𝐢𝐧𝐠 𝐓𝐰𝐢𝐭𝐭𝐞𝐫/𝐗 𝐦𝐞𝐝𝐢𝐚...*"
    }, { quoted: msg });

    try {
        const { data } = await axios.get(
            `${BASE_URL}?url=${encodeURIComponent(twitterUrl)}&api_key=${API_KEY}`
        );

        if (!data.success || !data.media || data.media.length === 0) {
            await socket.sendMessage(sender, {
                text: "❌ *𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐟𝐞𝐭𝐜𝐡 𝐓𝐰𝐢𝐭𝐭𝐞𝐫/𝐗 𝐦𝐞𝐝𝐢𝐚.*"
            }, { quoted: msg });
            break;
        }

        const mediaItem = data.media[0];
        const isVideo = data.type === 'video';
        const downloads = mediaItem.downloads || [];

        // Build download options from API response
        const options = [];
        downloads.forEach((dl, index) => {
            options.push({ num: index + 1, label: dl.label, url: dl.url });
        });

        if (options.length === 0) {
            await socket.sendMessage(sender, {
                text: "❌ *𝐍𝐨 𝐝𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐥𝐢𝐧𝐤𝐬 𝐟𝐨𝐮𝐧𝐝.*"
            }, { quoted: msg });
            break;
        }

        let optionsText = `🐦 *𝐓𝐖𝐈𝐓𝐓𝐄𝐑/𝐗 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑*\n\n`;
        optionsText += `*Type:* ${isVideo ? '🎬 Video' : '📷 Photo'}\n\n`;
        optionsText += `*Download Options:*\n\n`;

        options.forEach(opt => {
            optionsText += `${opt.num}. ${opt.label}\n`;
        });

        optionsText += `\n*අංකය reply කරන්න:*\n${config.BOT_FOOTER || ''}`;

        const sentMsg = await socket.sendMessage(sender, { text: optionsText }, { quoted: msg });
        const msgID = sentMsg.key.id;

        const handleDownload = async ({ messages: upsertMessages }) => {
            const replyMek = upsertMessages[0];
            if (!replyMek?.message) return;

            const replyText = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSent = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === msgID;

            if (!isReplyToSent || sender !== replyMek.key.remoteJid) return;

            const choice = parseInt(replyText);
            const selected = options.find(o => o.num === choice);

            if (!selected) {
                await socket.sendMessage(sender, {
                    text: `❌ *𝐈𝐧𝐯𝐚𝐥𝐢𝐝! 1-${options.length} අතර අංකයක් තෝරන්න!*`
                }, { quoted: replyMek });
                return;
            }

            await socket.sendMessage(sender, {
                text: `⏳ *Downloading ${selected.label}...*`
            }, { quoted: replyMek });

            try {
                if (isVideo) {
                    await socket.sendMessage(sender, {
                        video: { url: selected.url },
                        caption: `*Quality:* ${selected.label}\n\n${config.BOT_FOOTER || ''}`
                    }, { quoted: replyMek });
                } else {
                    await socket.sendMessage(sender, {
                        image: { url: selected.url },
                        caption: `*Quality:* ${selected.label}\n\n${config.BOT_FOOTER || ''}`
                    }, { quoted: replyMek });
                }
            } catch (err) {
                console.error('Twitter download error:', err);
                await socket.sendMessage(sender, {
                    text: `❌ *Download failed:*\n${err.message}`
                }, { quoted: replyMek });
            }

            socket.ev.off('messages.upsert', handleDownload);
        };

        socket.ev.on('messages.upsert', handleDownload);

    } catch (err) {
        console.error('Twitter error:', err);
        await socket.sendMessage(sender, {
            text: `❌ *𝐄𝐫𝐫𝐨𝐫:*\n${err.message || 'Failed to fetch Twitter/X media'}`
        }, { quoted: msg });
    }

    break;
}

              
case 'ig':
case 'instagram': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `❌ *𝐄𝐫𝐫𝐨𝐫*\n\nකරුණාකර Instagram link එක ලබාදෙන්න!\n\n*උදාහරණ:*\n\`.ig https://www.instagram.com/reel/xxxxx\``
        }, { quoted: msg });
        break;
    }

    const instaUrl = args[0];
    const API_KEY = '4992301b98bb4aaba5d1431f15d8046b';
    const BASE_URL = 'https://nexe-nk.vercel.app/instagram-download';

    await socket.sendMessage(sender, {
        text: "⏳ *𝐅𝐞𝐭𝐜𝐡𝐢𝐧𝐠 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦 𝐦𝐞𝐝𝐢𝐚...*"
    }, { quoted: msg });

    try {
        const { data } = await axios.get(
            `${BASE_URL}?url=${encodeURIComponent(instaUrl)}&api_key=${API_KEY}`
        );

        if (!data.success || !data.media || data.media.length === 0) {
            await socket.sendMessage(sender, {
                text: "❌ *𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐟𝐞𝐭𝐜𝐡 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦 𝐦𝐞𝐝𝐢𝐚.*"
        }, { quoted: msg });
            break;
        }

        const mediaItem = data.media[0];
        const isVideo = data.type === 'video';
        const downloads = mediaItem.downloads || [];

        // Build download options from API response
        const options = [];
        downloads.forEach((dl, index) => {
            options.push({ num: index + 1, label: dl.label, url: dl.url });
        });

        if (options.length === 0) {
            await socket.sendMessage(sender, {
                text: "❌ *𝐍𝐨 𝐝𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐥𝐢𝐧𝐤𝐬 𝐟𝐨𝐮𝐧𝐝.*"
            }, { quoted: msg });
            break;
        }

        let optionsText = `📸 *𝐈𝐍𝐒𝐓𝐀𝐆𝐑𝐀𝐌 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑*\n\n`;
        optionsText += `*Type:* ${isVideo ? '🎬 Video' : '📷 Photo'}\n\n`;
        optionsText += `*Download Options:*\n\n`;

        options.forEach(opt => {
            optionsText += `${opt.num}. ${opt.label}\n`;
        });

        optionsText += `\n*අංකය reply කරන්න:*\n${config.BOT_FOOTER || ''}`;

        const sentMsg = await socket.sendMessage(sender, { text: optionsText }, { quoted: msg });
        const msgID = sentMsg.key.id;

        const handleDownload = async ({ messages: upsertMessages }) => {
            const replyMek = upsertMessages[0];
            if (!replyMek?.message) return;

            const replyText = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSent = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === msgID;

            if (!isReplyToSent || sender !== replyMek.key.remoteJid) return;

            const choice = parseInt(replyText);
            const selected = options.find(o => o.num === choice);

            if (!selected) {
                await socket.sendMessage(sender, {
                    text: `❌ *𝐈𝐧𝐯𝐚𝐥𝐢𝐝! 1-${options.length} අතර අංකයක් තෝරන්න!*`
                }, { quoted: replyMek });
                return;
            }

            await socket.sendMessage(sender, {
                text: `⏳ *Downloading ${selected.label}...*`
            }, { quoted: replyMek });

            try {
                if (isVideo) {
                    await socket.sendMessage(sender, {
                        video: { url: selected.url },
                        caption: `*Quality:* ${selected.label}\n\n${config.BOT_FOOTER || ''}`
                    }, { quoted: replyMek });
                } else {
                    await socket.sendMessage(sender, {
                        image: { url: selected.url },
                        caption: `*Quality:* ${selected.label}\n\n${config.BOT_FOOTER || ''}`
                    }, { quoted: replyMek });
                }
            } catch (err) {
                console.error('Instagram download error:', err);
                await socket.sendMessage(sender, {
                    text: `❌ *Download failed:*\n${err.message}`
                }, { quoted: replyMek });
            }

            socket.ev.off('messages.upsert', handleDownload);
        };

        socket.ev.on('messages.upsert', handleDownload);

    } catch (err) {
        console.error('Instagram error:', err);
        await socket.sendMessage(sender, {
            text: `❌ *𝐄𝐫𝐫𝐨𝐫:*\n${err.message || 'Failed to fetch Instagram media'}`
        }, { quoted: msg });
    }

    break;
}
     
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
case 'antidelete':
case 'ad': {
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: "🔒 *Session owner ekta witharai me command eka use karanna puluwan.*"
        }, { quoted: msg });
    }
    const sub = (args[0] || '').toLowerCase();
    if (sub === 'on' || sub === 'off') {
        sessionConfig = { ...sessionConfig, ANTI_DELETE: sub === 'on' ? 'true' : 'false' };
        await updateUserConfig(sanitizedNumber, sessionConfig);
        activeSockets.set(sanitizedNumber, { socket, config: sessionConfig });
        return await socket.sendMessage(sender, {
            text: `✅ *Anti-Delete* ${sub === 'on' ? 'ᴇɴᴀʙʟᴇᴅ ✅' : 'ᴅɪsᴀʙʟᴇᴅ ❌'}`
        }, { quoted: msg });
    }
    return await socket.sendMessage(sender, {
        text: `📌 *Usage:* \`.antidelete on\` / \`.antidelete off\`\n\nCurrent: *${sessionConfig.ANTI_DELETE === 'true' ? 'ON ✅' : 'OFF ❌'}*`
    }, { quoted: msg });
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
case 'apk2': {
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n*Need App Name*\n\n_Example: .apk whatsapp_'
        }, { quoted: msg });
        break;
    }

    const appName = args.join(' ');
    const API_KEY = 'sithi_usueu4rtuj37urjufu3euj';
    const SEARCH_URL = 'https://sithija-apis2-production.up.railway.app/api/apk/search';
    const DL_URL = 'https://sithija-apis2-production.up.railway.app/api/apk/dl';

    await socket.sendMessage(sender, { text: '🔍 Searching for apps...' });

    try {
        // Step 1: Search apps
        const searchRes = await axios.get(SEARCH_URL, {
            params: { apiKey: API_KEY, text: appName },
            timeout: 30000
        });

        if (!searchRes.data?.success) {
            throw new Error(searchRes.data?.message || 'Search API Error');
        }

        const results = searchRes.data.results || [];
        if (!results.length) {
            await socket.sendMessage(sender, {
                text: '❌ No apps found for: _' + appName + '_'
            }, { quoted: msg });
            break;
        }

        // Build list card
        let listText = ` *📱 APK SEARCH RESULTS* \n\n*Query:* _${appName}_\n\n`;
        results.forEach((app, i) => {
            listText += `*${String(i + 1).padStart(2, '0')}.* ${app.packageName}\n`;
        });
        listText += `\n*🔢 𝗥ᴇᴘʟʏ 𝴡ɪᴛʜ ᴀ 𝗡ᴜᴍʙᴇʀ 👇*`;

        // Step 2: Send list
        const sentMsg = await socket.sendMessage(sender, {
            text: listText
        }, { quoted: msg });

        // Step 3: Listen for reply
        const listener = async (update) => {
            const mek = update.messages[0];
            if (!mek?.message) return;

            const ctx = mek.message.extendedTextMessage?.contextInfo;
            if (!ctx || ctx.stanzaId !== sentMsg.key.id) return;

            const text = mek.message.conversation || mek.message.extendedTextMessage?.text;
            const selectedIndex = parseInt(text) - 1;

            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= results.length) return;

            // Remove listener
            socket.ev.off('messages.upsert', listener);

            const selectedApp = results[selectedIndex];
            const packageName = selectedApp.packageName;

            await socket.sendMessage(sender, { react: { text: '⬇️', key: mek.key } });

            try {
                // Step 4: Fetch download info
                const dlRes = await axios.get(DL_URL, {
                    params: { apiKey: API_KEY, text: packageName },
                    timeout: 60000
                });

                if (!dlRes.data?.success) {
                    throw new Error(dlRes.data?.message || 'Download API Error');
                }

                const appInfo = dlRes.data.results || {};
                const downloadUrl = appInfo.download;
                const version = appInfo.version || 'N/A';
                const size = appInfo.size_mb || 'N/A';

                if (!downloadUrl) {
                    throw new Error('No download link found');
                }

                // Step 5: Send APK info + download
                await socket.sendMessage(sender, {
                    document: { url: downloadUrl },
                    mimetype: 'application/vnd.android.package-archive',
                    fileName: `${packageName}_${version}.apk`,
                    caption: `📱 *APK Download*\n\n*Name:* ${packageName}\n*Version:* ${version}\n*Size:* ${size} MB`
                }, { quoted: mek });

                await socket.sendMessage(sender, { react: { text: '✅', key: mek.key } });

            } catch (err) {
                await socket.sendMessage(sender, {
                    text: '❌ DOWNLOAD ERROR\n\n' + (err.response?.data?.message || err.message)
                }, { quoted: mek });
                await socket.sendMessage(sender, { react: { text: '❌', key: mek.key } });
            }
        };

        socket.ev.on('messages.upsert', listener);
        setTimeout(() => {
            socket.ev.off('messages.upsert', listener);
        }, 300000); // 5 min timeout

    } catch (err) {
        await socket.sendMessage(sender, {
            text: '❌ ERROR\n\n' + (err.response?.data?.message || err.message)
        }, { quoted: msg });
    }

    break;
}
              
case 'menu': {
    await displayMainMenu(socket, sender, msg, sessionConfig);
    break;
}

case 'alive': {
    if (isButtonMenuEnabled(sessionConfig)) {
        await showAliveButtons(socket, sender, msg, sessionConfig);
    } else {
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


case 'button': {
    if (!isOwner) {
        return await socket.sendMessage(sender, { text: "🔒 Owner only!" }, { quoted: msg });
    }
    const sub = (args[0] || '').toLowerCase();
    if (sub === 'on') {
        sessionConfig = { ...sessionConfig, BUTTON_MENU: 'true' };
        await updateUserConfig(sanitizedNumber, sessionConfig);
        activeSockets.set(sanitizedNumber, { socket, config: sessionConfig });
        await sendButtonMessage(socket, sender, {
            text: `✅ *Button Menu ENABLED!*`,
            footer: 'SITHIJA X MD',
            buttons: [
                { id: 'nav_menu', text: '📋 Try Menu' },
                { id: 'exec_alive', text: '✅ Try Alive' }
            ],
            quoted: msg
        });
    } else if (sub === 'off') {
        sessionConfig = { ...sessionConfig, BUTTON_MENU: 'false' };
        await updateUserConfig(sanitizedNumber, sessionConfig);
        activeSockets.set(sanitizedNumber, { socket, config: sessionConfig });
        await socket.sendMessage(sender, { 
            text: `❌ *Button Menu DISABLED!*\nUse *.button on* to enable.` 
        }, { quoted: msg });
    } else {
        const status = isButtonMenuEnabled(sessionConfig) ? '✅ ON' : '❌ OFF';
        await sendButtonMessage(socket, sender, {
            text: `🔘 *Button Menu*\nStatus: ${status}`,
            footer: 'Owner only',
            buttons: [
                { id: 'btn_dummy_on', text: '✅ Turn ON' },
                { id: 'btn_dummy_off', text: '❌ Turn OFF' }
            ],
            quoted: msg
        });
    }
    break;
}
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

        // 1. RAM Memory එකෙන් (Active sockets) එසැණින්ම අයින් කිරීම
        if (typeof activeSockets !== 'undefined' && activeSockets.has(sanitizedNumber)) {
            try {
                activeSockets.get(sanitizedNumber).socket.end(); // දැනට තියෙන connection එක නවත්වන්න
            } catch (e) {}
            activeSockets.delete(sanitizedNumber);
        }
        if (typeof socketCreationTime !== 'undefined') {
            socketCreationTime.delete(sanitizedNumber);
        }

        // 2. Database එකෙන් Session එක මැකීම
        await Session.deleteOne({ number: sanitizedNumber });

        // 3. Server එකේ තියෙන Session Folder එක මැකීම
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        if (fs.existsSync(sessionPath)) {
            fs.removeSync(sessionPath);
        }

        // 4. Number List JSON එකෙන් අයින් කිරීම
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            let numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
            numbers = numbers.filter(n => n !== sanitizedNumber);
            fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
        }

        console.log(`🗑️ Session wiped successfully for: ${sanitizedNumber}`);
        
    } catch (error) {
        console.error(`❌ Error while deleting session for ${number}:`, error);
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

    const pino = require('pino');
    const logger = pino({ level: 'silent' }); // Heroku logs පිරෙන්නේ නැති වෙන්න 'silent' දැම්මා

try {
    const socket = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        logger,
        browser: Browsers.macOS('Safari')
    });


        socketCreationTime.set(sanitizedNumber, Date.now());
        setupStatusHandlers(socket);
        setupCommandHandlers(socket, sanitizedNumber);
    setupButtonMenuListeners(socket, sanitizedNumber);
        setupMessageHandlers(socket);
        setupAutoRestart(socket, sanitizedNumber);
        setupNewsletterHandlers(socket, sanitizedNumber);
        // 🗑️ Anti-delete logic eka dæn setupCommandHandlers ekema messages.upsert handler eke thamai integrate karala thiyenne
        // (venama function ekak nathi nisa, mehe call ekak one na)

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
            // connection එක සමඟ lastDisconnect දත්තද ලබා ගනී
            const { connection, lastDisconnect } = update;
           
            // 🚨 පරිශීලකයා WhatsApp එකෙන් Log out වුවහොත් එසැණින්ම දත්ත මකා දැමීම
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode === 401) {
                    console.log(`🚨 Session ${sanitizedNumber} was logged out from WhatsApp. Wiping all data...`);
                    await deleteSession(sanitizedNumber); // අදාළ userගේ දත්ත පමණක් මකයි
                    return; // වෙනත් කිසිදු ක්‍රියාවක් (Restart/Reconnect) සිදුවීම නවත්වයි
                }
            }

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
        console.log('Pairing/reconnect error:', error);
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
