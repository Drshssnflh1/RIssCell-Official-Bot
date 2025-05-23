const canvas = require("canvas");
const { Sticker } = require("wa-sticker-formatter");

async function convertStickerToImage(lenwy, msg, sender) {
    const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg || !quotedMsg.stickerMessage) {
        await lenwy.sendMessage(sender, { text: "⚠️ Balas stiker dengan perintah !toimg" });
        return null;
    }

    try {
        const sticker = await lenwy.downloadAndSaveMediaMessage(quotedMsg.stickerMessage, "temp/sticker");
        const stickerBuffer = fs.readFileSync(sticker);

        // Konversi stiker ke gambar menggunakan canvas
        const img = new canvas.Image();
        img.src = stickerBuffer;
        const canvasImage = canvas.createCanvas(img.width, img.height);
        const ctx = canvasImage.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageBuffer = canvasImage.toBuffer("image/png");

        // Hapus file sementara
        fs.unlinkSync(sticker);

        return imageBuffer;
    } catch (error) {
        console.error("Kesalahan mengonversi stiker ke gambar:", error);
        await lenwy.sendMessage(sender, { text: "❌ Gagal mengonversi stiker ke gambar!" });
        return null;
    }
}

module.exports = { convertStickerToImage };