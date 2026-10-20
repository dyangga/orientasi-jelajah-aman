// src/services/riwayatPencarianStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HasilGeocoding } from "../types/geocoding";
import { RiwayatPencarian } from "../types/riwayat";

const KUNCI_PENYIMPANAN = "@jelajah_aman:riwayat_pencarian";
export const MAKS_RIWAYAT = 10;

export async function ambilRiwayat(): Promise<RiwayatPencarian[]> {
  try {
    const json = await AsyncStorage.getItem(KUNCI_PENYIMPANAN);
    const data: unknown = json ? JSON.parse(json) : [];
    return Array.isArray(data) ? (data as RiwayatPencarian[]) : [];
  } catch {
    return []; // data rusak -> anggap kosong, jangan menjatuhkan aplikasi
  }
}

// Kota terbaru di urutan teratas; kota yang sama tidak dobel; maksimal 10 entri
export async function tambahRiwayat(kota: HasilGeocoding): Promise<void> {
  const daftar = await ambilRiwayat();
  const tanpaDuplikat = daftar.filter((r) => r.id !== kota.id);
  const daftarBaru: RiwayatPencarian[] = [
    { ...kota, waktu: Date.now() },
    ...tanpaDuplikat,
  ].slice(0, MAKS_RIWAYAT);
  await AsyncStorage.setItem(KUNCI_PENYIMPANAN, JSON.stringify(daftarBaru));
}

export async function kosongkanRiwayat(): Promise<void> {
  await AsyncStorage.removeItem(KUNCI_PENYIMPANAN);
}
