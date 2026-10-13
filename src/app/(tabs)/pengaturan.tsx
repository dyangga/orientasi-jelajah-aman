// app/(tabs)/pengaturan.tsx
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ProgresSinkron,
  sinkronDaftarKota,
  waktuSinkronTerakhir,
} from "../../services/sinkronKota";
import {
  ProgresUnduh,
  unduhSemuaKota,
  waktuUnduhTerakhir,
} from "../../services/unduhOffline";

export default function TabPengaturan() {
  const [sedangUnduh, setSedangUnduh] = useState(false);
  const [progres, setProgres] = useState<ProgresUnduh | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [terakhir, setTerakhir] = useState<number | null>(null);
  const [sedangSinkron, setSedangSinkron] = useState(false);
  const [progresSinkron, setProgresSinkron] = useState<ProgresSinkron | null>(null);
  const [pesanSinkron, setPesanSinkron] = useState<string | null>(null);
  const [terakhirSinkron, setTerakhirSinkron] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      waktuUnduhTerakhir().then(setTerakhir).catch(() => {});
      waktuSinkronTerakhir().then(setTerakhirSinkron).catch(() => {});
    }, []),
  );

  async function unduh() {
    setSedangUnduh(true);
    setPesan(null);
    setProgres({ selesai: 0, total: 0 });
    try {
      const hasil = await unduhSemuaKota(setProgres);
      setTerakhir(await waktuUnduhTerakhir());
      setPesan(
        hasil.berhasil === hasil.total
          ? `Selesai: ${hasil.berhasil} kabupaten/kota tersimpan untuk offline.`
          : `Sebagian berhasil: ${hasil.berhasil} dari ${hasil.total} kota. Coba lagi dengan koneksi lebih stabil.`,
      );
    } catch {
      setPesan("Gagal mengunduh. Pastikan perangkat terhubung ke internet.");
    } finally {
      setSedangUnduh(false);
    }
  }

  async function sinkron() {
    setSedangSinkron(true);
    setPesanSinkron(null);
    setProgresSinkron(null);
    try {
      const h = await sinkronDaftarKota(setProgresSinkron);
      setTerakhirSinkron(await waktuSinkronTerakhir());
      setPesanSinkron(
        `Selesai: ${h.total} wilayah dari API. ${h.sudahAda} sudah ada, ${h.baru} kota baru ditambahkan` +
          (h.gagal > 0 ? `, ${h.gagal} gagal dicari koordinatnya.` : "."),
      );
    } catch {
      setPesanSinkron(
        "Gagal memperbarui daftar kota. Data bawaan tetap bisa dipakai; coba lagi saat online.",
      );
    } finally {
      setSedangSinkron(false);
    }
  }

  return (
    <SafeAreaView style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>Jelajah Aman</Text>
      <Text>Versi 1.0.0</Text>

      <View style={{ gap: 8, marginTop: 8 }}>
        <Text style={{ fontWeight: "bold" }}>Data offline</Text>
        <Text>
          Daftar seluruh kabupaten/kota Indonesia selalu tersedia offline. Unduh
          cuaca dan kualitas udaranya agar semua kota bisa dibuka tanpa internet.
        </Text>
        <Text style={{ color: "#666" }}>
          {terakhir
            ? `Terakhir diunduh: ${new Date(terakhir).toLocaleString("id-ID")}`
            : "Belum pernah diunduh"}
        </Text>
        <Button
          title={sedangUnduh ? "Mengunduh..." : "Unduh cuaca semua kota"}
          onPress={unduh}
          disabled={sedangUnduh}
        />
        {sedangUnduh && (
          <View style={{ gap: 4 }}>
            <ActivityIndicator />
            {progres && progres.total > 0 && (
              <Text accessibilityLiveRegion="polite">
                {progres.selesai} / {progres.total} kota
              </Text>
            )}
          </View>
        )}
        {pesan && <Text accessibilityRole="alert">{pesan}</Text>}
      </View>

      <View style={{ gap: 8, marginTop: 8 }}>
        <Text style={{ fontWeight: "bold" }}>Daftar kota</Text>
        <Text>
          Perbarui daftar kabupaten/kota dari API. Data bawaan tetap dipakai
          sebagai cadangan.
        </Text>
        <Text style={{ color: "#666" }}>
          {terakhirSinkron
            ? `Terakhir diperbarui: ${new Date(terakhirSinkron).toLocaleString("id-ID")}`
            : "Belum pernah diperbarui"}
        </Text>
        <Button
          title={sedangSinkron ? "Memperbarui..." : "Perbarui daftar kota"}
          onPress={sinkron}
          disabled={sedangSinkron}
        />
        {sedangSinkron && (
          <View style={{ gap: 4 }}>
            <ActivityIndicator />
            {progresSinkron && (
              <Text accessibilityLiveRegion="polite">
                {progresSinkron.tahap}
                {progresSinkron.total > 1
                  ? ` (${progresSinkron.selesai}/${progresSinkron.total})`
                  : ""}
              </Text>
            )}
          </View>
        )}
        {pesanSinkron && <Text accessibilityRole="alert">{pesanSinkron}</Text>}
      </View>
    </SafeAreaView>
  );
}
