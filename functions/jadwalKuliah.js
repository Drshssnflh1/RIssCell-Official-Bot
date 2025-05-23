const jadwal = require('../data/jadwal');

function getJadwalHari(hari) {
  const data = jadwal[hari];
  if (!data || data.length === 0) return null;

  let teks = `📅 *Jadwal Kuliah Hari ${hari.charAt(0).toUpperCase() + hari.slice(1)}*\n\n`;
  data.forEach((mk, i) => {
    teks += `*${i + 1}. ${mk.mataKuliah}*\n`;
    teks += `Kelas: ${mk.kelas}\n`;
    teks += `Jam: ${mk.jam}\n`;
    teks += `Dosen: ${mk.dosen}\n\n`;
  });
  return teks;
}

module.exports = { getJadwalHari };