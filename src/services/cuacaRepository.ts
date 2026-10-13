// src/services/cuacaRepository.ts
// Menggabungkan jaringan + cache SQLite. UI cukup memanggil file ini.
import { bacaStatus, getDb, tulisStatus } from "../db/database";
import { HasilGeocoding } from "../types/geocoding";
import { DataCuacaLengkap, DataKualitasUdara } from "../types/weather";
import { ambilKualitasUdara } from "./airQualityService";
import { ambilDenganCache, kunciKoordinat } from "./cacheService";
import { cariKota } from "./geocodingService";
import { ambilCuaca } from "./weatherService";

export interface CuacaLengkapDenganInfo {
  cuaca: DataCuacaLengkap;
  kualitasUdara: DataKualitasUdara;
  /** true bila ada bagian data yang berasal dari cache lama karena tidak ada koneksi */
  offline: boolean;
  /** waktu data tertua yang ditampilkan disimpan (ms epoch) */
  diperbaruiPada: number;
}

export async function ambilCuacaLengkap(
  latitude: number,
  longitude: number,
  paksa = false,
): Promise<CuacaLengkapDenganInfo> {
  const [c, u] = await Promise.all([
    ambilDenganCache(
      kunciKoordinat("cuaca", latitude, longitude),
      () => ambilCuaca(latitude, longitude),
      { paksa },
    ),
    ambilDenganCache(
      kunciKoordinat("aqi", latitude, longitude),
      () => ambilKualitasUdara(latitude, longitude),
      { paksa },
    ),
  ]);

  return {
    cuaca: c.data,
    kualitasUdara: u.data,
    offline: c.offline || u.offline,
    diperbaruiPada: Math.min(c.disimpanPada, u.disimpanPada),
  };
}

// ---------- Pencarian kota ----------

export async function simpanKota(kota: HasilGeocoding): Promise<void> {
  if (kota.id < 0) return; // "Lokasi Saat Ini" tidak disimpan sebagai kota
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO kota
       (id, nama, nama_kecil, admin1, negara, latitude, longitude, terakhir_dipakai)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    kota.id,
    kota.name,
    kota.name.toLowerCase(),
    kota.admin1 ?? null,
    kota.country ?? "",
    kota.latitude,
    kota.longitude,
    Date.now(),
  );
}

interface BarisKota {
  id: number;
  nama: string;
  admin1: string | null;
  negara: string;
  latitude: number;
  longitude: number;
}

async function cariKotaLokal(nama: string): Promise<HasilGeocoding[]> {
  const db = await getDb();
  // Escape karakter khusus LIKE agar input pengguna diperlakukan sebagai teks biasa
  const aman = nama.trim().toLowerCase().replace(/[\\%_]/g, "\\$&");
  const baris = await db.getAllAsync<BarisKota>(
    `SELECT id, nama, admin1, negara, latitude, longitude FROM kota
     WHERE nama_kecil LIKE ? ESCAPE '\\'
     ORDER BY terakhir_dipakai DESC LIMIT 5`,
    `${aman}%`,
  );
  return baris.map((b) => ({
    id: b.id,
    name: b.nama,
    latitude: b.latitude,
    longitude: b.longitude,
    country: b.negara,
    admin1: b.admin1 ?? undefined,
  }));
}

/**
 * Cari lewat internet; bila gagal (offline/timeout) cari di kota yang pernah
 * dicari atau dilihat sebelumnya.
 */
export async function cariKotaDenganFallback(
  nama: string,
): Promise<{ hasil: HasilGeocoding[]; offline: boolean }> {
  try {
    const hasil = await cariKota(nama);
    // simpan di latar belakang, kegagalan simpan tidak mengganggu pencarian
    void Promise.all(hasil.map(simpanKota)).catch(() => {});
    return { hasil, offline: false };
  } catch {
    try {
      return { hasil: await cariKotaLokal(nama), offline: true };
    } catch {
      return { hasil: [], offline: true };
    }
  }
}

// ---------- Kota terakhir dilihat ----------

const KUNCI_KOTA_TERAKHIR = "kota_terakhir";

export async function simpanKotaTerakhir(kota: HasilGeocoding): Promise<void> {
  await tulisStatus(KUNCI_KOTA_TERAKHIR, JSON.stringify(kota));
}

export async function ambilKotaTerakhir(): Promise<HasilGeocoding | null> {
  const json = await bacaStatus(KUNCI_KOTA_TERAKHIR);
  return json ? (JSON.parse(json) as HasilGeocoding) : null;
}
