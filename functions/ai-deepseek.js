/*
██╗███████╗██╗░░░██╗███╗░░░███╗██╗
██║╚════██║██║░░░██║████╗░████║██║
██║░░███╔═╝██║░░░██║██╔████╔██║██║
██║██╔══╝░░██║░░░██║██║╚██╔╝██║██║
██║███████╗╚██████╔╝██║░╚═╝░██║██║
╚═╝╚══════╝░╚═════╝░╚═╝░░░░░╚═╝╚═╝
Note: Terimakasih Telah Membeli Script Ini Semoga Bermanfaat
Copyright © 2024 - 2025 Crystalia
꒰⚘꒱ Admin Contact ꒱⟡
𓅯 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞
https://linkbio.co/naruyaizumi
𓅯 𝙑͢𝙡𝙞𝙣𝙚
WhatsApp: wa.me/6285770019354
𓅯 𝑺͢𝑿𝒁𝒏𝒊𝒈𝒉𝒕𝒎𝒂𝒓𝒆
WhatsApp: wa.me/6281398961382
*/

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text) return conn.reply(m.chat, `📌 *Masukkan teks untuk berbicara dengan DeepSeek!*\n\n📍 *Contoh: ${usedPrefix + command} Halo!*`, m);
        let apiUrl = `https://api.siputzx.my.id/api/ai/deepseek-llm-67b-chat?content=${encodeURIComponent(text)}`;
        let response = await fetch(apiUrl);
        if (!response.ok) return conn.reply(m.chat, "⚠️ *Gagal mengambil respons dari DeepSeek! Coba lagi nanti.*", m);
        let json = await response.json();
        if (!json.status || !json.data) return conn.reply(m.chat, "🤖 *DeepSeek tidak dapat merespons saat ini!*", m);
        await conn.sendMessage(m.chat, {
            text: `🔍 *DeepSeek AI:*\n\n${json.data}`,
            contextInfo: {
                externalAdReply: {
                    title: "DeepSeek AI",
                    body: "🤖 Chat dengan DeepSeek",
                    thumbnailUrl: "https://i.supa.codes/IzS7m_",
                    sourceUrl: "https://instagram.com/naruyaizumi_",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });
    } catch (e) {
        console.error(e);
        conn.reply(m.chat, `❌ *Gagal mendapatkan respons dari DeepSeek.*\n⚠️ *Detail:* ${e.message}`, m);
    }
};

handler.help = ["deepseek"];
handler.tags = ["ai"];
handler.command = /^deepseek$/i;
handler.limit = true;
handler.register = true;

export default handler;