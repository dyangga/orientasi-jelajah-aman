// src/services/weatherService.ts
import { DataCuacaLengkap } from "../types/weather";
import { fetchDenganBatasWaktu } from "./http";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

export async function ambilCuaca(
  latitude: number,
  longitude: number,
): Promise<DataCuacaLengkap> {
  const url =
    `${BASE_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`;

  const response = await fetchDenganBatasWaktu(url);
  if (!response.ok) {
    throw new Error(`Gagal memuat cuaca (status ${response.status})`);
  }

  const data = await response.json();
  return {
    saatIni: {
      suhu: data.current.temperature_2m,
      kodeCuaca: data.current.weather_code,
      kecepatanAngin: data.current.wind_speed_10m,
      waktu: data.current.time,
    },
    harian: {
      tanggal: data.daily.time,
      suhuMaksimal: data.daily.temperature_2m_max,
      suhuMinimal: data.daily.temperature_2m_min,
      kodeCuaca: data.daily.weather_code,
    },
  };
}
