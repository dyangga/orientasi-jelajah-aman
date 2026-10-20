# Jelajah Aman

Aplikasi cuaca dan kualitas udara berbasis Expo (React Native + TypeScript) yang bisa dipakai juga saat offline berkat cache SQLite.

## Status Data: cache-segar, cache-basi, dan first-run offline

**Cache-segar** berarti data tersimpan di perangkat berumur kurang dari 30 menit (TTL), sehingga aplikasi langsung memakainya tanpa memanggil internet. **Cache-basi** berarti umur data sudah 30 menit atau lebih dan internet gagal dijangkau, sehingga aplikasi tetap menampilkan data lama itu dengan label oranye "Mode offline - data tersimpan mungkin sudah usang". **First-run offline** berarti belum ada cache sama sekali dan internet juga tidak ada, sehingga tidak ada data yang bisa ditampilkan dan pengguna hanya melihat pesan error beserta tombol "Coba Lagi". Label status ini penting karena pengguna berhak tahu apakah angka suhu dan kualitas udara yang dilihat itu baru dari internet atau salinan lama, supaya tidak salah mengambil keputusan (misalnya soal udara yang tidak sehat) berdasarkan data yang sudah usang.

## Fitur Penyempurnaan UTS

1. **Ikon tab bar dan label navigasi** - tiap tab punya ikon Ionicons (`@expo/vector-icons`); tab Riwayat menjadi "Favorit & Riwayat".
2. **Riwayat pencarian** - maksimal 10 kota terakhir, disimpan di AsyncStorage; mengetuk riwayat menjalankan pencarian kota itu di Beranda.
3. **Hapus cache per kota** - tombol Hapus di daftar "Tersimpan di perangkat" dengan dialog konfirmasi (Alert di HP, `window.confirm` di web).
4. **Tema Terang / Gelap / Ikuti Sistem** - dipilih di Pengaturan, tersimpan, dan berlaku di semua layar.

Catatan platform: di HP cache memakai SQLite (`cacheRepository.ts`); di browser web dipakai `cacheRepository.web.ts` berbasis AsyncStorage dengan fungsi yang sama.

---

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
