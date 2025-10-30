// Load environment variables from .env file
require('dotenv').config();

const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const readline = require('readline');

// Validasi API Key
if (!process.env.GEMINI_API_KEY) {
    console.error('Kesalahan: GEMINI_API_KEY tidak ditemukan. Harap buat file .env dan tambahkan API key Anda.');
    process.exit(1);
}

// Inisialisasi Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Helper to ask question in console
const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(text, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

async function connectToWhatsApp() {
    console.log('Memulai koneksi ke WhatsApp...');

    // Hapus folder auth sebelumnya untuk sesi yang bersih
    const authFolder = 'auth_info_baileys';
    try {
        await fs.rm(authFolder, { recursive: true, force: true });
        console.log('Folder auth sebelumnya berhasil dihapus.');
    } catch (error) {
        console.error('Gagal menghapus folder auth:', error);
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Menggunakan Baileys v${version.join('.')}, latest: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // We will use pairing code
        browser: Browsers.macOS('Chrome'),
    });

    // Handle pairing code
    if (!sock.authState.creds.registered) {
        const phoneNumber = process.env.WA_PHONE_NUMBER;
        if (!phoneNumber) {
            console.error('Kesalahan: WA_PHONE_NUMBER tidak ditemukan di file .env.');
            console.error('Harap tambahkan nomor WhatsApp Anda (dengan kode negara) ke file .env.');
            process.exit(1);
        }

        console.log(`Meminta kode pairing untuk nomor: ${phoneNumber}`);
        try {
            const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
            console.log(`Kode login Anda: ${code}`);
            console.log('Buka WhatsApp > Perangkat Tertaut > Tautkan dengan nomor telepon > Masukkan kode di atas.');
        } catch (error) {
            console.error('Gagal membuat kode pairing:', error);
            console.error('Pastikan nomor telepon di .env benar dan dalam format internasional (cth: 6281234567890).');
            process.exit(1);
        }
        }

    // Listener untuk koneksi
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus karena:', lastDisconnect.error, ', mencoba menghubungkan kembali:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('Koneksi terputus permanen. Hapus folder "auth_info_baileys" dan mulai lagi.');
            }
        } else if (connection === 'open') {
            console.log('Client sudah siap dan terhubung ke WhatsApp!');
        }
    });

    // Simpan kredensial setiap kali ada pembaruan
    sock.ev.on('creds.update', saveCreds);

    // Listener untuk pesan masuk (akan diadaptasi di langkah berikutnya)
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const sender = msg.key.remoteJid;
        // Abaikan pesan dari grup dan status updates
        if (sender.endsWith('@g.us') || msg.key.remoteJid === 'status@broadcast') {
            return;
        }

        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!messageText) return;

        console.log(`Pesan diterima dari ${sender}: ${messageText}`);

        try {
            // Tampilkan status "mengetik..."
            await sock.sendPresenceUpdate('composing', sender);

            // 1. Baca file konstitusi
            const constitution = await fs.readFile('constitution.md', 'utf-8');

            // 2. Buat prompt untuk Gemini
            const prompt = `${constitution}\n\nPengguna bertanya: "${messageText}"\n\nJawaban Anda:`;

            // 3. Panggil Gemini API
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const geminiResponse = response.text();

            // 4. Kirim balasan
            await sock.sendMessage(sender, { text: geminiResponse });
            console.log(`Balasan dikirim ke ${sender}`);

            // Hentikan status "mengetik..."
            await sock.sendPresenceUpdate('paused', sender);

        } catch (error) {
            console.error('Gagal memproses pesan:', error);
            await sock.sendMessage(sender, { text: 'Maaf, terjadi kesalahan saat memproses permintaan Anda.' });
            await sock.sendPresenceUpdate('paused', sender);
        }
    });
}

// Mulai bot
connectToWhatsApp().catch(err => console.log("Gagal memulai bot: ", err));
