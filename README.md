# WhatsApp Userbot dengan Gemini AI

Ini adalah proyek eksperimental untuk membuat sebuah "userbot" WhatsApp yang ditenagai oleh Google Gemini API. Bot ini akan berjalan di server Anda, terhubung ke akun WhatsApp Anda, dan secara otomatis membalas pesan pribadi menggunakan kecerdasan buatan dari Gemini.

**PERINGATAN KERAS:** Proyek ini menggunakan API WhatsApp yang **tidak resmi** (`whatsapp-web.js`). Penggunaan API semacam ini melanggar Ketentuan Layanan WhatsApp dan dapat menyebabkan **nomor Anda diblokir secara permanen**. Gunakan dengan risiko Anda sendiri dan sebaiknya gunakan nomor cadangan untuk eksperimen ini.

## Fitur

-   Terhubung ke WhatsApp menggunakan metode WhatsApp Web.
-   Menampilkan QR code di terminal untuk login.
-   Menyimpan sesi login agar tidak perlu scan berulang kali.
-   Secara otomatis membalas pesan pribadi (mengabaikan grup).
-   Menggunakan Google Gemini API untuk menghasilkan balasan yang cerdas.
-   Mematuhi seperangkat aturan yang didefinisikan dalam file `constitution.md`.

## Prasyarat

-   Sebuah server atau VPS (Virtual Private Server) dengan akses terminal.
-   Node.js (versi 16 atau lebih tinggi) terinstal di VPS Anda.
-   Akun WhatsApp (disarankan menggunakan nomor cadangan).
-   API Key dari Google AI Studio (Gemini).

## Instalasi

1.  **Clone repositori ini ke VPS Anda:**
    ```bash
    git clone https://github.com/VzoelFox/wp.git
    cd wp
    ```

2.  **Instal semua dependensi yang diperlukan:**
    ```bash
    npm install
    ```

## Konfigurasi

1.  **Buat file `.env`:**
    Salin file contoh `.env.example` menjadi file baru bernama `.env`.
    ```bash
    cp .env.example .env
    ```

2.  **Masukkan API Key Gemini Anda:**
    Buka file `.env` dengan editor teks (seperti `nano` atau `vim`) dan masukkan API Key Anda.
    ```
    GEMINI_API_KEY=MASUKKAN_API_KEY_ANDA_DISINI
    ```

3.  **(Opsional) Ubah Konstitusi:**
    Anda bisa mengubah kepribadian dan aturan AI dengan mengedit file `constitution.md`.

## Menjalankan Bot

1.  **Jalankan aplikasi dari terminal VPS Anda:**
    ```bash
    node index.js
    ```

2.  **Pindai QR Code:**
    Saat pertama kali dijalankan, sebuah QR code akan muncul di terminal Anda. Buka aplikasi WhatsApp di ponsel Anda, pergi ke **Pengaturan > Perangkat Tertaut > Tautkan Perangkat**, lalu pindai QR code tersebut.

3.  **Bot Siap Digunakan:**
    Setelah berhasil, Anda akan melihat pesan "Client sudah siap dan terhubung ke WhatsApp!" di terminal. Bot sekarang akan berjalan di latar belakang dan otomatis membalas pesan yang masuk.

Untuk menjaga bot tetap berjalan 24/7, disarankan menggunakan manajer proses seperti `pm2`.

```bash
# Instal pm2 secara global
npm install -g pm2

# Jalankan bot dengan pm2
pm2 start index.js --name "whatsapp-bot"

# Untuk melihat log
pm2 logs whatsapp-bot
```
