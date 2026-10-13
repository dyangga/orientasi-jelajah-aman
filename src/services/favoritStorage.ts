// src/services/favoritStorage.ts
// API publik sama seperti sebelumnya, tetapi datanya kini di SQLite.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bacaStatus, getDb, tulisStatus } from "../db/database";
import { KotaFavorit } from "../types/favorit";

const KUNCI_LAMA_ASYNCSTORAGE = "@jelajah_aman:favorit";
const KUNCI_PENANDA_MIGRASI = "migrasi_favorit_asyncstorage";

let migrasi: Promise<void> | null = null;

/** Memindahkan favorit lama dari AsyncStorage ke SQLite, sekali saja. */
function pastikanMigrasi(): Promise<void> {
  if (!migrasi) {
    migrasi = jalankanMigrasi().catch((err) => {
      migrasi = null;
      throw err;
    });
  }
  return migrasi;
}

async function jalankanMigrasi(): Promise<void> {
  if ((await bacaStatus(KUNCI_PENANDA_MIGRASI)) === "selesai") return;

  const json = await AsyncStorage.getItem(KUNCI_LAMA_ASYNCSTORAGE);
  if (json) {
    const lama: KotaFavorit[] = JSON.parse(json);
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const k of lama) {
        await db.runAsync(
          "INSERT OR IGNORE INTO favorit (id, nama, latitude, longitude, ditambah_pada) VALUES (?, ?, ?, ?, ?)",
          k.id,
          k.nama,
          k.latitude,
          k.longitude,
          Date.now(),
        );
      }
    });
  }
  await tulisStatus(KUNCI_PENANDA_MIGRASI, "selesai");
}

export async function ambilSemuaFavorit(): Promise<KotaFavorit[]> {
  await pastikanMigrasi();
  const db = await getDb();
  return db.getAllAsync<KotaFavorit>(
    "SELECT id, nama, latitude, longitude FROM favorit ORDER BY ditambah_pada, id",
  );
}

export async function tambahFavorit(kota: KotaFavorit): Promise<void> {
  await pastikanMigrasi();
  const db = await getDb();
  await db.runAsync(
    "INSERT OR IGNORE INTO favorit (id, nama, latitude, longitude, ditambah_pada) VALUES (?, ?, ?, ?, ?)",
    kota.id,
    kota.nama,
    kota.latitude,
    kota.longitude,
    Date.now(),
  );
}

export async function hapusFavorit(id: number): Promise<void> {
  await pastikanMigrasi();
  const db = await getDb();
  await db.runAsync("DELETE FROM favorit WHERE id = ?", id);
}
