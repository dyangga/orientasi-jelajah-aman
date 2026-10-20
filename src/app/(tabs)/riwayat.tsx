import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Button,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ambilSemuaFavorit,
  hapusFavorit,
} from "../../services/favoritStorage";
import {
  ambilRiwayat,
  kosongkanRiwayat,
} from "../../services/riwayatPencarianStorage";
import { KotaFavorit } from "../../types/favorit";
import { RiwayatPencarian } from "../../types/riwayat";
import { konfirmasi } from "../../utils/konfirmasi";

export default function TabRiwayat() {
  const [daftarFavorit, setDaftarFavorit] = useState<KotaFavorit[]>([]);
  const [riwayat, setRiwayat] = useState<RiwayatPencarian[]>([]);

  useFocusEffect(
    useCallback(() => {
      ambilSemuaFavorit()
        .then(setDaftarFavorit)
        .catch(() => {});
      ambilRiwayat().then(setRiwayat);
    }, []),
  );

  async function hapus(id: number) {
    await hapusFavorit(id);
    setDaftarFavorit((prev) => prev.filter((k) => k.id !== id));
  }

  // Tambahan latihan mandiri: konfirmasi sebelum menghapus
  function konfirmasiHapus(kota: KotaFavorit) {
    konfirmasi(
      "Konfirmasi Hapus",
      `Apakah kamu yakin ingin menghapus ${kota.nama}?`,
      "Hapus",
      () => {
        hapus(kota.id).catch(() => {
          Alert.alert("Error", "Gagal menghapus kota favorit.");
        });
      },
    );
  }

  // Klik riwayat -> kembali ke Beranda dan jalankan pencarian kota tersebut
  function bukaPencarian(r: RiwayatPencarian) {
    router.navigate({
      pathname: "/",
      params: {
        cariId: String(r.id),
        cariNama: r.name,
        cariLat: String(r.latitude),
        cariLon: String(r.longitude),
        cariNegara: r.country,
        cariTs: String(Date.now()), // pembeda agar kota yang sama bisa diklik berulang
      },
    });
  }

  async function hapusSemuaRiwayat() {
    await kosongkanRiwayat();
    setRiwayat([]);
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>Kota Favorit</Text>

        {/* Tambahan latihan mandiri: jumlah kota favorit */}
        <Text>Tersimpan {daftarFavorit.length} kota</Text>

        {daftarFavorit.length === 0 && <Text>Belum ada kota favorit</Text>}

        {daftarFavorit.map((kota) => (
          <View
            key={kota.id}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text>{kota.nama}</Text>

            {/* Tombol sekarang meminta konfirmasi dahulu */}
            <Button title="Hapus" onPress={() => konfirmasiHapus(kota)} />
          </View>
        ))}

        <Text style={{ fontSize: 18, fontWeight: "bold", marginTop: 12 }}>
          Riwayat Pencarian
        </Text>
        <Text style={{ fontSize: 12, color: "#888888" }}>
          Maksimal 10 pencarian terakhir. Ketuk untuk mencari lagi.
        </Text>

        {riwayat.length === 0 && <Text>Belum ada riwayat pencarian</Text>}

        {riwayat.map((r) => (
          <TouchableOpacity
            key={r.id}
            onPress={() => bukaPencarian(r)}
            accessibilityRole="button"
            accessibilityLabel={`Cari lagi cuaca ${r.name}`}
            style={{ paddingVertical: 6 }}
          >
            <Text>{r.name}</Text>
            <Text style={{ fontSize: 12, color: "#888888" }}>
              {[r.admin1, r.country].filter(Boolean).join(", ")}
            </Text>
          </TouchableOpacity>
        ))}

        {riwayat.length > 0 && (
          <Button title="Hapus Semua Riwayat" onPress={hapusSemuaRiwayat} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
