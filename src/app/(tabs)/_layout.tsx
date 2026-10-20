// src/app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTema } from "../../context/TemaContext";

export default function TabLayout() {
  const { warna } = useTema();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: warna.latar },
        headerTintColor: warna.teks,
        tabBarStyle: {
          backgroundColor: warna.latar,
          borderTopColor: warna.garis,
        },
        tabBarActiveTintColor: warna.aksen,
        tabBarInactiveTintColor: warna.teksPudar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarAccessibilityLabel: "Tab Beranda, cari dan lihat cuaca",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="riwayat"
        options={{
          // Judul header menjelaskan isi layar; label tab dibuat singkat agar muat
          title: "Favorit & Riwayat",
          tabBarLabel: "Favorit",
          tabBarAccessibilityLabel: "Tab Favorit dan riwayat pencarian",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="pengaturan"
        options={{
          title: "Pengaturan",
          tabBarAccessibilityLabel: "Tab Pengaturan",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tentang"
        options={{
          title: "Tentang",
          tabBarAccessibilityLabel: "Tab Tentang aplikasi",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "information-circle" : "information-circle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
