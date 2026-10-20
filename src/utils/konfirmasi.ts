// src/utils/konfirmasi.ts
import { Alert, Platform } from "react-native";

// Dialog konfirmasi lintas platform.
// Alert.alert tidak menampilkan apa pun di browser (react-native-web),
// sehingga di web dipakai window.confirm.
export function konfirmasi(
  judul: string,
  pesan: string,
  labelYa: string,
  onYa: () => void,
): void {
  if (Platform.OS === "web") {
    if (window.confirm(`${judul}\n\n${pesan}`)) onYa();
    return;
  }
  Alert.alert(judul, pesan, [
    { text: "Batal", style: "cancel" },
    { text: labelYa, style: "destructive", onPress: onYa },
  ]);
}
