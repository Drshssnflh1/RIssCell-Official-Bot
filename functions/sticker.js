const { Sticker } = require("wa-sticker-formatter");
const axios = require("axios");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs").promises;
const path = require("path");

const createSticker = async (sock, msg, sender, packName) => {
    try {
        // Efek "mengetik..."
        await sock.sendPresenceUpdate("composing", sender);

        // Cek apakah pesan adalah reply atau memiliki caption
        const isQuoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const isCaption = msg.message?.conversation?.toLowerCase().startsWith("!sticker");
        let targetMessage = msg;

        if (isQuoted) {
            targetMessage = {
                message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
                key: msg.key
            };
        } else if (!isCaption && !msg.message.imageMessage && !msg.message.videoMessage) {
            return {
                text: '⚠️ Reply gambar atau video dengan !sticker "Nama Package" atau kirim media dengan caption !sticker "Nama Package"\nContoh: !sticker "RissCell Official"'
            };
        }

        // Cek jenis media
        const isImage = targetMessage.message.imageMessage;
        const isVideo = targetMessage.message.videoMessage;
        if (!isImage && !isVideo) {
            return {
                text: "⚠️ Media harus berupa gambar (JPG/PNG) atau video (MP4/GIF)!"
            };
        }

        // Unduh media
        const buffer = await downloadMediaMessage(targetMessage, "buffer", {});
        const fileExt = isVideo ? "mp4" : "jpg";
        const tempFile = path.join(__dirname, `../temp/sticker-${Date.now()}.${fileExt}`);
        await fs.mkdir(path.dirname(tempFile), { recursive: true });
        await fs.writeFile(tempFile, buffer);

        // Buat stiker
        const sticker = new Sticker(tempFile, {
            pack: packName,
            author: "RissCell Bot",
            type: "full",
            quality: 50
        });

        // Konversi ke WebP dan kirim
        const stickerBuffer = await sticker.toBuffer();
        await sock.sendMessage(sender, { sticker: stickerBuffer });

        // Bersihkan file sementara
        await fs.unlink(tempFile);

        // Stop efek "mengetik..."
        await sock.sendPresenceUpdate("paused", sender);

        return { text: "✅ Stiker berhasil dibuat!" };
    } catch (error) {
        console.error("Error membuat stiker:", error.message);
        return { text: "❌ Gagal membuat stiker! Pastikan media adalah gambar (JPG/PNG) atau video (MP4/GIF)." };
    }
};

module.exports = { createSticker };