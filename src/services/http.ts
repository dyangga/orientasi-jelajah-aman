// src/services/http.ts
// fetch dengan batas waktu, dipakai semua service jaringan.
const BATAS_WAKTU_MS = 5000;

export async function fetchDenganBatasWaktu(
  url: string,
  batasMs: number = BATAS_WAKTU_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), batasMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Permintaan melebihi batas waktu");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
