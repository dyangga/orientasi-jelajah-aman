// src/components/Teks.tsx
import { Text, TextProps } from "react-native";
import { useTema } from "../context/TemaContext";

// Pengganti <Text>: warna default mengikuti tema, style dari pemanggil tetap menang
export default function Teks({ style, ...props }: TextProps) {
  const { warna } = useTema();
  return <Text {...props} style={[{ color: warna.teks }, style]} />;
}
