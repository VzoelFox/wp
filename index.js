// Load environment variables from .env file
require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs').promises;
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Validasi API Key
if (!process.env.GEMINI_API_KEY) {
    console.error('Kesalahan: GEMINI_API_KEY tidak ditemukan. Harap buat file .env dan tambahkan API key Anda.');
    process.exit(1);
}

// Inisialisasi Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Inisialisasi WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

console.log('Memulai client...');

client.on('qr', (qr) => {
    console.log('QR Code diterima, silakan pindai:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client sudah siap dan terhubung ke WhatsApp!');
});

client.on('message', async (message) => {
    // Abaikan pesan dari grup
    if (message.from.endsWith('@g.us')) {
        return;
    }

    console.log(`Pesan diterima dari ${message.from}: ${message.body}`);

    try {
        // Tampilkan status "mengetik..."
        const chat = await message.getChat();
        chat.sendStateTyping();

        // 1. Baca file konstitusi
        const constitution = await fs.readFile('constitution.md', 'utf-8');

        // 2. Buat prompt untuk Gemini
        const prompt = `${constitution}\n\nPengguna bertanya: "${message.body}"\n\nJawaban Anda:`;

        // 3. Panggil Gemini API
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const geminiResponse = response.text();

        // 4. Kirim balasan
        await message.reply(geminiResponse);
        console.log(`Balasan dikirim ke ${message.from}`);

        // Hentikan status "mengetik..."
        chat.clearState();

    } catch (error) {
        console.error('Gagal memproses pesan:', error);
        await message.reply('Maaf, terjadi kesalahan saat memproses permintaan Anda.');

        // Hentikan status "mengetik..." jika terjadi error
        const chat = await message.getChat();
        chat.clearState();
    }
});

// Mulai koneksi
client.initialize();
