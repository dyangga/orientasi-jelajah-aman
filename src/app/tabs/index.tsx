// app/index.tsx
import { useEffect, useState } from "react";
import { View } from "react-native";
// Catatan: gunakan ../components/ jika file berada di dalam folder app/
// yang sejajar dengan folder components/
import IndikatorAQI from "../../components/IndikatorAQI";
import RiwayatList from "../../components/RiwayatList";
import SearchBox from "../../components/SearchBox";
import WeatherCard from "../../components/WeatherCard";

export default function HalamanUtama() {
  const [kotaAktif, setKotaAktif] = useState("Pekalongan");
  const [riwayat, setRiwayat] = useState<string[]>(["Pekalongan"]);
  // Tambahkan useEffect untuk mencatat perubahan kota aktif
  useEffect(() => {
    console.log("Kota aktif berubah menjadi:", kotaAktif);
  }, [kotaAktif]);
  function handleCari(kota: string) {
    setKotaAktif(kota);
    if (!riwayat.includes(kota)) {
      setRiwayat([...riwayat, kota]);
    }
  }
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <WeatherCard kota={kotaAktif} suhu={29} tingkatAQI="BAIK" />
      <RiwayatList daftarKota={riwayat} />
      <IndikatorAQI
        laporan={{
          kota: "Pekalongan",
          indeksAQI: 45,
          tingkat: "BAIK",
          diperbaruiPada: "15 September 2026",
        }}
      />
      <SearchBox onCari={handleCari} />
    </View>
  );
}
