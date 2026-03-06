const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

let qrCodeData = "";
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // RAM bachane ke liye sabse zaroori
            '--disable-gpu'
        ] 
    }
});

client.on('qr', (qr) => {
    qrCodeData = qr;
    isReady = false;
    console.log("QR Code Ready! Scan now.");
});

client.on('ready', () => {
    isReady = true;
    qrCodeData = "";
    console.log('✅ WhatsApp Engine is Ready!');
});

client.on('auth_failure', () => { console.error('Authentication failure, restarting...'); });
client.on('disconnected', () => { isReady = false; console.log('Client disconnected!'); });

client.initialize();

app.get('/', async (req, res) => {
    if (isReady) return res.send("<h1>✅ Connected!</h1>");
    if (qrCodeData) {
        const qrImage = await qrcode.toDataURL(qrCodeData);
        return res.send(`<img src="${qrImage}" style="width:300px;">`);
    }
    res.send("<h1>Starting Engine... Refresh in 10s</h1>");
});

app.post('/send-message', async (req, res) => {
    if (!isReady) return res.status(400).send({error: "Scan QR first"});
    const { number, message } = req.body;
    try {
        await client.sendMessage(number + "@c.us", message);
        res.send({ success: true });
    } catch (e) { res.status(500).send({ error: e.message }); }
});

app.listen(process.env.PORT || 3000);
