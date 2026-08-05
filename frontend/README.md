# Tracko Web & Android

Frontend Tracko menggunakan React/Vite. Versi Android development dibungkus
dengan Capacitor sehingga fitur web yang sama dapat dijalankan sebagai APK.

## Menjalankan web

```bash
npm install
npm run dev
```

## Konfigurasi backend Android

- APK memakai `https://dev.tracko.dsicorp.id/api` secara default.
- Transport HTTP native Capacitor diaktifkan agar request API Android tidak
  bergantung pada pembatasan CORS WebView.
- Alamat server dapat diubah dari layar login. Android Emulator dapat memakai
  `http://10.0.2.2:8000/api`; HP fisik dapat memakai IP LAN komputer, misalnya
  `http://192.168.1.10:8000/api`.
- Jalankan Laravel agar dapat diakses jaringan:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

- Pastikan firewall mengizinkan port 8000 dan origin Android tercantum pada
  `CORS_ALLOWED_ORIGINS` di `.env` backend.

## Build APK development

Prasyarat: JDK 17 serta Android SDK (platform 34 dan build-tools 34.0.0) tersedia.

```bash
npm run android:apk
```

APK dihasilkan pada:

`android/app/build/outputs/apk/debug/app-debug.apk`

Build ini ditandatangani dengan debug key dan ditujukan untuk instalasi internal,
bukan rilis resmi Play Store.
