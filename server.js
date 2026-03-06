const express = require('express');
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const pino = require('pino');

const app = express();
app.use(express.json());

let qrCodeData = "";
let isConnected = false;
let sock;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "silent" }) // Faltu logs band karne ke liye
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        
        if (qr) {
            qrCodeData = qr;
            isConnected = false;
            console.log("New QR Generated! Scan fast.");
        }
        
        if (connection === 'close') {
            isConnected = false;
            console.log("Connection closed. Reconnecting...");
            connectToWhatsApp(); // Crash hone par apne aap restart hoga
        } else if (connection === 'open') {
            isConnected = true;
            qrCodeData = "";
            console.log("✅ WhatsApp Engine is Ready!");
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();

app.get('/', async (req, res) => {
    if (isConnected) return res.send("<h1 style='color:green;'>✅ API IS LIVE & CONNECTED!</h1>");
    if (qrCodeData) {
        const qrImage = await qrcode.toDataURL(qrCodeData);
        return res.send(`<h2>Scan this QR Code:</h2><img src="${qrImage}" style="width:300px;">`);
    }
    res.send("<h1>Starting Engine... Refresh in 10s</h1>");
});

app.post('/send-message', async (req, res) => {
    if (!isConnected) return res.status(400).send({error: "Scan QR first"});
    const { number, message } = req.body;
    try {
        const jid = number + "@s.whatsapp.net";
        await sock.sendMessage(jid, { text: message });
        res.send({ success: true, message: "Message Sent Successfully!" });
    } catch (e) { 
        res.status(500).send({ error: e.message }); 
    }
});

app.listen(process.env.PORT || 10000, () => {
    console.log("Server running...");
});
