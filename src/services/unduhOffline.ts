// src/services/unduhOffline.ts
// Mengunduh cuaca + kualitas udara SEMUA kabupaten/kota bawaan agar bisa dibuka offline.
import { bacaStatus, getDb, tulisStatus } from "../db/database";
import { ambilKualitasUdaraBanyak } from "./airQualityService";
import { kunciKoordinat, simpanCacheBanyak } from "./cacheService";
import { ambilCuacaBanyak } from "./weatherService";

const UKURAN_BATCH = 50;
const KUNCI_WAKTU_UNDUH = "unduh_semua_pada";

export interface ProgresUnduh {
  selesai: number;
  total: number;
}

export async function waktuUnduhTerakhir(): Promise<number | null> {
  const nilai = await bacaStatus(KUNCI_WAKTU_UNDUH);
  return nilai ? Number(nilai) : null;
}

/**
 * Unduh per batch. Batch yang gagal tidak membatalkan yang lain; hasilnya
 * melaporkan berapa kota yang berhasil tersimpan.
 */
export async function unduhSemuaKota(
  onProgres?: (p: ProgresUnduh) => void,
): Promise<{ berhasil: number; total: number }> {
  const db = await getDb();
  const kota = await db.getAllAsync<{ latitude: number; longitude: number }>(
    "SELECT latitude, longitude FROM kota WHERE sumber = 'seed' ORDER BY id",
  );

  let berhasil = 0;
  let galatTerakhir: unknown = null;

  for (let i = 0; i < kota.length; i += UKURAN_BATCH) {
    const batch = kota.slice(i, i + UKURAN_BATCH);
    try {
      const [cuaca, udara] = await Promise.all([
        ambilCuacaBanyak(batch),
        ambilKualitasUdaraBanyak(batch),
      ]);
      if (cuaca.length !== batch.length || udara.length !== batch.length) {
        throw new Error("Jumlah hasil API tidak sesuai dengan jumlah kota");
      }
      await simpanCacheBanyak(
        batch.flatMap((k, j) => [
          { kunci: kunciKoordinat("cuaca", k.latitude, k.longitude), data: cuaca[j] },
          { kunci: kunciKoordinat("aqi", k.latitude, k.longitude), data: udara[j] },
        ]),
      );
      berhasil += batch.length;
    } catch (err) {
      galatTerakhir = err;
    }
    onProgres?.({ selesai: Math.min(i + batch.length, kota.length), total: kota.length });
  }

  if (berhasil === 0 && galatTerakhir) throw galatTerakhir;
  if (berhasil > 0) await tulisStatus(KUNCI_WAKTU_UNDUH, String(Date.now()));
  return { berhasil, total: kota.length };
}
