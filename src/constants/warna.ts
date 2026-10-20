// src/constants/warna.ts
// Palet warna untuk tema Terang dan Gelap. Semua layar membaca warna lewat useTema().
export interface Palet {
  latar: string; // latar layar
  kartu: string; // latar kartu / kotak info
  teks: string; // teks utama
  teksPudar: string; // teks sekunder / keterangan
  garis: string; // garis pembatas dan border
  aksen: string; // warna tab aktif dan elemen terpilih
  segarLatar: string; // label status data segar
  segarTeks: string;
  basiLatar: string; // label status data usang (offline)
  basiTeks: string;
}

export const paletTerang: Palet = {
  latar: "#FFFFFF",
  kartu: "#F4F7FA",
  teks: "#111111",
  teksPudar: "#666666",
  garis: "#C9CFD6",
  aksen: "#0A7EA4",
  segarLatar: "#EAFBF6",
  segarTeks: "#13795F",
  basiLatar: "#FEF3E2",
  basiTeks: "#B45309",
};

export const paletGelap: Palet = {
  latar: "#121417",
  kartu: "#1E2227",
  teks: "#F2F4F7",
  teksPudar: "#9AA3AE",
  garis: "#3A414A",
  aksen: "#4FB3E8",
  segarLatar: "#0F2E27",
  segarTeks: "#5FD3B3",
  basiLatar: "#3A2A12",
  basiTeks: "#F5B461",
};
