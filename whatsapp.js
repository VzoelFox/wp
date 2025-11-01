import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import readline from 'readline';
import fs from 'fs';
import { Boom } from '@hapi/boom';
import config from './config.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startWhatsAppBot(onMessage) {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    let sock;

    const connect = () => {
        console.log('Memulai koneksi ke WhatsApp...');
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false, // Pairing code does not need QR
            browser: ['Chrome (Linux)', '', ''], // Mimic a real browser
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error instanceof Boom) && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
                console.log('Koneksi terputus karena:', lastDisconnect.error, ', mencoba menghubungkan kembali:', shouldReconnect);
                if (shouldReconnect) {
                    setTimeout(connect, 5000); // Reconnect after 5 seconds
                }
            } else if (connection === 'open') {
                console.log('Koneksi berhasil tersambung!');
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.key.fromMe && m.type === 'notify') {
                // Pass the message and the socket to the handler
                onMessage(sock, msg);
            }
        });

        pairDevice();
    };

    async function pairDevice() {
        if (!sock.authState.creds.registered) {
            let phoneNumber = config.phoneNumber;
            if (!phoneNumber) {
                phoneNumber = await question('Masukkan nomor WhatsApp Anda (format internasional, cth: 6281234567890): ');
            }
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`Kode Pairing Anda: ${code}`);
                console.log('Silakan buka WhatsApp di ponsel Anda > Perangkat Tertaut > Tautkan perangkat > masukkan kode ini.');
            } catch (error) {
                console.error('Gagal membuat kode pairing:', error);
                // Clean up and retry
                fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                connect();
            }
        }
    }

    connect();
}

export { startWhatsAppBot };
