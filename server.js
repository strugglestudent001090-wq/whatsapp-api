const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const pino = require('pino');
const fs = require('fs');

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
        browser: ["Mac OS", "Chrome", "10.15.7"], // Ekdum asli browser ka naam
        logger: pino({ level: "silent" })
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeData = qr;
            isConnected = false;
            console.log("New QR Generated! Scan fast.");
        }
        
        if (connection === 'close') {
            isConnected = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            
            // 👉 FIX: Agar file corrupt hai, toh delete karke fresh start karo
            if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                console.log("Session kharab hai. Purana data delete kar rahe hain...");
                try { fs.rmSync('auth_info_baileys', { recursive: true, force: true }); } catch(e){}
            }
            
            console.log("Connection closed. Reconnecting in 3 seconds...");
            setTimeout(connectToWhatsApp, 3000);
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
