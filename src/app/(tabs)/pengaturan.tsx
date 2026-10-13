// app/(tabs)/pengaturan.tsx
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

  useFocusEffect(
    useCallback(() => {
      waktuUnduhTerakhir().then(setTerakhir).catch(() => {});
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
    </SafeAreaView>
  );
}
