const { Felo } = require("./Felo"); // Import Felo.js (pastikan path benar)

// Temporary memory store for user conversation history
const conversationMemory = new Map(); // Maps sender ID to array of { query, response }
const MAX_MEMORY = 5; // Limit to 5 previous interactions per user

const getAIResponse = async (text, sock, sender) => {
    try {
        // Efek "mengetik..."
        await sock.sendPresenceUpdate('composing', sender);

        // Initialize memory for this sender if it doesn't exist
        if (!conversationMemory.has(sender)) {
            conversationMemory.set(sender, []);
        }

        // Get the user's conversation history
        const userHistory = conversationMemory.get(sender);

        // Prepare context from previous interactions
        let context = '';
        if (userHistory.length > 0) {
            context = userHistory
                .map(entry => `Pertanyaan: ${entry.query}\nJawaban: ${entry.response}`)
                .join('\n\n');
            context = `Berikut adalah riwayat percakapan sebelumnya:\n${context}\n\nPertanyaan baru: ${text}`;
        } else {
            context = text;
        }

        // Call Felo API with the query (including context if available)
        const result = await Felo(context);

        // Stop efek "mengetik..."
        await sock.sendPresenceUpdate('paused', sender);

        if (result.error) {
            return "⚠️ Terjadi Kesalahan Mengambil Jawaban.";
        }

        // Store the query and response in memory
        const responseText = `📑 *RissCell Official Bot Powered by Felo🐋*\n\n${result.answer}`;
        userHistory.push({ query: text, response: result.answer });
        
        // Keep only the last MAX_MEMORY entries
        if (userHistory.length > MAX_MEMORY) {
            userHistory.shift(); // Remove oldest entry
        }

        // Update memory
        conversationMemory.set(sender, userHistory);

        return responseText;
    } catch (error) {
        console.error("Error saat memanggil Felo AI:", error.message);
        return "❌ Terjadi Kesalahan Saat Memproses Permintaan!";
    }
};

// Optional: Clear memory for a specific sender (e.g., on command or session end)
const clearMemory = (sender) => {
    conversationMemory.delete(sender);
    return "🧹 Memori percakapan telah dihapus.";
};

module.exports = { getAIResponse, clearMemory };