// src/db/database.ts
// Satu-satunya pintu masuk ke database SQLite lokal.
import * as SQLite from "expo-sqlite";

const NAMA_DB = "jelajah-aman.db";

// Naikkan angka ini dan tambahkan blok `if (versi < N)` di bawah setiap kali skema berubah.
const VERSI_SKEMA = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Membuka database sekali saja (singleton) lalu menjalankan migrasi. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = bukaDanMigrasi().catch((err) => {
      dbPromise = null; // izinkan percobaan ulang bila gagal
      throw err;
    });
  }
  return dbPromise;
}

async function bukaDanMigrasi(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(NAMA_DB);
  await db.execAsync("PRAGMA journal_mode = WAL;");

  const baris = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const versi = baris?.user_version ?? 0;

  if (versi < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        -- Cache respons API (cuaca & kualitas udara), kunci = jenis + koordinat
        CREATE TABLE IF NOT EXISTS cache_api (
          kunci         TEXT PRIMARY KEY NOT NULL,
          payload       TEXT NOT NULL,
          disimpan_pada INTEGER NOT NULL
        );

        -- Kota yang pernah dicari/dipilih, dipakai untuk pencarian saat offline
        CREATE TABLE IF NOT EXISTS kota (
          id               INTEGER PRIMARY KEY NOT NULL,
          nama             TEXT NOT NULL,
          nama_kecil       TEXT NOT NULL,
          admin1           TEXT,
          negara           TEXT NOT NULL DEFAULT '',
          latitude         REAL NOT NULL,
          longitude        REAL NOT NULL,
          terakhir_dipakai INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_kota_nama ON kota (nama_kecil);

        CREATE TABLE IF NOT EXISTS favorit (
          id          INTEGER PRIMARY KEY NOT NULL,
          nama        TEXT NOT NULL,
          latitude    REAL NOT NULL,
          longitude   REAL NOT NULL,
          ditambah_pada INTEGER NOT NULL
        );

        -- Penyimpanan kunci-nilai kecil: kota terakhir dilihat, penanda migrasi, dll.
        CREATE TABLE IF NOT EXISTS status_app (
          kunci TEXT PRIMARY KEY NOT NULL,
          nilai TEXT NOT NULL
        );
      `);
    });
  }

  await db.execAsync(`PRAGMA user_version = ${VERSI_SKEMA};`);
  return db;
}

export async function bacaStatus(kunci: string): Promise<string | null> {
  const db = await getDb();
  const baris = await db.getFirstAsync<{ nilai: string }>(
    "SELECT nilai FROM status_app WHERE kunci = ?",
    kunci,
  );
  return baris?.nilai ?? null;
}

export async function tulisStatus(kunci: string, nilai: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO status_app (kunci, nilai) VALUES (?, ?)",
    kunci,
    nilai,
  );
}
