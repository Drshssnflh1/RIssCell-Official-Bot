const fs = require("fs");
const os = require("os");
const process = require("process");
const { handleGempaCommand } = require("./functions/gempa");
const { getAIResponse } = require("./functions/ai");
const { getWeather } = require("./functions/weather");
const { createSticker } = require("./functions/sticker");
const { createTextSticker } = require("./functions/textsticker");
const { resendOnceView } = require("./functions/ovd");
const deepseekHandler = require("./functions/ai-deepseek").default;

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

// Nonaktifkan log debug untuk mengurangi pesan "Closing stale open session"
process.env.BAILEYS_LOG_LEVEL = "error";

module.exports = async (lenwy, m, { autoread, saveAutoread }) => {
    // Periksa status koneksi
    if (!lenwy || !lenwy.user) {
        console.error("Koneksi bot terputus atau tidak terinisialisasi. Periksa index.js untuk logika reconnect.");
        return;
    }

    const msg = m.messages?.[0];
    if (!msg || !msg.message) {
        console.log("Pesan tidak valid atau kosong");
        return;
    }

    // Cek apakah pesan sudah diproses
    const messageId = msg.key.id;
    if (processedMessages.has(messageId)) {
        console.log(`Pesan ${messageId} sudah diproses sebelumnya`);
        return;
    }
    processedMessages.set(messageId, Date.now());

    const sender = msg.key.remoteJid;
    const isGroup = sender.endsWith('@g.us');
    console.log(`Pesan dari ${sender} (Grup: ${isGroup})`);

    const pushname = msg.pushName || "RissCell Official";

    // Ekstrak body dari pesan teks atau list/button response
    let body = "";
    if (msg.message.conversation) {
        body = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
        body = msg.message.extendedTextMessage.text;
    } else if (msg.message.listResponseMessage?.singleSelectReply?.selectedRowId) {
        body = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
    } else if (msg.message.buttonsResponseMessage?.selectedButtonId) {
        body = msg.message.buttonsResponseMessage.selectedButtonId;
    }

    // Hanya proses pesan yang diawali "!" atau berasal dari list/button response
    if (!body || (!body.trim().startsWith("!") && !msg.message.listResponseMessage && !msg.message.buttonsResponseMessage)) {
        console.log(`Pesan tidak valid: ${body}`);
        return;
    }

    // Parse command dan args
    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift()?.toLowerCase() || "";
    console.log(`Perintah diterima: ${command}`);

    // Simulasi objek conn untuk handler AI
    const conn = {
        cai: lenwy.cai || {},
        sendMessage: lenwy.sendMessage.bind(lenwy),
        reply: async (chatId, text, quoted) => {
            await lenwy.sendMessage(chatId, { text }, { quoted });
        }
    };

    // Objek m untuk handler AI
    const messageContext = {
        chat: sender,
        ...msg
    };

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
                await lenwy.sendMessage(sender, { text: "☘ Mau Tanya Apa Ke RissAi? Contoh: !ai Apa itu AI?" });
                return;
            }

            try {
                const prompt = args.join(" ");
                await getAIResponse(prompt, lenwy, sender);
            } catch (error) {
                console.error("Kesalahan RissAi:", error);
            }
            break;

        case "deepseek":
            try {
                await deepseekHandler(messageContext, { conn, text: args.join(" "), usedPrefix: "!", command });
            } catch (error) {
                console.error("Kesalahan pada !deepseek:", error);
                await lenwy.sendMessage(sender, { text: "❌ Gagal menjalankan perintah DeepSeek. Coba lagi nanti." });
            }
            break;

        case "gempa":
            await handleGempaCommand(lenwy, sender, msg);
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
            console.log(`Mengirim pesan untuk !info ke ${sender} (Grup: ${isGroup})`);
            try {
                if (!isGroup) {
                    // List message untuk chat pribadi
                    await lenwy.sendMessage(sender, {
                        text: `Daftar perintah bot RissCell Official:\n\n` +
                              `> !ai <teks> - Tanya AI (RissAi), contoh: !ai Apa itu AI?\n` +
                              `> !deepseek <teks> - Tanya DeepSeek AI, contoh: !deepseek Halo!\n` +
                              `> !jadwal - Lihat jadwal kuliah, pilih hari dari list\n` +
                              `> !cuaca <kota> - Cek cuaca, contoh: !cuaca Jakarta\n` +
                              `> !sticker "<nama>" - Buat stiker, contoh: !sticker "RissCell"\n` +
                              `> !textsticker <teks> - Buat stiker teks, contoh: !textsticker Halo\n` +
                              `> !toimg - Ubah stiker jadi gambar\n` +
                              `> !ovd - Kirim ulang pesan sekali lihat\n` +
                              `Pilih perintah di bawah ini untuk yang tidak memerlukan input tambahan:`,
                        footer: "RissCell Official Bot",
                        title: "Daftar Perintah",
                        buttonText: "Pilih Perintah",
                        sections: [
                            {
                                title: "Perintah Tersedia",
                                rows: [
                                    { title: "!halo", rowId: "!halo", description: "Balas 'Halo Juga!'" },
                                    { title: "!ping", rowId: "!ping", description: "Info status bot (uptime, RAM, OS)" },
                                    { title: "!gempa", rowId: "!gempa", description: "Info gempa terkini dari BMKG" },
                                    { title: "!tes", rowId: "!tes", description: "Tes list interaktif" }
                                ]
                            }
                        ]
                    });
                    console.log("List message untuk !info berhasil dikirim (chat pribadi)");
                } else {
                    // Teks untuk grup
                    await lenwy.sendMessage(sender, {
                        text: `Daftar perintah bot RissCell Official:\n\n` +
                              `> !halo - Balas 'Halo Juga!'\n` +
                              `> !ping - Info status bot (uptime, RAM, OS)\n` +
                              `> !gempa - Info gempa terkini dari BMKG\n` +
                              `> !ai <teks> - Tanya AI (RissAi), contoh: !ai Apa itu AI?\n` +
                              `> !deepseek <teks> - Tanya DeepSeek AI, contoh: !deepseek Halo!\n` +
                              `> !jadwal - Lihat jadwal kuliah, pilih hari\n` +
                              `> !cuaca <kota> - Cek cuaca, contoh: !cuaca Jakarta\n` +
                              `> !sticker "<nama>" - Buat stiker, contoh: !sticker "RissCell"\n` +
                              `> !textsticker <teks> - Buat stiker teks, contoh: !textsticker Halo\n` +
                              `> !toimg - Ubah stiker jadi gambar\n` +
                              `> !ovd - Kirim ulang pesan sekali lihat\n` +
                              `_RissCell Official Bot_`
                    });
                    console.log("Teks untuk !info berhasil dikirim (grup)");
                }
            } catch (error) {
                console.error("Gagal mengirim pesan untuk !info:", error.message);
                // Fallback ke teks
                await lenwy.sendMessage(sender, {
                    text: `Daftar perintah bot RissCell Official:\n\n` +
                          `!halo - Balas 'Halo Juga!'\n` +
                          `!ping - Info status bot (uptime, RAM, OS)\n` +
                          `!gempa - Info gempa terkini dari BMKG\n` +
                          `!ai <teks> - Tanya AI (RissAi), contoh: !ai Apa itu AI?\n` +
                          `!deepseek <teks> - Tanya DeepSeek AI, contoh: !deepseek Halo!\n` +
                          `!jadwal - Lihat jadwal kuliah, pilih hari\n` +
                          `!cuaca <kota> - Cek cuaca, contoh: !cuaca Jakarta\n` +
                          `!sticker "<nama>" - Buat stiker, contoh: !sticker "RissCell"\n` +
                          `!textsticker <teks> - Buat stiker teks, contoh: !textsticker Halo\n` +
                          `!toimg - Ubah stiker jadi gambar\n` +
                          `!ovd - Kirim ulang pesan sekali lihat\n` +
                          `!tes - Tes list interaktif\n\n` +
                          `_RissCell Official Bot_`
                });
                console.log("Fallback teks untuk !info dikirim");
            }
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
                const packName = packNameMatch ? packNameMatch[1] : "RissCell Official Sticker";
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
