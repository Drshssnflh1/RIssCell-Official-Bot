const fs = require("fs");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

async function resendOnceView(lenwy, msg, sender) {
    // Ambil pesan yang direply
    const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg) {
        await lenwy.sendMessage(sender, { text: "⚠️ Balas pesan sekali lihat (once view) dengan perintah !ovd" });
        return;
    }

    try {
        // Periksa apakah pesan memiliki imageMessage atau videoMessage
        let mediaMessage;
        let mediaType;

        if (quotedMsg.viewOnceMessage) {
            mediaMessage = quotedMsg.viewOnceMessage.message;
            mediaType = Object.keys(mediaMessage)[0];
        } else {
            // Jika viewOnceMessage sudah hilang (karena pesan sudah dilihat), coba akses langsung
            mediaMessage = quotedMsg;
            mediaType = Object.keys(quotedMsg)[0];
        }

        if (!mediaType || !["imageMessage", "videoMessage"].includes(mediaType)) {
            await lenwy.sendMessage(sender, { text: "❌ Pesan sekali lihat tidak berisi gambar atau video!" });
            return;
        }

        // Unduh konten media menggunakan downloadContentFromMessage
        const messageContent = quotedMsg[mediaType] || quotedMsg.viewOnceMessage?.message[mediaType];
        const stream = await downloadContentFromMessage(messageContent, mediaType.replace("Message", ""));
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Simpan file sementara
        const filePath = `temp/onceview_${Date.now()}.${mediaType === "imageMessage" ? "jpg" : "mp4"}`;
        await fs.promises.writeFile(filePath, buffer);

        // Kirim ulang media
        const mediaBuffer = fs.readFileSync(filePath);
        await lenwy.sendMessage(sender, {
            [mediaType === "imageMessage" ? "image" : "video"]: mediaBuffer,
            caption: "Konten sekali lihat telah dikembalikan!"
        });

        // Hapus file sementara
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error("Kesalahan mengunduh/mengirim once view:", error);
        await lenwy.sendMessage(sender, { text: "❌ Gagal mengunduh atau mengirim ulang konten sekali lihat!" });
    }
}

module.exports = { resendOnceView };