const canvas = require("canvas");
const { Sticker } = require("wa-sticker-formatter");

async function createTextSticker(text) {
    // Buat kanvas 512x512
    const width = 250;
    const height = 250;
    const canvasImage = canvas.createCanvas(width, height);
    const ctx = canvasImage.getContext("2d");

    // Latar belakang putih
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Hitung jumlah kata untuk menentukan ukuran font
    const wordCount = text.split(" ").length;
    let fontSize;
    if (wordCount <= 10) {
        fontSize = 30;
    } else if (wordCount <= 20) {
        fontSize = 24;
    } else if (wordCount <= 30) {
        fontSize = 20;
    } else {
        fontSize = 16;
    }

    // Font dan teks
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = "#000000";
    const margin = 20; // Margin 20px di semua sisi
    const maxWidth = width - 2 * margin; // Lebar maksimum teks dalam kanvas
    const lines = [];
    const words = text.split(" ");

    let line = "";
    for (let word of words) {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line.length > 0) {
            lines.push(line.trim());
            line = word + " ";
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());

    // Hitung tinggi maksimum untuk memastikan tidak terpotong
    const lineHeight = fontSize + 10;
    const maxLines = Math.floor((height - 2 * margin) / lineHeight);
    if (lines.length > maxLines) {
        lines.splice(maxLines); // Batasi jumlah baris jika melebihi
    }

    // Justify teks dalam batas kanvas
    const startY = margin + (height - 2 * margin - lines.length * lineHeight) / 2; // Posisi vertikal tengah
    lines.forEach((line, index) => {
        if (index >= maxLines) return; // Hentikan jika melebihi batas
        const y = startY + (index * lineHeight);
        const wordsInLine = line.split(" ");
        const totalWidth = ctx.measureText(line).width;
        const spaceWidth = wordsInLine.length > 1 ? (maxWidth - totalWidth) / (wordsInLine.length - 1) : 0;
        let x = margin; // Mulai dari margin kiri
        wordsInLine.forEach((word, i) => {
            try {
                ctx.fillText(word, x, y);
                x += ctx.measureText(word + " ").width + spaceWidth;
            } catch (e) {
                console.error(`Gagal merender kata '${word}': ${e.message}`);
                x += ctx.measureText(" ").width + spaceWidth; // Lewati kata bermasalah
            }
        });
    });

    // Konversi ke stiker
    const stickerBuffer = canvasImage.toBuffer("image/png");
    const sticker = new Sticker(stickerBuffer, {
        pack: "RissCell Sticker",
        author: "RCO Bot",
        type: "default",
        quality: 100,
    });
    return await sticker.toBuffer();
}

module.exports = { createTextSticker };