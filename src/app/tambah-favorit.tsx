// src/app/tambah-favorit.tsx
import { router, useLocalSearchParams } from "expo-router";
import { Button, View } from "react-native";
import Teks from "../components/Teks";
import { useTema } from "../context/TemaContext";
import { tambahFavorit } from "../services/favoritStorage";

export default function ModalTambahFavorit() {
  const { id, nama, lat, lon } = useLocalSearchParams<{
    id: string;
    nama: string;
    lat: string;
    lon: string;
  }>();

  async function simpan() {
    await tambahFavorit({
      id: Number(id),
      nama,
      latitude: Number(lat),
      longitude: Number(lon),
    });
    router.back();
  }

  const { warna } = useTema();

  return (
    <View style={{ flex: 1, padding: 16, gap: 16, backgroundColor: warna.latar }}>
      <Teks>Tambahkan {nama} ke daftar favorit?</Teks>
      <Button title="Simpan" onPress={simpan} />
    </View>
  );
}
