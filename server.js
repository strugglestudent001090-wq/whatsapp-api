const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] 
    }
});

let qrCodeData = "";
let isReady = false;

client.on('qr', (qr) => { qrCodeData = qr; isReady = false; });
client.on('ready', () => { isReady = true; console.log('✅ READY!'); });
client.initialize();

app.get('/', async (req, res) => {
    if (isReady) return res.send("Connected!");
    if (qrCodeData) {
        const qrImage = await qrcode.toDataURL(qrCodeData);
        return res.send(`<img src="${qrImage}">`);
    }
    res.send("Starting...");
});

app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    try {
        await client.sendMessage(number + "@c.us", message);
        res.send({ success: true });
    } catch (e) { res.status(500).send({ error: e.message }); }
});

app.listen(process.env.PORT || 3000);
