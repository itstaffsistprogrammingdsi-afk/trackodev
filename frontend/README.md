# Tracko Web, Android, iOS & Signed OTA Updates

Frontend Tracko menggunakan React/Vite. Aplikasi Android dan iOS dibungkus
dengan Capacitor sehingga fitur yang sama dapat dijalankan sebagai APK/AAB
atau aplikasi iPhone/iPad.

Web dan aplikasi native memakai source yang sama, tetapi runtime tetap dipisahkan
melalui `Capacitor.isNativePlatform()`. Komponen mobile tidak dirender di browser,
sementara Android dan iOS memakai tampilan card serta navigasi mobile yang sama.

## Menjalankan web

```bash
npm install
npm run dev
```

`npm run build:web` membuat bundle web tanpa artefak OTA. `npm run build`
adalah perintah deployment produksi: bundle web dibuat, dikompres, diberi
checksum, ditandatangani RSA, lalu manifest OTA ditulis ke
`dist/mobile-updates/latest.json`.

## Konfigurasi backend mobile

- Android dan iOS memakai `https://dev.tracko.dsicorp.id/api` secara default.
- Transport HTTP native Capacitor diaktifkan agar request API mobile tidak
  bergantung pada pembatasan CORS WebView.
- Alamat server dapat diubah dari layar login. Android Emulator dapat memakai
  `http://10.0.2.2:8000/api`; HP fisik dapat memakai IP LAN komputer, misalnya
  `http://192.168.1.10:8000/api`. iOS Simulator memakai `http://localhost:8000/api`
  bila Laravel berjalan pada Mac yang sama.
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

## Build iOS development

Proyek Xcode berada di `ios/App/App.xcodeproj`. Apple mewajibkan build iOS
dijalankan pada macOS dengan Xcode. Dari Mac yang sudah memiliki Node.js dan
Xcode Command Line Tools:

```bash
npm ci
npm run ios:sync
npm run ios:open
```

Di Xcode, pilih target `App`, isi `Signing & Capabilities` dengan Apple Developer
Team perusahaan, pastikan bundle identifier `id.dsicorp.tracko` tersedia, pilih
iPhone/Simulator, lalu jalankan aplikasi. Versi iOS saat ini `1.0.0` dengan build
number `7`, sama dengan Android agar pemeriksaan kompatibilitas OTA konsisten.

Untuk perangkat fisik, HTTPS wajib digunakan. HTTP lokal hanya untuk development
dan memerlukan pengecualian App Transport Security yang sengaja tidak disertakan
dalam konfigurasi release.

## Update otomatis web ke aplikasi mobile

Android dan iOS tidak memakai `server.url`. Konfigurasi tersebut hanya cocok untuk
live reload development. Aplikasi selalu membawa bundle lokal sehingga tetap dapat dibuka
ketika server update atau jaringan tidak tersedia.

Saat aplikasi dibuka, `MobileLiveUpdate` melakukan hal berikut:

1. Menandai bundle aktif sebagai sehat untuk mekanisme rollback.
2. Mengambil manifest HTTPS dari `VITE_MOBILE_UPDATE_MANIFEST_URL`.
3. Memastikan `versionCode` native masih kompatibel.
4. Memverifikasi checksum dan signature RSA sebelum memasang bundle.
5. Memuat update pada startup. Jika update gagal, bundle lama tetap digunakan.

Update OTA hanya untuk HTML, CSS, JavaScript, dan aset web. Perubahan plugin,
permission, Gradle/Kotlin, Swift/Xcode, ikon, splash screen, atau native SDK wajib
dirilis sebagai APK/AAB atau versi TestFlight/App Store baru dengan build number
lebih tinggi.

### Kunci signing OTA

Public key `mobile-update-public.pem` disertakan dalam aplikasi Android dan iOS. Private key berada di
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

### Deployment web produksi

```bash
npm ci
npm run build
```

Perintah tersebut hanya membangun aplikasi web dan tidak memerlukan private key
OTA. Deploy seluruh isi `dist` secara atomik.

### Publikasi update OTA

Gunakan perintah berikut hanya ketika akan memublikasikan update web ke aplikasi
mobile yang sudah terpasang:

```bash
npm ci
npm run build:ota
```

`build:ota` membangun aplikasi web, lalu membuat bundle dan manifest yang telah
ditandatangani. Perintah ini wajib menerima `MOBILE_UPDATE_PRIVATE_KEY` atau
`MOBILE_UPDATE_PRIVATE_KEY_PATH`; kegagalan karena kunci tidak tersedia memang
disengaja agar paket OTA tanpa signature tidak pernah terpublikasi.

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

## Distribusi iOS

Release iOS memerlukan akun Apple Developer aktif, certificate distribution, dan
provisioning profile yang dikelola melalui Xcode. Setelah `npm run ios:sync`:

1. Buka proyek melalui `npm run ios:open` pada Mac.
2. Pilih target `App` dan konfigurasi `Signing & Capabilities`.
3. Pilih `Any iOS Device (arm64)`, lalu `Product > Archive`.
4. Dari Organizer, jalankan `Distribute App` ke TestFlight/App Store atau ekspor
   ad-hoc sesuai profil perusahaan.
5. Uji login, notifikasi, realtime, perpindahan card, background/resume, serta OTA
   pada iPhone fisik sebelum mengirim build ke client.

Apple tidak mengizinkan pembuatan atau penandatanganan `.ipa` final dari Windows.
Source dan proyek Xcode dapat disiapkan di platform mana pun, tetapi archive final
harus dibuat oleh Xcode di macOS atau CI macOS.
