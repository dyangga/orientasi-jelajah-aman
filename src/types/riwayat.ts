// src/types/riwayat.ts
import { HasilGeocoding } from "./geocoding";

// Satu entri riwayat pencarian: data kota lengkap + waktu dipilih
export interface RiwayatPencarian extends HasilGeocoding {
  waktu: number; // epoch milidetik
}
