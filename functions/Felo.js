/*  

  Made By Lenwy
  Base : Lenwy
  WhatsApp : wa.me/6283829814737
  Telegram : t.me/ilenwy
  Youtube : @Lenwy

  Channel : https://whatsapp.com/channel/0029VaGdzBSGZNCmoTgN2K0u

  Copy Code?, Recode?, Rename?, Reupload?, Reseller? Taruh Credit Ya :D

  Mohon Untuk Tidak Menghapus Watermark Di Dalam Kode Ini

*/

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const Felo = async (query) => {
  const headers = {
    "Accept": "*/*",
    "User-Agent": "Postify/1.0.0",
    "Content-Encoding": "gzip, deflate, br, zstd",
    "Content-Type": "application/json",
  };

  const payload = {
    query,
    search_uuid: uuidv4().replace(/-/g, ''),
    search_options: { langcode: "id-MM" },
    search_video: true,
  };

  const parseResult = (responseText) => {
    const result = { answer: '', source: [] };
    responseText.split('\n').forEach(line => {
      if (line.startsWith('data:')) {
        try {
          const data = JSON.parse(line.slice(5).trim());
          if (data.data) {
            if (data.data.text) {
              result.answer = data.data.text.replace(/\[\d+\]/g, '');
            }
            if (data.data.sources) {
              result.source = data.data.sources;
            }
          }
        } catch (e) {
          console.error("Error parsing line:", e);
        }
      }
    });
    return result;
  };

  try {
    const response = await axios.post("https://api.felo.ai/search/threads", payload, {
      headers,
      timeout: 30000,
      responseType: 'text',
    });

    return parseResult(response.data);
  } catch (error) {
    console.error("Error fetching data:", error.message);
    return { error: "Failed to fetch data from Felo API" };
  }
};

module.exports = { Felo };