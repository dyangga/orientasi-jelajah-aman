// src/services/airQualityService.ts
import { DataKualitasUdara } from "../types/weather";
import { fetchDenganBatasWaktu } from "./http";

const BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export async function ambilKualitasUdara(
  latitude: number,
  longitude: number,
): Promise<DataKualitasUdara> {
  const url = `${BASE_URL}?latitude=${latitude}&longitude=${longitude}&current=european_aqi,pm2_5,pm10`;

  const response = await fetchDenganBatasWaktu(url);
  if (!response.ok) {
    throw new Error(`Gagal memuat kualitas udara (status ${response.status})`);
  }

  return petaUdara(await response.json());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function petaUdara(data: any): DataKualitasUdara {
  return {
    indeksAQI: data.current.european_aqi,
    pm25: data.current.pm2_5,
    pm10: data.current.pm10,
  };
}

export async function ambilKualitasUdaraBanyak(
  titik: { latitude: number; longitude: number }[],
): Promise<DataKualitasUdara[]> {
  const url =
    `${BASE_URL}?latitude=${titik.map((t) => t.latitude).join(",")}` +
    `&longitude=${titik.map((t) => t.longitude).join(",")}` +
    `&current=european_aqi,pm2_5,pm10`;

  const response = await fetchDenganBatasWaktu(url, 20000);
  if (!response.ok) {
    throw new Error(`Gagal memuat kualitas udara (status ${response.status})`);
  }
  const data = await response.json();
  const daftar = Array.isArray(data) ? data : [data];
  return daftar.map(petaUdara);
}
