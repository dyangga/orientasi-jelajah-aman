// metro.config.js
// Diperlukan agar expo-sqlite bisa jalan di web (WASM + SharedArrayBuffer).
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Izinkan Metro memuat file .wasm sebagai aset
config.resolver.assetExts.push("wasm");

// Header yang dibutuhkan SharedArrayBuffer pada dev server
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    middleware(req, res, next);
  };
};

module.exports = config;
