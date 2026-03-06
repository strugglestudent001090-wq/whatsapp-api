const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

let qrCodeData = "";
let isReady = false;

// WhatsApp Client Setup (Render Server Friendly)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        executablePath: '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    }
});

client.on('qr', (qr) => {
    console.log("QR Code Ready!");
    qrCodeData = qr;
    isReady = false;
});

client.on('ready', () => {
    isReady = true;
    qrCodeData = "";
    console.log('✅ WhatsApp Engine is Ready!');
});

client.initialize();

// Webpage to Scan QR
app.get('/', async (req, res) => {
    if (isReady) {
        res.send("<h1 style='color:green; text-align:center; margin-top:50px;'>✅ API IS LIVE & CONNECTED!</h1><p style='text-align:center;'>Your WhatsApp is now ready to send automated messages.</p>");
    } else if (qrCodeData) {
        const qrImage = await qrcode.toDataURL(qrCodeData);
        res.send(`<div style="text-align:center; margin-top:50px; font-family:sans-serif;"><h1>Scan this QR with WhatsApp</h1><img src="${qrImage}" style="width:300px; height:300px; border:2px solid black; border-radius:10px;"><p>Open WhatsApp > Linked Devices > Link a Device</p></div>`);
    } else {
        res.send("<h1 style='text-align:center; margin-top:50px; font-family:sans-serif;'>⏳ Starting Engine... Refresh this page in 10-20 seconds.</h1>");
    }
});

// Endpoint for PHP site to trigger messages
app.post('/send-message', async (req, res) => {
    if (!isReady) return res.status(400).send({error: "WhatsApp not connected. Scan QR first."});
    
    const { number, message } = req.body;
    const chatId = number + "@c.us"; 
    
    try {
        await client.sendMessage(chatId, message);
        res.send({ success: true, msg: "Message sent successfully!" });
    } catch (e) {
        res.status(500).send({ success: false, error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
