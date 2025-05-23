const axios = require("axios");

const API_KEY = "8fac1f7b15b8f2ee821c06b1cc9fa7df"; // Ganti dengan API key OpenWeatherMap Anda
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

async function getWeather(city, lenwy, sender) {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                q: city,
                appid: API_KEY,
                units: "metric",
                lang: "id"
            }
        });

        // Periksa apakah respons valid
        if (!response || !response.data) {
            throw new Error("Respons OpenWeather API tidak valid");
        }

        const data = response.data;

        // Periksa kode status dari API
        if (data.cod !== 200) {
            throw new Error(data.message || `Kota "${city}" tidak ditemukan`);
        }

        // Pastikan properti yang diperlukan ada
        if (!data.weather || !data.weather[0] || !data.main || !data.wind) {
            throw new Error("Data cuaca tidak lengkap");
        }

        const weather = data.weather[0].description;
        const temp = data.main.temp;
        const humidity = data.main.humidity;
        const windSpeed = data.wind.speed;

        return `☁️ *Cuaca di ${city}*\n\n` +
               `⛅ Cuaca: ${weather}\n` +
               `🌡️ Suhu: ${temp}°C\n` +
               `💧 Kelembapan: ${humidity}%\n` +
               `💨 Kecepatan Angin: ${windSpeed} m/s\n\n` +
               `_Data dari OpenWeatherMap_`;
    } catch (error) {
        console.error("Error fetching weather:", error.message);
        if (lenwy && sender) {
            await lenwy.sendMessage(sender, { text: `❌ Gagal mengambil cuaca: ${error.message}` });
        }
        return null; // Mengembalikan null untuk menunjukkan kegagalan
    }
}

module.exports = { getWeather };