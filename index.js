const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const readline = require("readline");
const fs = require("fs");
const chokidar = require("chokidar"); // Added for file watching
const { startEarthquakeCheck } = require("./functions/gempa");

// Autoread configuration
let autoread = true;
const configFile = "./autoread.json";

if (fs.existsSync(configFile)) {
    const raw = fs.readFileSync(configFile);
    const saved = JSON.parse(raw);
    autoread = saved.autoread;
}

const usePairingCode = true;

// Global variable to store the WhatsApp socket
let lenwy;
let isRestarting = false;
let restartTimeout;

// Function to ask for user input
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

// Function to gracefully disconnect WhatsApp
async function disconnectWhatsApp() {
    if (lenwy) {
        try {
            await lenwy.logout();
            console.log(chalk.yellow("Disconnected from WhatsApp"));
        } catch (error) {
            console.error(chalk.red("Error during disconnection:", error.message));
        }
    }
}

// Function to connect to WhatsApp
async function connectToWhatsApp() {
    if (isRestarting) {
        console.log(chalk.yellow("Restart in progress, skipping new connection attempt"));
        return;
    }

    console.log(chalk.blue("🎁 Memulai Koneksi Ke WhatsApp"));

    const { state, saveCreds } = await useMultiFileAuthState("./LenwySesi");

    lenwy = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: !usePairingCode,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        version: [2, 3000, 1015901307],
        keepAliveIntervalMs: 30000, // Send keep-alive every 30 seconds
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
            if (!isRestarting) {
                console.log(chalk.yellow("Mencoba menyambung ulang dalam 5 detik..."));
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before reconnect
                try {
                    await connectToWhatsApp();
                } catch (error) {
                    console.error(chalk.red("Gagal menyambung ulang:", error.message));
                    console.log(chalk.yellow("Mencoba lagi dalam 10 detik..."));
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    connectToWhatsApp();
                }
            }
        } else if (connection === "open") {
            console.clear(); // Clear console after successful connection
            console.log(chalk.green("✔ Bot Berhasil Terhubung Ke WhatsApp"));
        }
    });

    // Handle unexpected client errors
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

// File watcher setup using chokidar
function setupFileWatcher() {
    const watcher = chokidar.watch(["*.js", "functions/*.js"], {
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
            stabilityThreshold: 2000, // Wait 2 seconds to ensure file write is complete
            pollInterval: 100
        }
    });

    watcher
        .on("change", (path) => {
            console.log(chalk.yellow(`File ${path} has been changed`));
            debounceRestart();
        })
        .on("error", (error) => {
            console.error(chalk.red(`Watcher error: ${error.message}`));
        });

    console.log(chalk.blue("File watcher initialized for .js files"));
}

// Debounce restart to prevent multiple rapid restarts
function debounceRestart() {
    if (isRestarting) {
        console.log(chalk.yellow("Restart already in progress, skipping"));
        return;
    }

    if (restartTimeout) {
        clearTimeout(restartTimeout);
    }

    restartTimeout = setTimeout(async () => {
        console.log(chalk.yellow("Initiating graceful restart due to file changes..."));
        isRestarting = true;

        try {
            // Clear module cache for updated files
            Object.keys(require.cache).forEach((key) => {
                if (!key.includes("node_modules")) {
                    delete require.cache[key];
                }
            });

            // Disconnect existing WhatsApp connection
            await disconnectWhatsApp();

            // Reconnect to WhatsApp
            await connectToWhatsApp();
        } catch (error) {
            console.error(chalk.red("Error during restart:", error.message));
        } finally {
            isRestarting = false;
            console.log(chalk.green("Restart completed"));
        }
    }, 3000); // Wait 3 seconds to debounce rapid changes
}

// Handle unexpected errors in Node.js process
process.on("uncaughtException", (error) => {
    console.error(chalk.red("Uncaught Exception:", error.message));
});

process.on("unhandledRejection", (reason, promise) => {
    console.error(chalk.red("Unhandled Rejection at:", promise, "reason:", reason));
});

// Initialize file watcher and connect to WhatsApp
setupFileWatcher();
connectToWhatsApp();