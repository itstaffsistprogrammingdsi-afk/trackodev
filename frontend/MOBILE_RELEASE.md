# Tracko Mobile Release

APK Android memakai bundle React yang sama dengan web, tetapi wajib dibangun
dengan mode `android` agar `.env.android` dan konfigurasi OTA ikut masuk.

## Release APK resmi

1. Samakan `package.json.version` dengan `android/app/build.gradle` `versionName`.
2. Naikkan `versionCode` setiap release APK.
3. Konfigurasikan environment signing berikut pada mesin build/CI:
   `TRACKO_ANDROID_KEYSTORE_PATH`, `TRACKO_ANDROID_KEYSTORE_PASSWORD`,
   `TRACKO_ANDROID_KEY_ALIAS`, dan `TRACKO_ANDROID_KEY_PASSWORD`.
4. Jalankan `npm run android:apk:release`.

Perintah release otomatis membangun bundle Android, melakukan Capacitor sync,
menghasilkan APK signed, menyalinnya ke `public/downloads/tracko-latest.apk`,
dan memperbarui `public/downloads/tracko-latest.json`.

`npm run android:apk` hanya menghasilkan APK debug versioned di
`artifacts/android` dan tidak boleh menggantikan APK resmi. Build Android juga
otomatis membuang APK lama dari web assets agar tidak terjadi APK bersarang.

## OTA web bundle untuk APK terpasang

1. Konfigurasikan `MOBILE_UPDATE_PRIVATE_KEY` atau
   `MOBILE_UPDATE_PRIVATE_KEY_PATH` pada secret manager/CI.
2. Jalankan `npm run build:ota`.
3. Deploy seluruh isi `dist`, termasuk `dist/mobile-updates/latest.json` dan
   ZIP bundle bertanda tangan, ke web server.

OTA hanya untuk perubahan bundle web. Perubahan plugin, manifest, permission,
atau kode native tetap memerlukan APK baru dan kenaikan `versionCode`.

## Push notification saat aplikasi tertutup

Push Android menggunakan Firebase Cloud Messaging (FCM). Sebelum build release:

1. Daftarkan aplikasi Android `id.dsicorp.tracko` di Firebase.
2. Simpan `google-services.json` ke `frontend/android/app/google-services.json`.
3. Simpan JSON service account Firebase pada server backend, di luar public web
   root, lalu isi `FIREBASE_PROJECT_ID` dan `FIREBASE_CREDENTIALS` di `.env`.
4. Jalankan migrasi backend dan pastikan queue worker selalu aktif.
5. Build APK baru; perubahan plugin push tidak dapat dikirim melalui OTA.

Jangan commit `google-services.json`, service-account JSON, keystore, atau kata
sandi signing ke repository.
