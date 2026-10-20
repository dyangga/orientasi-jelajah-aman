// src/app/(tabs)/tentang.tsx
import { SafeAreaView } from "react-native-safe-area-context";
import Teks from "../../components/Teks";
import { typeScale } from "../../constants/styles";
import { useTema } from "../../context/TemaContext";

export default function TabDetail() {
  const { warna } = useTema();

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: warna.latar }}>
      <Teks
        accessibilityLabel="Informasi tentang aplikasi jelajah aman "
        style={{ fontSize: typeScale.judul, fontWeight: "bold" }}
      >
        Jelajah Aman
      </Teks>
      <Teks>Versi 1.0.0</Teks>
      <Teks>Pembuat: Desta Adyangga Saputra (60324082)</Teks>
    </SafeAreaView>
  );
}
