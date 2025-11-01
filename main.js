import { startWhatsAppBot } from './whatsapp.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import config from './config.js';

// --- Inisialisasi Gemini ---
if (!config.geminiApiKey) {
    console.error('GEMINI_API_KEY tidak ditemukan di file .env');
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// --- Membaca Konstitusi Bot ---
let constitution = '';
try {
    constitution = fs.readFileSync('constitution.md', 'utf8');
} catch (error) {
    console.error('Gagal membaca constitution.md:', error);
    process.exit(1);
}

// --- Handler untuk Pesan Baru ---
async function handleNewMessage(sock, msg) {
    const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const remoteJid = msg.key.remoteJid;

    if (!messageContent) {
        return; // Abaikan jika pesan kosong
    }

    console.log(`Pesan diterima dari ${remoteJid}: "${messageContent}"`);

    try {
        // Menambahkan 'typing' status
        await sock.sendPresenceUpdate('composing', remoteJid);

        const prompt = `${constitution}\n\n---\n\nUser: ${messageContent}\nBot:`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Mengirim balasan
        await sock.sendMessage(remoteJid, { text: text });
        console.log(`Balasan dikirim ke ${remoteJid}: "${text}"`);

    } catch (error) {
        console.error('Error saat memproses pesan atau menghubungi Gemini:', error);
        // Kirim pesan error ke pengguna jika terjadi masalah
        await sock.sendMessage(remoteJid, { text: 'Maaf, terjadi kesalahan saat memproses permintaan Anda.' });
    } finally {
        // Menghapus 'typing' status
        await sock.sendPresenceUpdate('paused', remoteJid);
    }
}


// --- Mulai Bot ---
console.log('Bot sedang dijalankan...');
startWhatsAppBot(handleNewMessage);
