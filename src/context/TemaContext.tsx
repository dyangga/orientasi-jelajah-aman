// src/context/TemaContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { Palet, paletGelap, paletTerang } from "../constants/warna";

export type PilihanTema = "terang" | "gelap" | "sistem";
export type SkemaAktif = "terang" | "gelap";

interface NilaiTema {
  pilihan: PilihanTema; // yang dipilih pengguna
  skema: SkemaAktif; // yang benar-benar dipakai (sudah memperhitungkan "sistem")
  warna: Palet;
  ubahTema: (pilihan: PilihanTema) => void;
}

const KUNCI_PENYIMPANAN = "@jelajah_aman:tema";

const TemaContext = createContext<NilaiTema>({
  pilihan: "sistem",
  skema: "terang",
  warna: paletTerang,
  ubahTema: () => {},
});

function validasi(nilai: string | null): PilihanTema | null {
  return nilai === "terang" || nilai === "gelap" || nilai === "sistem"
    ? nilai
    : null;
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const skemaSistem = useColorScheme();
  const [pilihan, setPilihan] = useState<PilihanTema>("sistem");

  // Muat pilihan tersimpan saat aplikasi dibuka
  useEffect(() => {
    AsyncStorage.getItem(KUNCI_PENYIMPANAN)
      .then((nilai) => {
        const tersimpan = validasi(nilai);
        if (tersimpan) setPilihan(tersimpan);
      })
      .catch(() => {});
  }, []);

  const ubahTema = useCallback((baru: PilihanTema) => {
    setPilihan(baru);
    AsyncStorage.setItem(KUNCI_PENYIMPANAN, baru).catch(() => {});
  }, []);

  const nilai = useMemo<NilaiTema>(() => {
    const skema: SkemaAktif =
      pilihan === "sistem"
        ? skemaSistem === "dark"
          ? "gelap"
          : "terang"
        : pilihan;
    return {
      pilihan,
      skema,
      warna: skema === "gelap" ? paletGelap : paletTerang,
      ubahTema,
    };
  }, [pilihan, skemaSistem, ubahTema]);

  return <TemaContext.Provider value={nilai}>{children}</TemaContext.Provider>;
}

export function useTema(): NilaiTema {
  return useContext(TemaContext);
}
