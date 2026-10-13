// src/services/sinkronKota.ts
// Sinkronisasi daftar kabupaten/kota dari API publik ke SQLite:
//   1. nama kabupaten/kota  <- API Wilayah Indonesia (emsifa)
//   2. koordinat            <- Open-Meteo Geocoding (hanya untuk kota yang belum ada)
// Data bawaan (sumber 'seed') tidak pernah dihapus/ditimpa, jadi gagal sinkron = aman.
import { BASIS_ID_KOTA_API, BASIS_ID_KOTA_BAWAAN, bacaStatus, getDb, tulisStatus } from "../db/database";
import { fetchDenganBatasWaktu } from "./http";

const API_WILAYAH = "https://emsifa.github.io/api-wilayah-indonesia/api";
const API_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";
const KUNCI_WAKTU_SINKRON = "sinkron_kota_pada";
const JARAK_MAKS_DERAJAT = 4; // hasil geocoding harus berada di sekitar provinsinya

interface ProvinsiApi { id: string; name: string }
interface KotaApi { id: string; province_id: string; name: string }
interface HasilGeo {
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  feature_code?: string;
  admin1?: string;
}

export interface HasilSinkron {
  total: number;
  sudahAda: number;
  baru: number;
  gagal: number;
}

export interface ProgresSinkron { tahap: string; selesai: number; total: number }

// ---------- fungsi murni (mudah diuji) ----------

/** "KABUPATEN ADM. KEPULAUAN SERIBU" -> "kabupaten kepulauan seribu" */
export function normalisasiNama(nama: string): string {
  return nama
    .toLowerCase()
    .replace(/\b(administrasi|adm)\b\.?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tanpaAwalan(nama: string): string {
  return normalisasiNama(nama).replace(/^(kabupaten|kota) /, "");
}

const KATA_KECIL = new Set(["di", "dan", "ke", "dari"]);
export function judulKata(nama: string): string {
  return nama
    .toLowerCase()
    .split(/\s+/)
    .map((k, i) => (i > 0 && KATA_KECIL.has(k) ? k : k.charAt(0).toUpperCase() + k.slice(1)))
    .join(" ");
}

const PERINGKAT_FITUR: Record<string, number> = { ADM2: 0, PPLA2: 1, PPLA: 2, PPLA3: 3, PPLC: 3, PPL: 4 };

/** Pilih hasil geocoding terbaik: negara ID, dekat pusat provinsi, jenis fitur paling sesuai. */
export function pilihHasilGeocoding(
  hasil: HasilGeo[],
  pusat: { latitude: number; longitude: number } | null,
): HasilGeo | null {
  const kandidat = hasil
    .filter((h) => !h.country_code || h.country_code === "ID")
    .filter(
      (h) =>
        !pusat ||
        (Math.abs(h.latitude - pusat.latitude) <= JARAK_MAKS_DERAJAT &&
          Math.abs(h.longitude - pusat.longitude) <= JARAK_MAKS_DERAJAT),
    );
  if (kandidat.length === 0) return null;
  const peringkat = (h: HasilGeo) => PERINGKAT_FITUR[h.feature_code ?? ""] ?? 9;
  // sort stabil: peringkat fitur, lalu urutan asli dari API (relevansi)
  return kandidat
    .map((h, i) => ({ h, i }))
    .sort((a, b) => peringkat(a.h) - peringkat(b.h) || a.i - b.i)[0].h;
}

// ---------- jaringan ----------

async function ambilJson<T>(url: string): Promise<T> {
  const r = await fetchDenganBatasWaktu(url, 15000);
  if (!r.ok) throw new Error(`Gagal memuat ${url} (status ${r.status})`);
  return (await r.json()) as T;
}

async function geocode(nama: string): Promise<HasilGeo[]> {
  const url = `${API_GEOCODING}?name=${encodeURIComponent(nama)}&count=10&language=id&countryCode=ID&format=json`;
  const data = await ambilJson<{ results?: HasilGeo[] }>(url);
  return data.results ?? [];
}

export async function waktuSinkronTerakhir(): Promise<number | null> {
  const nilai = await bacaStatus(KUNCI_WAKTU_SINKRON);
  return nilai ? Number(nilai) : null;
}

// ---------- sinkronisasi ----------

export async function sinkronDaftarKota(
  onProgres?: (p: ProgresSinkron) => void,
): Promise<HasilSinkron> {
  const db = await getDb();

  // 1. Ambil nama dari API wilayah (galat di sini = batalkan, tidak ada yang berubah)
  onProgres?.({ tahap: "Mengambil daftar wilayah", selesai: 0, total: 1 });
  const provinsi = await ambilJson<ProvinsiApi[]>(`${API_WILAYAH}/provinces.json`);
  const semua: KotaApi[] = [];
  for (const p of provinsi) {
    semua.push(...(await ambilJson<KotaApi[]>(`${API_WILAYAH}/regencies/${p.id}.json`)));
  }

  // 2. Kota yang sudah punya koordinat (bawaan atau hasil sinkron sebelumnya)
  const ada = await db.getAllAsync<{ nama: string; id: number }>(
    "SELECT nama, id FROM kota WHERE sumber IN ('seed', 'api')",
  );
  const dikenal = new Set(ada.map((k) => normalisasiNama(k.nama)));

  const baruCalon = semua.filter(
    (k) => !dikenal.has(normalisasiNama(judulKata(k.name))),
  );
  const hasil: HasilSinkron = {
    total: semua.length,
    sudahAda: semua.length - baruCalon.length,
    baru: 0,
    gagal: 0,
  };

  // 3. Cari koordinat hanya untuk yang baru
  for (let i = 0; i < baruCalon.length; i++) {
    const k = baruCalon[i];
    onProgres?.({ tahap: "Mencari koordinat kota baru", selesai: i, total: baruCalon.length });
    try {
      const nama = judulKata(k.name);
      const pusat = await db.getFirstAsync<{ latitude: number; longitude: number }>(
        `SELECT AVG(latitude) AS latitude, AVG(longitude) AS longitude FROM kota
         WHERE sumber = 'seed' AND id >= ? AND id < ?`,
        BASIS_ID_KOTA_BAWAAN + Number(k.province_id) * 100,
        BASIS_ID_KOTA_BAWAAN + Number(k.province_id) * 100 + 100,
      );
      const pilihan = pilihHasilGeocoding(
        await geocode(tanpaAwalan(nama)),
        pusat && pusat.latitude !== null ? pusat : null,
      );
      if (!pilihan) {
        hasil.gagal++;
        continue;
      }
      const prov = provinsi.find((p) => p.id === k.province_id);
      await db.runAsync(
        `INSERT OR REPLACE INTO kota
           (id, nama, nama_kecil, ibukota_kecil, admin1, negara, latitude, longitude, terakhir_dipakai, sumber)
         VALUES (?, ?, ?, NULL, ?, 'Indonesia', ?, ?,
                 COALESCE((SELECT terakhir_dipakai FROM kota WHERE id = ?), 0), 'api')`,
        BASIS_ID_KOTA_API + Number(k.id),
        nama,
        tanpaAwalan(nama),
        prov ? judulKata(prov.name) : null,
        pilihan.latitude,
        pilihan.longitude,
        BASIS_ID_KOTA_API + Number(k.id),
      );
      hasil.baru++;
    } catch {
      hasil.gagal++; // satu kota gagal tidak menghentikan yang lain
    }
  }

  onProgres?.({ tahap: "Selesai", selesai: baruCalon.length, total: baruCalon.length });
  await tulisStatus(KUNCI_WAKTU_SINKRON, String(Date.now()));
  return hasil;
}
