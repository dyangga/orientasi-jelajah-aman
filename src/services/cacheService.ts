// src/services/cacheService.ts
// Cache respons API di SQLite dengan strategi "network-first, fallback ke cache".
import { getDb } from "../db/database";

/** Data lebih muda dari ini dianggap segar: langsung dipakai tanpa menyentuh jaringan. */
export const TTL_SEGAR_MS = 10 * 60 * 1000; // 10 menit
/** Entri lebih tua dari ini dibuang saat pembersihan (cukup lama agar tetap ada saat offline berhari-hari). */
export const UMUR_MAKSIMAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

export interface HasilCache<T> {
  data: T;
  /** true bila data berasal dari cache karena jaringan gagal / belum perlu diperbarui */
  dariCache: boolean;
  /** true bila jaringan gagal sehingga yang ditampilkan adalah data lama (mode offline) */
  offline: boolean;
  /** waktu data ini disimpan (ms epoch) */
  disimpanPada: number;
}

interface OpsiCache {
  /** abaikan TTL, paksa ambil dari jaringan (tombol refresh / coba lagi) */
  paksa?: boolean;
  ttlMs?: number;
}

async function bacaCache(
  kunci: string,
): Promise<{ payload: string; disimpanPada: number } | null> {
  const db = await getDb();
  const baris = await db.getFirstAsync<{
    payload: string;
    disimpan_pada: number;
  }>("SELECT payload, disimpan_pada FROM cache_api WHERE kunci = ?", kunci);
  return baris
    ? { payload: baris.payload, disimpanPada: baris.disimpan_pada }
    : null;
}

async function tulisCache(kunci: string, data: unknown): Promise<number> {
  const db = await getDb();
  const sekarang = Date.now();
  await db.runAsync(
    "INSERT OR REPLACE INTO cache_api (kunci, payload, disimpan_pada) VALUES (?, ?, ?)",
    kunci,
    JSON.stringify(data),
    sekarang,
  );
  return sekarang;
}

export async function bersihkanCacheLama(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "DELETE FROM cache_api WHERE disimpan_pada < ?",
    Date.now() - UMUR_MAKSIMAL_MS,
  );
}

/**
 * 1. Ada cache segar (dan tidak dipaksa)  -> pakai cache.
 * 2. Selain itu coba jaringan; sukses     -> simpan ke cache, kembalikan data baru.
 * 3. Jaringan gagal, ada cache (basi)     -> kembalikan cache dengan offline = true.
 * 4. Jaringan gagal, tidak ada cache      -> lempar error aslinya.
 */
export async function ambilDenganCache<T>(
  kunci: string,
  ambilDariJaringan: () => Promise<T>,
  opsi: OpsiCache = {},
): Promise<HasilCache<T>> {
  const ttl = opsi.ttlMs ?? TTL_SEGAR_MS;

  let tersimpan: Awaited<ReturnType<typeof bacaCache>> = null;
  try {
    tersimpan = await bacaCache(kunci);
  } catch {
    // database bermasalah: jangan blokir aplikasi, lanjut ke jaringan
  }

  if (
    tersimpan &&
    !opsi.paksa &&
    Date.now() - tersimpan.disimpanPada < ttl
  ) {
    return {
      data: JSON.parse(tersimpan.payload) as T,
      dariCache: true,
      offline: false,
      disimpanPada: tersimpan.disimpanPada,
    };
  }

  try {
    const data = await ambilDariJaringan();
    let disimpanPada = Date.now();
    try {
      disimpanPada = await tulisCache(kunci, data);
    } catch {
      // gagal menulis cache tidak boleh menggagalkan tampilan data
    }
    return { data, dariCache: false, offline: false, disimpanPada };
  } catch (err) {
    if (tersimpan) {
      return {
        data: JSON.parse(tersimpan.payload) as T,
        dariCache: true,
        offline: true,
        disimpanPada: tersimpan.disimpanPada,
      };
    }
    throw err;
  }
}

/** Menyimpan banyak entri sekaligus dalam satu transaksi (dipakai unduhan massal). */
export async function simpanCacheBanyak(
  entri: { kunci: string; data: unknown }[],
): Promise<void> {
  const db = await getDb();
  const sekarang = Date.now();
  await db.withTransactionAsync(async () => {
    for (const e of entri) {
      await db.runAsync(
        "INSERT OR REPLACE INTO cache_api (kunci, payload, disimpan_pada) VALUES (?, ?, ?)",
        e.kunci,
        JSON.stringify(e.data),
        sekarang,
      );
    }
  });
}

/** Koordinat dibulatkan 2 desimal (~1 km) agar lokasi GPS yang berdekatan memakai cache yang sama. */
export function kunciKoordinat(
  jenis: string,
  latitude: number,
  longitude: number,
): string {
  return `${jenis}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
}
