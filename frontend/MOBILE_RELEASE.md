# Tracko Mobile Release

APK Android memakai bundle React yang sama dengan web, tetapi wajib dibangun
dengan mode `android` agar `.env.android` dan konfigurasi OTA ikut masuk.

## Changelog

### 1.1.0 (`versionCode 12`)

- Sinkron dengan UI web terbaru: navigasi, divisi, workspace, board, calendar,
  card detail, report, account settings, dan bahasa ID/EN.
- Report memakai tampilan Kinerja & QC terbaru, watermark PDF, preview tabel, dan
  riwayat download.
- Export PDF/Excel dan unduhan attachment memakai share sheet native sehingga
  file bisa disimpan di Android/iOS.
- Preview PDF di native dibuka melalui aplikasi pembaca di perangkat.
- Perbaikan kompatibilitas permission dan endpoint web terbaru.

## Release APK resmi

Versi publik terakhir: `1.1.0` (`versionCode 12`). Rilis berikutnya: naikkan
keduanya, misalnya `1.1.1` / `13`.

1. Samakan `package.json.version` dengan `android/app/build.gradle` `versionName`.
2. Naikkan `versionCode` setiap release APK.
3. Konfigurasikan environment signing berikut pada mesin build/CI:
   `TRACKO_ANDROID_KEYSTORE_PATH`, `TRACKO_ANDROID_KEYSTORE_PASSWORD`,
   `TRACKO_ANDROID_KEY_ALIAS`, dan `TRACKO_ANDROID_KEY_PASSWORD`.
4. Jalankan `npm run android:apk:release`.

Perintah release otomatis membangun bundle Android, melakukan Capacitor sync,
menghasilkan APK signed, menyalinnya ke `public/downloads/tracko-latest.apk`,
dan memperbarui `public/downloads/tracko-latest.json`.

Wrapper Gradle dipanggil melalui script lintas platform, sehingga perintah yang
sama dapat dijalankan di Windows maupun Linux server.

`npm run android:apk` hanya menghasilkan file debug
`tracko-latest-debug.apk` dan tidak boleh menggantikan APK resmi.

> APK 1.1.0 di `public/downloads` ditandatangani dengan sertifikat Android
> Debug (berbeda dari sertifikat 1.0.4). Update dari 1.0.4 ke 1.1.0 memerlukan
> uninstall sekali. Untuk rilis berikutnya, gunakan upload keystore resmi dan
> simpan agar update selanjutnya tidak perlu uninstall.

## OTA web bundle untuk APK terpasang

1. Konfigurasikan `MOBILE_UPDATE_PRIVATE_KEY` atau
   `MOBILE_UPDATE_PRIVATE_KEY_PATH` pada secret manager/CI. Jika tidak diset,
   script memakai `.mobile-update-keys/private.pem` (gitignored).
2. Jalankan `npm run build:ota`.
3. Deploy seluruh isi `dist`, termasuk `dist/mobile-updates/latest.json` dan
   ZIP bundle bertanda tangan, ke web server. `build:ota` mengembalikan
   `public/downloads` ke `dist/downloads` setelah ZIP dibuat, sehingga halaman
   download APK tetap berfungsi.

OTA hanya untuk perubahan bundle web. Perubahan plugin, manifest, permission,
atau kode native tetap memerlukan APK baru dan kenaikan `versionCode`.
