const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const readline = require("readline");
const fs = require("fs");
const { startEarthquakeCheck } = require("./functions/gempa");

let autoread = true;
const configFile = "./autoread.json";

if (fs.existsSync(configFile)) {
    const raw = fs.readFileSync(configFile);
    const saved = JSON.parse(raw);
    autoread = saved.autoread;
}

const usePairingCode = true;

async function question(prompt) {
    process.stdout.write(prompt);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => rl.question("", (ans) => {
        rl.close();
        resolve(ans);
    }));
}

async function connectToWhatsApp() {
    console.log(chalk.blue("🎁 Memulai Koneksi Ke WhatsApp"));

    const { state, saveCreds } = await useMultiFileAuthState("./LenwySesi");

    const lenwy = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: !usePairingCode,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        version: [2, 3000, 1015901307],
        keepAliveIntervalMs: 30000, // Kirim keep-alive setiap 30 detik
    });

    startEarthquakeCheck(lenwy);

    if (usePairingCode && !lenwy.authState.creds.registered) {
        console.log(chalk.green("☘ Masukkan Nomor Dengan Awal 62"));
        const phoneNumber = await question("> ");
        const code = await lenwy.requestPairingCode(phoneNumber.trim());
        console.log(chalk.cyan(`🎁 Pairing Code: ${code}`));
    }

    lenwy.ev.on("creds.update", saveCreds);

    lenwy.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(chalk.red(`❌ Koneksi Terputus: ${reason || "Alasan tidak diketahui"}`));
            console.log(chalk.yellow("Mencoba menyambung ulang dalam 5 detik..."));
            await new Promise(resolve => setTimeout(resolve, 5000)); // Tunggu 5 detik sebelum reconnect
            try {
                await connectToWhatsApp();
            } catch (error) {
                console.error(chalk.red("Gagal menyambung ulang:", error.message));
                console.log(chalk.yellow("Mencoba lagi dalam 10 detik..."));
                await new Promise(resolve => setTimeout(resolve, 10000));
                connectToWhatsApp();
            }
        } else if (connection === "open") {
            console.log(chalk.green("✔ Bot Berhasil Terhubung Ke WhatsApp"));
        }
    });

    // Tangani error tak terduga pada client
    lenwy.ev.on("error", (error) => {
        console.error(chalk.red("Terjadi error pada client Baileys:", error.message));
    });

    lenwy.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message) {
            return;
        }

        const sender = msg.key.remoteJid;
        const pushname = msg.pushName || "RissCell Official Bot";
        const messageType = Object.keys(msg.message)[0];
        const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.listResponseMessage?.singleSelectReply?.selectedRowId || "";

        console.log(
            chalk.yellow.bold("Credit: RissCell Official"),
            chalk.green.bold("[ WhatsApp ]"),
            chalk.cyan(pushname),
            chalk.cyan(":"),
            chalk.white(messageContent),
            chalk.gray(`[Type: ${messageType}]`)
        );

        if (autoread && msg.key.remoteJid) {
            await lenwy.readMessages([msg.key]);
        }

        try {
            await require("./lenwy")(lenwy, m, {
                autoread,
                saveAutoread: (val) => {
                    autoread = val;
                    fs.writeFileSync(configFile, JSON.stringify({ autoread }, null, 2));
                }
            });
        } catch (error) {
            console.error("Error memproses pesan di lenwy.js:", error);
            await lenwy.sendMessage(sender, { text: "❌ Terjadi kesalahan saat memproses perintah. Coba lagi nanti." });
        }
    });
}

// Tangani error tak terduga pada proses Node.js
process.on("uncaughtException", (error) => {
    console.error(chalk.red("Uncaught Exception:", error.message));
});

process.on("unhandledRejection", (reason, promise) => {
    console.error(chalk.red("Unhandled Rejection at:", promise, "reason:", reason));
});

connectToWhatsApp();