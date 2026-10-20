// src/services/cacheRepository.web.ts
//
// Versi WEB dari cacheRepository.ts. Metro otomatis memilih berkas ini di browser
// (ekstensi .web.ts), sedangkan Android/iOS (Expo Go) tetap memakai SQLite.
// expo-sqlite di web membutuhkan konfigurasi WASM tambahan, jadi di browser cache
// disimpan di AsyncStorage (localStorage) dengan fungsi dan perilaku yang sama.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DataCuacaLengkap, DataKualitasUdara } from "../types/weather";
import {
  DataTersimpan,
  KotaUntukCache,
  RingkasanKotaTersimpan,
} from "../types/cache";

const KUNCI_PENYIMPANAN = "@jelajah_aman:cache_cuaca_web";

interface BarisCacheWeb {
  kunci: string;
  kota_id: number;
  nama_kota: string;
  latitude: number;
  longitude: number;
  cuaca: DataCuacaLengkap;
  kualitasUdara: DataKualitasUdara;
  disimpan_pada: number;
}

export function buatKunci(latitude: number, longitude: number): string {
  return latitude.toFixed(2) + "," + longitude.toFixed(2);
}

async function bacaSemua(): Promise<Record<string, BarisCacheWeb>> {
  try {
    const json = await AsyncStorage.getItem(KUNCI_PENYIMPANAN);
    const data: unknown = json ? JSON.parse(json) : {};
    return data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, BarisCacheWeb>)
      : {};
  } catch {
    return {};
  }
}

async function tulisSemua(data: Record<string, BarisCacheWeb>): Promise<void> {
  await AsyncStorage.setItem(KUNCI_PENYIMPANAN, JSON.stringify(data));
}

export async function simpanCache(
  kota: KotaUntukCache,
  cuaca: DataCuacaLengkap,
  kualitasUdara: DataKualitasUdara
): Promise<void> {
  const semua = await bacaSemua();
  const kunci = buatKunci(kota.latitude, kota.longitude);
  semua[kunci] = {
    kunci,
    kota_id: kota.id,
    nama_kota: kota.nama,
    latitude: kota.latitude,
    longitude: kota.longitude,
    cuaca,
    kualitasUdara,
    disimpan_pada: Date.now(),
  };
  await tulisSemua(semua);
}

export async function ambilCache(
  latitude: number,
  longitude: number
): Promise<DataTersimpan | null> {
  const semua = await bacaSemua();
  const baris = semua[buatKunci(latitude, longitude)];
  if (!baris) return null;
  return {
    cuaca: baris.cuaca,
    kualitasUdara: baris.kualitasUdara,
    disimpanPada: baris.disimpan_pada,
  };
}

export async function daftarKotaTersimpan(): Promise<RingkasanKotaTersimpan[]> {
  const semua = await bacaSemua();
  return Object.values(semua)
    .sort((a, b) => b.disimpan_pada - a.disimpan_pada)
    .slice(0, 5)
    .map((b) => ({
      kunci: b.kunci,
      id: b.kota_id,
      nama: b.nama_kota,
      latitude: b.latitude,
      longitude: b.longitude,
      disimpanPada: b.disimpan_pada,
    }));
}

export async function bersihkanCacheLama(batasUmurMs: number): Promise<void> {
  const semua = await bacaSemua();
  const batas = Date.now() - batasUmurMs;
  for (const kunci of Object.keys(semua)) {
    if (semua[kunci].disimpan_pada < batas) delete semua[kunci];
  }
  await tulisSemua(semua);
}

export async function hapusSemuaCache(): Promise<void> {
  await AsyncStorage.removeItem(KUNCI_PENYIMPANAN);
}

export async function hapusCacheKota(kunci: string): Promise<void> {
  const semua = await bacaSemua();
  delete semua[kunci];
  await tulisSemua(semua);
}
