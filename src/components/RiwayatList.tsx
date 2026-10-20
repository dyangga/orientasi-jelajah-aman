// components/RiwayatList.tsx (diperbarui) 
import { Link } from "expo-router";
import { View } from "react-native";
import Teks from "./Teks";

interface RiwayatListProps {
  daftarKota: string[];
}

export default function RiwayatList({ daftarKota }: RiwayatListProps) {
  return (
    <View>
      {daftarKota.map((kota) => (
        // Format objek pada href lolos pengecekan TypeScript Expo Router 
        <Link key={kota} href={{ pathname: "/detail/[kota]", params: { kota } }}>
          <Teks>{kota}</Teks>
        </Link>
      ))}
    </View>
  );
} 