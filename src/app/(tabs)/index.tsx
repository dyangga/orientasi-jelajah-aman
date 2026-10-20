// src/app/(tabs)/index.tsx
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Button, ScrollView, TouchableOpacity, View } from "react-native";
import Teks from "../../components/Teks";
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
  hapusCacheKota,
} from "../../services/cacheRepository";
import {
  BATAS_CACHE_MS,
  ambilCuacaOfflineFirst,
} from "../../services/cuacaRepository";
import { ambilSemuaFavorit } from "../../services/favoritStorage";
import { cariKota } from "../../services/geocodingService";
import { tambahRiwayat } from "../../services/riwayatPencarianStorage";
import {
  ambilKoordinatSaatIni,
  mintaIzinLokasi,
} from "../../services/locationService";
import { konversiTingkatAQI } from "../../services/weatherAdapter";
import { HasilCuacaOffline, RingkasanKotaTersimpan } from "../../types/cache";
import { useTema } from "../../context/TemaContext";
import { konfirmasi } from "../../utils/konfirmasi";
import { HasilGeocoding } from "../../types/geocoding";

export default function HalamanUtama() {
  const { warna } = useTema();
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

  // Parameter dari tab Riwayat: saat sebuah riwayat diklik, pencarian kota itu dijalankan
  const params = useLocalSearchParams<{
    cariId?: string;
    cariNama?: string;
    cariLat?: string;
    cariLon?: string;
    cariNegara?: string;
    cariTs?: string;
  }>();

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

  // Hapus cache satu kota, setelah pengguna menyetujui dialog konfirmasi
  function hapusCacheSatuKota(k: RingkasanKotaTersimpan) {
    konfirmasi(
      "Hapus Data Tersimpan",
      `Data cuaca ${k.nama} yang tersimpan di perangkat akan dihapus. Lanjutkan?`,
      "Hapus",
      () => {
        hapusCacheKota(k.kunci)
          .then(muatKotaTersimpan)
          .catch(() => {
            Alert.alert("Error", "Gagal menghapus data tersimpan.");
          });
      },
    );
  }

  // Kota yang dipilih dari hasil pencarian dicatat ke riwayat pencarian
  function pilihDariPencarian(kota: HasilGeocoding) {
    tambahRiwayat(kota).catch(() => {});
    return pilihKota(kota);
  }

  // Riwayat diklik -> isi kotak cari, tampilkan hasil pencarian, dan muat cuacanya
  useEffect(() => {
    if (!params.cariTs || !params.cariNama) return;
    const lat = Number(params.cariLat);
    const lon = Number(params.cariLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    setTeksCari(params.cariNama);
    void pilihDariPencarian({
      id: Number(params.cariId),
      name: params.cariNama,
      latitude: lat,
      longitude: lon,
      country: params.cariNegara ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.cariTs]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: warna.latar }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <SearchBox onCari={setTeksCari} nilai={teksCari} />

        <Button title="Gunakan Lokasi Saat Ini" onPress={gunakanLokasiSaatIni} />
        {pesanLokasi && (
          <Teks accessibilityLabel={pesanLokasi}>{pesanLokasi}</Teks>
        )}

        {hasilPencarian.map((kota) => (
          <TouchableOpacity
            key={kota.id}
            onPress={() => pilihDariPencarian(kota)}
          >
            <Teks>{kota.name}</Teks>
          </TouchableOpacity>
        ))}

        {kotaTersimpan.length > 0 && (
          <View style={{ gap: 6 }}>
            <Teks style={{ fontWeight: "bold" }}>
              Tersimpan di perangkat (bisa dibuka offline)
            </Teks>
            {kotaTersimpan.map((k) => (
              <View
                key={k.kunci}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <TouchableOpacity
                  style={{ flex: 1 }}
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
                  <Teks>{k.nama}</Teks>
                </TouchableOpacity>
                <Button
                  title="Hapus"
                  accessibilityLabel={`Hapus data tersimpan ${k.nama}`}
                  onPress={() => hapusCacheSatuKota(k)}
                />
              </View>
            ))}
          </View>
        )}

        {sedangMemuat && <ActivityIndicator color={warna.aksen} />}

        {pesanError && (
          <View>
            <Teks accessibilityLabel={pesanError}>{pesanError}</Teks>
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
            <Teks style={{ fontSize: 12, color: "#888888" }}>
              Kondisi: {labelKodeCuaca(hasil.cuaca.saatIni.kodeCuaca)}{" "}
              {"•"} Angin {hasil.cuaca.saatIni.kecepatanAngin} km/j
            </Teks>
            <View>
              <Teks style={{ fontSize: 14 }}>
                Suhu Maksimal Hari Ini: {hasil.cuaca.harian.suhuMaksimal[0]}°C
              </Teks>
              <Teks style={{ fontSize: 14 }}>
                Suhu Minimal Hari Ini: {hasil.cuaca.harian.suhuMinimal[0]}°C
              </Teks>
            </View>
            <View>
              <Teks style={{ fontSize: 12, color: "#888888" }}>
                PM2.5: {hasil.kualitasUdara.pm25} µg/m³
              </Teks>
              <Teks style={{ fontSize: 12, color: "#888888" }}>
                PM10: {hasil.kualitasUdara.pm10} µg/m³
              </Teks>
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
