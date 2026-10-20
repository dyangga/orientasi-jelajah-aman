// src/app/(tabs)/index.tsx
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AtribusiCuaca from "../../components/AtribusiCuaca";
import SearchBox from "../../components/SearchBox";
import StatusData from "../../components/StatusData";
import WeatherCard from "../../components/WeatherCard";
import { labelKodeCuaca } from "../../constants/weatherCodes";
import { useDebounce } from "../../hooks/use-debounce";
import {
  bersihkanCacheLama,
  daftarKotaTersimpan,
} from "../../services/cacheRepository";
import {
  BATAS_CACHE_MS,
  ambilCuacaOfflineFirst,
} from "../../services/cuacaRepository";
import { ambilSemuaFavorit } from "../../services/favoritStorage";
import { cariKota } from "../../services/geocodingService";
import {
  ambilKoordinatSaatIni,
  mintaIzinLokasi,
} from "../../services/locationService";
import { konversiTingkatAQI } from "../../services/weatherAdapter";
import { HasilCuacaOffline, RingkasanKotaTersimpan } from "../../types/cache";
import { HasilGeocoding } from "../../types/geocoding";

export default function HalamanUtama() {
  const [teksCari, setTeksCari] = useState("");
  const [hasilPencarian, setHasilPencarian] = useState<HasilGeocoding[]>([]);
  const [kotaTerpilih, setKotaTerpilih] = useState<HasilGeocoding | null>(null);
  const [hasil, setHasil] = useState<HasilCuacaOffline | null>(null);
  const [kotaTersimpan, setKotaTersimpan] = useState<RingkasanKotaTersimpan[]>(
    [],
  );
  const [idFavorit, setIdFavorit] = useState<number[]>([]);
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [pesanLokasi, setPesanLokasi] = useState<string | null>(null);

  const teksTertunda = useDebounce(teksCari, 500);
  const requestIdRef = useRef(0); // pencegah race condition

  async function muatKotaTersimpan() {
    setKotaTersimpan(await daftarKotaTersimpan());
  }

  const muatIdFavorit = useCallback(async () => {
    try {
      const daftar = await ambilSemuaFavorit();
      setIdFavorit(daftar.map((kota) => kota.id));
    } catch {
      Alert.alert("Error", "Gagal memuat daftar favorit.");
    }
  }, []);

  // Saat aplikasi dibuka: buang cache > 7 hari, lalu tampilkan daftar tersimpan
  useEffect(() => {
    bersihkanCacheLama(BATAS_CACHE_MS)
      .then(muatKotaTersimpan)
      .catch(() => {});
  }, []);

  // Setiap kali tab Beranda difokuskan: segarkan favorit dan daftar tersimpan
  // (mis. setelah cache dihapus lewat tab Pengaturan)
  useFocusEffect(
    useCallback(() => {
      void muatIdFavorit();
      muatKotaTersimpan().catch(() => {});
    }, [muatIdFavorit]),
  );

  useEffect(() => {
    if (teksTertunda.trim().length === 0) {
      setHasilPencarian([]);
      return;
    }
    cariKota(teksTertunda)
      .then(setHasilPencarian)
      .catch(() => setHasilPencarian([]));
  }, [teksTertunda]);

  async function pilihKota(kota: HasilGeocoding, paksaPerbarui = false) {
    setKotaTerpilih(kota);
    const idSaatIni = ++requestIdRef.current;
    setSedangMemuat(true);
    setPesanError(null);

    try {
      const data = await ambilCuacaOfflineFirst(
        {
          id: kota.id,
          nama: kota.name,
          latitude: kota.latitude,
          longitude: kota.longitude,
        },
        { paksaPerbarui },
      );
      if (idSaatIni !== requestIdRef.current) return; // hasil basi, abaikan
      setHasil(data);
      muatKotaTersimpan().catch(() => {});
    } catch {
      if (idSaatIni !== requestIdRef.current) return;
      setHasil(null);
      setPesanError(
        "Belum ada data tersimpan dan tidak ada koneksi internet. Sambungkan internet lalu coba lagi.",
      );
    } finally {
      if (idSaatIni === requestIdRef.current) setSedangMemuat(false);
    }
  }

  async function gunakanLokasiSaatIni() {
    const status = await mintaIzinLokasi();

    if (status === "denied") {
      setPesanLokasi(
        "Izin lokasi ditolak. Silakan cari kota secara manual di atas.",
      );
      return;
    }
    if (status === "unavailable") {
      setPesanLokasi(
        "Layanan lokasi tidak aktif di perangkat ini. Silakan cari kota secara manual.",
      );
      return;
    }

    setPesanLokasi(null);
    try {
      const koordinat = await ambilKoordinatSaatIni();
      void pilihKota({
        id: -1,
        name: "Lokasi Saat Ini",
        latitude: koordinat.latitude,
        longitude: koordinat.longitude,
        country: "",
      });
    } catch {
      setPesanLokasi(
        "Gagal mendapatkan lokasi saat ini. Silakan cari kota secara manual.",
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <SearchBox onCari={setTeksCari} />

        <Button title="Gunakan Lokasi Saat Ini" onPress={gunakanLokasiSaatIni} />
        {pesanLokasi && (
          <Text accessibilityLabel={pesanLokasi}>{pesanLokasi}</Text>
        )}

        {hasilPencarian.map((kota) => (
          <TouchableOpacity key={kota.id} onPress={() => pilihKota(kota)}>
            <Text>{kota.name}</Text>
          </TouchableOpacity>
        ))}

        {kotaTersimpan.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "bold" }}>
              Tersimpan di perangkat (bisa dibuka offline)
            </Text>
            {kotaTersimpan.map((k) => (
              <TouchableOpacity
                key={k.kunci}
                onPress={() =>
                  pilihKota({
                    id: k.id,
                    name: k.nama,
                    latitude: k.latitude,
                    longitude: k.longitude,
                    country: "",
                  })
                }
              >
                <Text>{k.nama}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {sedangMemuat && <ActivityIndicator />}

        {pesanError && (
          <View>
            <Text accessibilityLabel={pesanError}>{pesanError}</Text>
            <Button
              title="Coba Lagi"
              onPress={() => kotaTerpilih && pilihKota(kotaTerpilih, true)}
            />
          </View>
        )}

        {hasil && kotaTerpilih && !sedangMemuat && (
          <>
            <StatusData
              sumber={hasil.sumber}
              disimpanPada={hasil.disimpanPada}
            />
            <WeatherCard
              kota={kotaTerpilih.name}
              suhu={hasil.cuaca.saatIni.suhu}
              tingkatAQI={konversiTingkatAQI(hasil.kualitasUdara.indeksAQI)}
            />
            <Text style={{ fontSize: 12, color: "#888888" }}>
              Kondisi: {labelKodeCuaca(hasil.cuaca.saatIni.kodeCuaca)}{" "}
              {"•"} Angin {hasil.cuaca.saatIni.kecepatanAngin} km/j
            </Text>
            <View>
              <Text style={{ fontSize: 14 }}>
                Suhu Maksimal Hari Ini: {hasil.cuaca.harian.suhuMaksimal[0]}°C
              </Text>
              <Text style={{ fontSize: 14 }}>
                Suhu Minimal Hari Ini: {hasil.cuaca.harian.suhuMinimal[0]}°C
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: "#888888" }}>
                PM2.5: {hasil.kualitasUdara.pm25} µg/m³
              </Text>
              <Text style={{ fontSize: 12, color: "#888888" }}>
                PM10: {hasil.kualitasUdara.pm10} µg/m³
              </Text>
            </View>
            <Button
              title="Perbarui Sekarang"
              onPress={() => pilihKota(kotaTerpilih, true)}
            />
            {!idFavorit.includes(kotaTerpilih.id) && (
              <Button
                title="Tambahkan ke Favorit"
                onPress={() =>
                  router.push({
                    pathname: "/tambah-favorit",
                    params: {
                      id: String(kotaTerpilih.id),
                      nama: kotaTerpilih.name,
                      lat: String(kotaTerpilih.latitude),
                      lon: String(kotaTerpilih.longitude),
                    },
                  })
                }
              />
            )}
          </>
        )}

        <AtribusiCuaca />
      </ScrollView>
    </SafeAreaView>
  );
}
