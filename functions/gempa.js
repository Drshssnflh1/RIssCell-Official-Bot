const axios = require('axios');
const chalk = require('chalk');

const BMKG_API = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json";

// Fungsi untuk mendapatkan data gempa terbaru dari BMKG
const getLatestEarthquake = async () => {
    try {
        const response = await axios.get(BMKG_API);
        const data = response.data.Infogempa.gempa;

        if (!data) return { message: "⚠️ Tidak dapat menemukan data gempa terbaru.", imageUrl: null };

        // URL gambar peta gempa dari BMKG
        const imageUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${data.Shakemap}`;

        // Format informasi gempa
        const message = `🌍 *Gempa Terkini*\n\n` +
                        `📍 Lokasi: ${data.Wilayah}\n` +
                        `📅 Waktu: ${data.Tanggal} ${data.Jam}\n` +
                        `📏 Magnitudo: ${data.Magnitude}\n` +
                        `📉 Kedalaman: ${data.Kedalaman}\n` +
                        `🌊 Potensi Tsunami: ${data.Potensi}\n` +
                        `📌 Koordinat: ${data.Lintang}, ${data.Bujur}\n\n` +
                        `🔗 *Sumber BMKG*\n`;

        return { message, imageUrl, data };
    } catch (error) {
        console.error(chalk.red('Error mengambil data gempa BMKG:'), error.message);
        return { message: "⚠️ Gagal mendapatkan informasi gempa.", imageUrl: null };
    }
};

// Fungsi untuk mengirim notifikasi gempa ke WhatsApp
const sendEarthquakeAlert = async (sock, myNumber) => {
    try {
        const { message, imageUrl } = await getLatestEarthquake();

        if (imageUrl) {
            // Kirim gambar dan pesan
            const messageWithImage = {
                image: { url: imageUrl },
                caption: `${message} \n *RissCell Official Bot*`
            };
            await sock.sendMessage(myNumber, messageWithImage);
            console.log(chalk.green('✅ Notifikasi gempa (dengan peta) berhasil dikirim.'));
        } else {
            // Kirim pesan teks jika tidak ada gambar
            await sock.sendMessage(myNumber, { text: message });
            console.log(chalk.green('✅ Notifikasi gempa (tanpa peta) berhasil dikirim.'));
        }
    } catch (error) {
        console.error(chalk.red('❌ Gagal mengirim notifikasi gempa:'), error.message);
    }
};

// Fungsi menangani perintah .gempa
const handleGempaCommand = async (sock, sender, m) => {
    const response = await getLatestEarthquake();

    if (response.imageUrl) {
        const messageWithImage = {
            image: { url: response.imageUrl },
            caption: `${response.message} \n *RissCell Official Bot*`
        };
        await sock.sendMessage(sender, messageWithImage, { quoted: m });
    } else {
        await sock.sendMessage(sender, { text: response.message }, { quoted: m });
    }
};

// Pengecekan otomatis gempa
let lastSentEarthquake = null; 
const startEarthquakeCheck = (sock) => {
    const targetNumbers = ["6288801942154@s.whatsapp.net", "6288213613544@s.whatsapp.net"];

    setInterval(async () => {
        const { message, imageUrl, data } = await getLatestEarthquake();
        if (data) {
            if (!lastSentEarthquake || lastSentEarthquake.Tanggal !== data.Tanggal || lastSentEarthquake.Jam !== data.Jam) {
                for (const number of targetNumbers) {
                    await sendEarthquakeAlert(sock, number);
                }
                lastSentEarthquake = data;
            }
        }
    }, 2 * 60 * 1000); // Cek setiap 15 menit
};

module.exports = { getLatestEarthquake, sendEarthquakeAlert, handleGempaCommand, startEarthquakeCheck };