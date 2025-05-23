const { createCanvas, loadImage } = require('canvas');
const os = require('os');
const fs = require('fs');
const path = require('path');

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}j ${m}m ${s}d`;
}

async function generateStatusImage() {
    const width = 1280;
    const height = 720;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load background logo
    const bgPath = path.join(__dirname, '../media/logo.jpg'); // ubah sesuai nama logo kamu
    const bg = await loadImage(bgPath);
    ctx.drawImage(bg, 0, 0, width, height);

    // Info system
    const uptime = formatUptime(os.uptime());
    const ramUsed = `${(os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(1)} MB`;
    const platformInfo = `${os.platform()} ${os.arch()}`;
    const nodeVersion = process.version;
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const lines = [
        '📡 BOT STATUS',
        `Uptime       : ${uptime}`,
        `RAM Digunakan: ${ramUsed}`,
        `Platform     : ${platformInfo}`,
        `NodeJS       : ${nodeVersion}`,
        `Waktu        : ${now}`
    ];

    // Style text
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px sans-serif';
    let y = 60;
    lines.forEach(line => {
        ctx.fillText(line, 60, y);
        y += 50;
    });

    const outPath = path.join(__dirname, '../media/status-dynamic.jpg');
    const out = fs.createWriteStream(outPath);
    const stream = canvas.createJPEGStream();
    stream.pipe(out);

    return new Promise(resolve => {
        out.on('finish', () => resolve(outPath));
    });
}

module.exports = { generateStatusImage };