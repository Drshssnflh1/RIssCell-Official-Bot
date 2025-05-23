const fs = require("fs");
const os = require("os");
const process = require("process");
const { handleGempaCommand } = require("./functions/gempa");
const { getJadwalHari } = require("./functions/jadwalKuliah");
const { getAIResponse } = require("./functions/ai");
const { getWeather } = require("./functions/weather");
const { createSticker } = require("./functions/sticker");
const { createTextSticker } = require("./functions/textsticker");
const { convertStickerToImage } = require("./functions/toimg");
const { resendOnceView } = require("./functions/ovd");

// Simpan ID pesan yang sudah diproses dengan batas waktu
const processedMessages = new Map();
const MESSAGE_TTL = 60 * 60 * 1000; // 1 jam TTL untuk pesan

// Bersihkan pesan lama setiap 10 menit
setInterval(() => {
    const now = Date.now();
    for (const [messageId, timestamp] of processedMessages) {
        if (now - timestamp > MESSAGE_TTL) {
            processedMessages.delete(messageId);
        }
    }
    console.log(`Memory usage: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB, Processed messages: ${processedMessages.size}`);
}, 10 * 60 * 1000); // Setiap 10 menit

module.exports = async (lenwy, m, { autoread, saveAutoread }) => {
    const msg = m.messages?.[0];
    if (!msg || !msg.message) {
        return;
    }

    // Cek apakah pesan sudah diproses
    const messageId = msg.key.id;
    if (processedMessages.has(messageId)) {
        return;
    }
    processedMessages.set(messageId, Date.now());

    const sender = msg.key.remoteJid;
    const pushname = msg.pushName || "Lenwy";

    // Ekstrak body hanya dari pesan teks
    let body = "";
    if (msg.message.conversation) {
        body = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
        body = msg.message.extendedTextMessage.text;
    }

    // Hanya proses pesan yang diawali "!", termasuk dari bot sendiri
    if (!body || !body.trim().startsWith("!")) {
        return;
    }

    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift()?.toLowerCase() || "";

    switch (command) {
        case "halo":
            await lenwy.sendMessage(sender, { text: "Halo Juga!" });
            break;

        case "ping":
            const uptime = process.uptime();
            const formatUptime = (secs) => {
                const h = Math.floor(secs / 3600);
                const m = Math.floor((secs % 3600) / 60);
                const s = Math.floor(secs % 60);
                return `${h}j ${m}m ${s}d`;
            };

            const memoryUsage = process.memoryUsage();
            const ramUsed = (memoryUsage.rss / 1024 / 1024).toFixed(2);

            const info = `*📡 STATUS BOT*\n\n` +
                         `⏱ Uptime       : ${formatUptime(uptime)}\n` +
                         `💾 RAM Digunakan: ${ramUsed} MB\n` +
                         `🖥 Platform     : ${os.platform()} ${os.arch()}\n` +
                         `🧠 NodeJS       : ${process.version}\n` +
                         `📅 Waktu        : ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n\n` +
                         `_Made With ♥️ by RissCell Official_`;

            await lenwy.sendMessage(sender, { text: info });
            break;

        case "ai":
            if (args.length === 0) {
                await lenwy.sendMessage(sender, { text: "☘ Mau Tanya Apa Ke DeepSeek? Contoh: !ai Apa itu AI?" });
                return;
            }

            try {
                const prompt = args.join(" ");
                const response = await getAIResponse(prompt, lenwy, sender);
                await lenwy.sendMessage(sender, { text: response });
            } catch (error) {
                console.error("Kesalahan DeepSeek AI:", error);
                await lenwy.sendMessage(sender, { text: "❌ Terjadi kesalahan saat menjawab." });
            }
            break;

        case "gempa":
            await handleGempaCommand(lenwy, sender, msg);
            break;

        case "jadwal":
            if (args.length === 0) {
                await lenwy.sendMessage(sender, {
                    text: "Pilih hari untuk melihat jadwal kuliah kamu:",
                    footer: "Lenwy Bot - RissCell",
                    title: "Jadwal Kuliah",
                    buttonText: "Klik Menu di sini!",
                    sections: [
                        {
                            title: "Hari Kuliah",
                            rows: [
                                { title: "Senin", rowId: "!jadwal senin" },
                                { title: "Selasa", rowId: "!jadwal selasa" },
                                { title: "Rabu", rowId: "!jadwal rabu" },
                                { title: "Kamis", rowId: "!jadwal kamis" },
                                { title: "Jumat", rowId: "!jadwal jumat" },
                                { title: "Sabtu", rowId: "!jadwal sabtu" }
                            ]
                        }
                    ]
                });
                return;
            }

            const hari = args[0].toLowerCase();
            const jadwalText = getJadwalHari(hari);

            if (!jadwalText) {
                await lenwy.sendMessage(sender, {
                    text: `Tidak ada jadwal kuliah di hari ${hari.charAt(0).toUpperCase() + hari.slice(1)}.`
                });
                return;
            }

            await lenwy.sendMessage(sender, { text: jadwalText });
            break;

        case "autoread":
            if (args[0] === "on") {
                saveAutoread(true);
                await lenwy.sendMessage(sender, { text: "✅ Autoread diaktifkan." });
            } else if (args[0] === "off") {
                saveAutoread(false);
                await lenwy.sendMessage(sender, { text: "❌ Autoread dimatikan." });
            } else {
                await lenwy.sendMessage(sender, { text: "Gunakan format: !autoread on/off" });
            }
            break;

        case "info":
            const infoText = `*📜 Daftar Perintah Bot:*\n\n` +
                             `> !halo - Balas 'Halo Juga!'\n` +
                             `> !ping - Info status bot (uptime, RAM, OS)\n` +
                             `> !ai <teks> - Tanya AI (DeepSeek Indonesia)\n` +
                             `> !gempa - Info gempa terkini dari BMKG\n` +
                             `> !jadwal - Lihat jadwal kuliah kamu\n` +
                             `> !cuaca <kota> - Cek cuaca terkini di kota tertentu\n` +
                             `> !sticker "Nama Package" - Buat stiker dari gambar/video dengan nama paket\n` +
                             `> !textsticker <teks> - Buat stiker dari teks\n` +
                             `> !toimg - Ubah stiker yang direply menjadi gambar\n` +
                             `> !ovd - Kirim ulang pesan sekali lihat yang direply\n` +
                             `> !autoread on/off - Aktif/nonaktif auto baca pesan\n\n` +
                             `Contoh !sticker: Reply gambar/video dengan !sticker "RissCell Official" atau kirim media dengan caption !sticker "RissCell Official"\n` +
                             `_Made With ♥️ by RissCell Official_`;
            await lenwy.sendMessage(sender, { text: infoText });
            break;

        case "cuaca":
            if (args.length === 0) {
                await lenwy.sendMessage(sender, { text: "☁️ Masukkan nama kota, contoh: !cuaca Jakarta" });
                return;
            }

            try {
                const city = args.join(" ");
                const weatherResult = await getWeather(city, lenwy, sender);
                if (weatherResult) {
                    await lenwy.sendMessage(sender, { text: weatherResult });
                }
            } catch (error) {
                console.error("Kesalahan pada !cuaca:", error);
                await lenwy.sendMessage(sender, { text: "❌ Gagal mendapatkan info cuaca!" });
            }
            break;

        case "sticker":
            try {
                const packNameMatch = body.match(/"([^"]+)"/);
                const packName = packNameMatch ? packNameMatch[1] : "RissCell Sticker";
                const response = await createSticker(lenwy, msg, sender, packName);
                await lenwy.sendMessage(sender, response);
            } catch (error) {
                console.error("Kesalahan membuat stiker:", error);
                await lenwy.sendMessage(sender, { text: "❌ Gagal membuat stiker!" });
            }
            break;

        case "textsticker":
            if (args.length === 0) {
                await lenwy.sendMessage(sender, { text: "⚠️ Masukkan teks, contoh: !textsticker Halo ini stiker" });
                return;
            }

            try {
                const text = args.join(" ");
                const stickerBuffer = await createTextSticker(text);
                await lenwy.sendMessage(sender, { sticker: stickerBuffer });
            } catch (error) {
                console.error("Kesalahan membuat text sticker:", error);
                await lenwy.sendMessage(sender, { text: "❌ Gagal membuat stiker dari teks!" });
            }
            break;

        case "toimg":
            try {
                const imageBuffer = await convertStickerToImage(lenwy, msg, sender);
                if (imageBuffer) {
                    await lenwy.sendMessage(sender, { image: imageBuffer });
                }
            } catch (error) {
                console.error("Kesalahan pada !toimg:", error);
                await lenwy.sendMessage(sender, { text: "❌ Gagal mengonversi stiker ke gambar!" });
            }
            break;

        case "ovd":
            try {
                await resendOnceView(lenwy, msg, sender);
            } catch (error) {
                console.error("Kesalahan pada !ovd:", error);
                await lenwy.sendMessage(sender, { text: "❌ Gagal mengunduh atau mengirim ulang konten sekali lihat!" });
            }
            break;

        default:
            await lenwy.sendMessage(sender, { text: "❌ Perintah tidak dikenal. Ketik !info untuk melihat daftar perintah." });
    }
};