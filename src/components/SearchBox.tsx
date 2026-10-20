// src/components/SearchBox.tsx
import { useState } from "react";
import { TextInput, View } from "react-native";
import { useTema } from "../context/TemaContext";

interface SearchBoxProps {
  onCari: (teks: string) => void;
  // Jika diisi, teks dikendalikan induk (dipakai agar riwayat bisa mengisi kotak cari)
  nilai?: string;
}

export default function SearchBox({ onCari, nilai }: SearchBoxProps) {
  const { warna } = useTema();
  const [teks, setTeks] = useState("");

  function handleChange(nilaiBaru: string) {
    setTeks(nilaiBaru);
    onCari(nilaiBaru); // kirim setiap perubahan, debounce diatur di pemanggilnya
  }

  return (
    <View>
      <TextInput
        placeholder="Cari nama kota..."
        value={nilai ?? teks}
        onChangeText={handleChange}
        accessibilityLabel="Cari cuaca untuk kota yang dimasukkan"
        placeholderTextColor={warna.teksPudar}
        style={{
          borderWidth: 1,
          borderColor: warna.garis,
          backgroundColor: warna.kartu,
          color: warna.teks,
          padding: 8,
          borderRadius: 8,
        }}
      />
    </View>
  );
}
