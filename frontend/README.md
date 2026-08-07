# Tracko Web, Android & Signed OTA Updates

Frontend Tracko menggunakan React/Vite. Versi Android development dibungkus
dengan Capacitor sehingga fitur web yang sama dapat dijalankan sebagai APK.

Web dan APK memakai source yang sama, tetapi runtime tetap dipisahkan melalui
`Capacitor.isNativePlatform()`. Komponen khusus Android tidak akan dirender di
browser, sementara tampilan web tetap memakai komponen web yang sudah ada.

## Menjalankan web

```bash
npm install
npm run dev
```

`npm run build:web` membuat bundle web tanpa artefak OTA. `npm run build`
adalah perintah deployment produksi: bundle web dibuat, dikompres, diberi
checksum, ditandatangani RSA, lalu manifest OTA ditulis ke
`dist/mobile-updates/latest.json`.

## Konfigurasi backend Android

- APK memakai `https://dev.tracko.dsicorp.id/api` secara default.
- Transport HTTP native Capacitor diaktifkan agar request API Android tidak
  bergantung pada pembatasan CORS WebView.
- Alamat server dapat diubah dari layar login. Android Emulator dapat memakai
  `http://10.0.2.2:8000/api`; HP fisik dapat memakai IP LAN komputer, misalnya
  `http://192.168.1.10:8000/api`.
- Build produksi hanya menerima HTTPS. Untuk pengujian lokal HTTP di PowerShell,
  set `$env:CAPACITOR_ENV='development'` sebelum menjalankan `npm run android:sync`.
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

## Update otomatis web ke APK

APK tidak memakai `server.url`. Konfigurasi tersebut hanya cocok untuk live
reload development. APK selalu membawa bundle lokal sehingga tetap dapat dibuka
ketika server update atau jaringan tidak tersedia.

Saat aplikasi dibuka, `MobileLiveUpdate` melakukan hal berikut:

1. Menandai bundle aktif sebagai sehat untuk mekanisme rollback.
2. Mengambil manifest HTTPS dari `VITE_MOBILE_UPDATE_MANIFEST_URL`.
3. Memastikan `versionCode` native masih kompatibel.
4. Memverifikasi checksum dan signature RSA sebelum memasang bundle.
5. Memuat update pada startup. Jika update gagal, bundle lama tetap digunakan.

Update OTA hanya untuk HTML, CSS, JavaScript, dan aset web. Perubahan plugin
Capacitor, permission, Gradle, Kotlin, ikon, splash screen, atau native SDK wajib
dirilis sebagai APK/AAB baru dengan `versionCode` lebih tinggi.

### Kunci signing OTA

Public key `mobile-update-public.pem` disertakan dalam APK. Private key berada di
`.mobile-update-keys/private.pem`, diabaikan Git, dan wajib dicadangkan ke secret
manager perusahaan. Kehilangan private key berarti APK yang sudah beredar tidak
dapat menerima bundle OTA baru.

Untuk membuat pasangan kunci baru sebelum APK publik pertama dirilis:

```bash
npm run mobile:update:keygen
```

Jangan mengganti pasangan kunci setelah APK publik beredar. Pada CI, simpan isi
private key sebagai secret multiline `MOBILE_UPDATE_PRIVATE_KEY`, atau gunakan
`MOBILE_UPDATE_PRIVATE_KEY_PATH` yang menunjuk file sementara dari secret manager.

### Deployment produksi

```bash
npm ci
npm run build
```

Deploy seluruh isi `dist` secara atomik. File
`/mobile-updates/latest.json` harus memakai `Cache-Control: no-store`, sedangkan
file ZIP bernama hash dapat memakai `Cache-Control: public, max-age=31536000,
immutable`. Jangan pernah mempublikasikan `latest.json` sebelum file ZIP selesai
diunggah.

Untuk membatasi update pada binary tertentu, set
`MOBILE_UPDATE_MIN_NATIVE_VERSION_CODE` saat build. Nilai default saat ini `7`.
Operator juga dapat mengubah `enabled`, `maintenance`, dan `maintenanceMessage`
pada manifest untuk menghentikan rollout atau menampilkan maintenance mode.

## Build publik Android

Versi native publik saat ini adalah `1.0.0` dengan `versionCode 7`. Untuk release,
simpan Android upload keystore di secret manager dan sediakan seluruh environment
berikut pada mesin build:

```text
TRACKO_ANDROID_KEYSTORE_PATH=C:\secure\tracko-upload.jks
TRACKO_ANDROID_KEYSTORE_PASSWORD=...
TRACKO_ANDROID_KEY_ALIAS=tracko-upload
TRACKO_ANDROID_KEY_PASSWORD=...
```

Kemudian buat artefak distribusi:

```bash
npm run android:aab:release
npm run android:apk:release
```

AAB digunakan untuk Google Play. APK release digunakan untuk distribusi langsung.
Script akan berhenti sebelum Gradle dijalankan bila salah satu secret signing tidak
tersedia, sehingga binary publik tidak mungkin terbuat tanpa tanda tangan resmi.
