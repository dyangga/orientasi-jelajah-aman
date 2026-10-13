// src/app/(tabs)/index.tsx
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ambilSemuaFavorit } from "../../services/favoritStorage";

import {
  ActivityIndicator,
  Alert,
  Button,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AtribusiCuaca from "../../components/AtribusiCuaca";
import SearchBox from "../../components/SearchBox";
import WeatherCard from "../../components/WeatherCard";
import { labelKodeCuaca } from "../../constants/weatherCodes";
import { useDebounce } from "../../hooks/use-debounce";
import { bersihkanCacheLama } from "../../services/cacheService";
import {
  ambilCuacaLengkap,
  ambilKotaTerakhir,
  cariKotaDenganFallback,
  simpanKota,
  simpanKotaTerakhir,
} from "../../services/cuacaRepository";
import {
  ambilKoordinatSaatIni,
  mintaIzinLokasi,
} from "../../services/locationService";
import { konversiTingkatAQI } from "../../services/weatherAdapter";
import { HasilGeocoding } from "../../types/geocoding";
import { DataCuacaLengkap, DataKualitasUdara } from "../../types/weather";

export default function HalamanUtama() {
  const [teksCari, setTeksCari] = useState("");
  const [hasilPencarian, setHasilPencarian] = useState<HasilGeocoding[]>([]);
  const [kotaTerpilih, setKotaTerpilih] = useState<HasilGeocoding | null>(null);
  const [cuaca, setCuaca] = useState<DataCuacaLengkap | null>(null);
  const [kualitasUdara, setKualitasUdara] = useState<DataKualitasUdara | null>(
    null,
  );
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [pesanLokasi, setPesanLokasi] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [pencarianOffline, setPencarianOffline] = useState(false);
  const [diperbaruiPada, setDiperbaruiPada] = useState<number | null>(null);

  const teksTertunda = useDebounce(teksCari, 500);
  const requestIdRef = useRef(0); // pencegah race condition

  
const [idFavorit, setIdFavorit] = useState<number[]>([]);

const muatIdFavorit = useCallback(async () => {
  try {
    const daftar = await ambilSemuaFavorit();
    setIdFavorit(daftar.map((kota) => kota.id));
  } catch {
    Alert.alert("Error", "Gagal memuat daftar favorit.");
  }
}, []);

useFocusEffect(
  useCallback(() => {
    void muatIdFavorit();
  }, [muatIdFavorit])
);

  useEffect(() => {
    if (teksTertunda.trim().length === 0) {
      setHasilPencarian([]);
      return;
    }
    let batal = false;
    cariKotaDenganFallback(teksTertunda).then(({ hasil, offline }) => {
      if (batal) return; // teks sudah berubah, abaikan hasil lama
      setHasilPencarian(hasil);
      setPencarianOffline(offline);
    });
    return () => {
      batal = true;
    };
  }, [teksTertunda]);

  // Saat aplikasi dibuka: bersihkan cache lama dan tampilkan kota terakhir
  // (dari cache bila tidak ada internet).
  useEffect(() => {
    void bersihkanCacheLama().catch(() => {});
    ambilKotaTerakhir()
      .then((kota) => {
        if (kota) void pilihKota(kota, { simpan: false });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pilihKota(
    kota: HasilGeocoding,
    opsi: { paksa?: boolean; simpan?: boolean } = {},
  ) {
    setKotaTerpilih(kota);
    const idSaatIni = ++requestIdRef.current;
    setSedangMemuat(true);
    setPesanError(null);

    try {
      const hasil = await ambilCuacaLengkap(
        kota.latitude,
        kota.longitude,
        opsi.paksa ?? false,
      );

      if (idSaatIni !== requestIdRef.current) return; // hasil basi, abaikan

      setCuaca(hasil.cuaca);
      setKualitasUdara(hasil.kualitasUdara);
      setOffline(hasil.offline);
      setDiperbaruiPada(hasil.diperbaruiPada);

      if (opsi.simpan !== false) {
        void simpanKota(kota).catch(() => {});
        void simpanKotaTerakhir(kota).catch(() => {});
      }
    } catch (err) {
      if (idSaatIni !== requestIdRef.current) return;
      setPesanError(
        "Tidak ada koneksi internet dan belum ada data tersimpan untuk kota ini.",
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
    const koordinat = await ambilKoordinatSaatIni();
    pilihKota({
      id: -1,
      name: "Lokasi Saat Ini",
      latitude: koordinat.latitude,
      longitude: koordinat.longitude,
      country: "",
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 16 }}>
      <SearchBox onCari={setTeksCari} />
      <Button title="Gunakan Lokasi Saat Ini" onPress={gunakanLokasiSaatIni} />
      {pesanLokasi && <Text>{pesanLokasi}</Text>}

      {pencarianOffline && hasilPencarian.length > 0 && (
        <Text style={{ fontSize: 12, color: "#888" }}>
          Offline: menampilkan kota yang pernah Anda cari
        </Text>
      )}
      {pencarianOffline &&
        hasilPencarian.length === 0 &&
        teksTertunda.trim().length > 0 && (
          <Text style={{ fontSize: 12, color: "#888" }}>
            Offline: kota ini belum pernah dicari sebelumnya
          </Text>
        )}

      {hasilPencarian.map((kota) => (
        <TouchableOpacity key={kota.id} onPress={() => pilihKota(kota)}>
          <Text>{kota.name}</Text>
        </TouchableOpacity>
      ))}

      {sedangMemuat && <ActivityIndicator />}

      {pesanError && (
        <View>
          <Text>{pesanError}</Text>
          <Button
            title="Coba Lagi"
            onPress={() =>
              kotaTerpilih && pilihKota(kotaTerpilih, { paksa: true })
            }
          />
        </View>
      )}

      {offline && cuaca && diperbaruiPada && !sedangMemuat && (
        <View
          accessible
          accessibilityRole="alert"
          style={{ padding: 12, borderRadius: 8, backgroundColor: "#FFF4D6" }}
        >
          <Text style={{ fontWeight: "bold" }}>Mode offline</Text>
          <Text>
            Menampilkan data tersimpan, terakhir diperbarui{" "}
            {new Date(diperbaruiPada).toLocaleString("id-ID")}.
          </Text>
          <Button
            title="Perbarui"
            onPress={() =>
              kotaTerpilih && pilihKota(kotaTerpilih, { paksa: true })
            }
          />
        </View>
      )}

    
      {cuaca && kualitasUdara && kotaTerpilih && !sedangMemuat && (
        <>
          <WeatherCard
            kota={kotaTerpilih.name}
            suhu={cuaca.saatIni.suhu}
            tingkatAQI={konversiTingkatAQI(kualitasUdara.indeksAQI)}
          />
          
          {idFavorit.includes(kotaTerpilih.id) && (
            <Button title="Kota ini sudah di tambahkan ke favorit" />
          )}

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

      {cuaca && (
        <View>
          <Text style={{ fontSize: 14 }}>
            Suhu Maksimal Hari Ini: {cuaca.harian.suhuMaksimal[0]}°C
          </Text>
          <Text style={{ fontSize: 14 }}>
            Suhu Minimal Hari Ini: {cuaca.harian.suhuMinimal[0]}°C
          </Text>
        </View>
      )}

      {cuaca && (
        <Text style={{ fontSize: 12, color: "#888" }}>
          Kondisi: {labelKodeCuaca(cuaca.saatIni.kodeCuaca)} • Angin
          {cuaca.saatIni.kecepatanAngin} km/j
        </Text>
      )}
      {cuaca && kualitasUdara && (
        <View>
          <Text style={{ fontSize: 12, color: "#888" }}>
            PM2.5: {kualitasUdara.pm25} µg/m³
          </Text>
          <Text style={{ fontSize: 12, color: "#888" }}>
            PM10: {kualitasUdara.pm10} µg/m³
          </Text>
        </View>
      )}
      <AtribusiCuaca />
    </SafeAreaView>
  );
}
