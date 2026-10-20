// src/db/database.ts
import * as SQLite from "expo-sqlite";

const NAMA_DATABASE = "jelajah-aman.db";
const VERSI_DATABASE = 2;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Satu pintu untuk seluruh aplikasi: database dibuka dan dimigrasi SEKALI saja
export function ambilDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = bukaDanMigrasi().catch((err) => {
      dbPromise = null; // izinkan percobaan ulang jika gagal
      throw err;
    });
  }
  return dbPromise;
}

async function bukaDanMigrasi(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(NAMA_DATABASE);
  await migrasiDatabase(db);
  return db;
}

async function migrasiDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  const baris = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let versiSaatIni = baris?.user_version ?? 0;

  // Pengaman: file database bisa tertinggal dari percobaan lama (user_version
  // sudah naik tetapi tabelnya tidak ada). Jika tabel hilang, mulai dari awal.
  if (versiSaatIni > 0 && !(await tabelAda(db, "cache_cuaca"))) {
    versiSaatIni = 0;
  }

  if (versiSaatIni >= VERSI_DATABASE) return;

  if (versiSaatIni < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE IF NOT EXISTS cache_cuaca (
        kunci TEXT PRIMARY KEY NOT NULL,
        kota_id INTEGER NOT NULL,
        nama_kota TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        cuaca_json TEXT NOT NULL,
        aqi_json TEXT NOT NULL,
        disimpan_pada INTEGER NOT NULL
      );
    `);
    versiSaatIni = 1;
  }

  // Migrasi berikutnya ditambahkan di sini, contoh:
  // if (versiSaatIni < 3) { ...ALTER TABLE...; versiSaatIni = 3; }

  if (versiSaatIni < 2) {
    // Cek dulu agar migrasi aman dijalankan ulang (ALTER ADD COLUMN tidak idempoten)
    if (!(await kolomAda(db, "cache_cuaca", "jumlah_dibuka"))) {
      await db.execAsync(
        "ALTER TABLE cache_cuaca ADD COLUMN jumlah_dibuka INTEGER NOT NULL DEFAULT 0;"
      );
    }
    versiSaatIni = 2;
  }

  await db.execAsync("PRAGMA user_version = " + VERSI_DATABASE);
}

async function tabelAda(db: SQLite.SQLiteDatabase, nama: string): Promise<boolean> {
  const baris = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [nama]
  );
  return baris !== null;
}

async function kolomAda(
  db: SQLite.SQLiteDatabase,
  tabel: string,
  kolom: string
): Promise<boolean> {
  // PRAGMA tidak menerima placeholder; nama tabel di sini konstanta kita sendiri
  const daftar = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(" + tabel + ")"
  );
  return daftar.some((k) => k.name === kolom);
}
