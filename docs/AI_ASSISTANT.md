# Asisten AI Tracko melalui 9router

## Analisis dan implementasi awal

Tracko menggunakan Laravel 12, Sanctum, Spatie Permission, React 19, dan memiliki API MCP untuk integrasi agen eksternal. Asisten di aplikasi menggunakan sesi pengguna aplikasi; credential MCP tidak diperlukan untuk fitur ini.

| Bagian | Kegunaan AI | Status |
| --- | --- | --- |
| Panel global | Menyusun brief, ide, dan langkah kerja dari pesan pengguna | Diimplementasikan |
| Detail card / task | Ringkasan, rekomendasi checklist, analisis deadline berdasarkan card terpilih | Diimplementasikan |
| Campaign / board | Ringkasan lintas card, risiko proyek, saran prioritas | Pengembangan berikutnya; memerlukan agregasi data berizin |
| Dashboard / laporan | Narasi hasil kerja dan analisis tren dari angka laporan | Pengembangan berikutnya; gunakan ReportScopeService dan data agregat |
| Form | Saran field, ringkasan submission, draft brief | Pengembangan berikutnya; gunakan ResourceAccess::form/submission |
| Chat | Rangkuman diskusi dan draft tindak lanjut | Pengembangan berikutnya; keanggotaan room dan izin pesan harus diperiksa |
| QC | Saran review berdasarkan hasil/lampiran | Pengembangan berikutnya; perlu ekstraksi/vision serta kebijakan file |

## Arsitektur

React -> POST /api/ai/messages -> Laravel -> 9router /v1/chat/completions -> provider model.

Panel “Asisten AI” tersedia di layout setelah login. Tombol “Tanya AI” di detail card memilih konteks langsung. Panel juga menyediakan pencarian judul card yang dapat diakses. Mengganti konteks memulai percakapan baru. Respons ditampilkan sebagai teks, tanpa menjalankan HTML dari model. Jawaban merupakan saran yang dapat disalin secara manual; tidak membuat/mengedit task atau mengirim pesan.

Endpoint:
- GET /api/ai/status: status konfigurasi lokal, bukan jaminan kesehatan provider.
- GET /api/ai/cards?query=...: maksimal 20 card terbaru; izin card.view/task.view dan visibilitas campaign/copy diterapkan.
- POST /api/ai/messages: message (maksimal 4.000 karakter), card_id opsional, conversation_id opsional. Tidak menerima history, system prompt, URL, model, atau key dari browser.

## Konfigurasi

Di backend/.env:

```dotenv
AI_ENABLED=true
AI_BASE_URL=http://localhost:20128/v1
AI_MODEL=cx/gpt-6-luna
AI_API_KEY=
```

Isi AI_MODEL sesuai ID model/combo dari instance 9router. Nilai contoh di atas ditemukan pada gateway lokal saat implementasi, bukan jaminan model tersedia di server lain. Isi AI_API_KEY dengan key gateway jika autentikasi diaktifkan. Jangan menaruh key di frontend/VITE_* atau commit .env.

Setelah perubahan konfigurasi: `php artisan config:clear` dari direktori backend. Saat produksi gunakan `php artisan config:cache` dan restart proses aplikasi yang berjalan lama. Gunakan cache yang mendukung penyimpanan lintas request, misalnya database atau Redis; store array tidak mempertahankan percakapan antar request.

9router harus berjalan dari sudut pandang server Laravel. localhost pada server produksi berarti mesin server, bukan laptop pengguna. Jangan membuka gateway tanpa autentikasi ke internet. Untuk server terpisah gunakan jaringan privat atau HTTPS dan key gateway.

Login/autentikasi akun ChatGPT dilakukan di provider 9router; tidak ada form password ChatGPT di Tracko. Akun Plus bukan credential gateway. Keberhasilan /models hanya membuktikan gateway dapat dihubungi, bukan bahwa inference/model atau kuota akun berhasil. Uji satu pesan setelah menghubungkan provider.

Dokumentasi resmi juga menjelaskan Sign in with ChatGPT dengan penggunaan plan untuk pengguna/aplikasi yang memenuhi syarat dan scope Responses API terpisah. Dukungan tersebut tidak otomatis berlaku untuk setiap gateway pihak ketiga. Implementasi ini mengikuti endpoint kompatibel OpenAI milik 9router, bukan mengimplementasikan OAuth OpenAI:
- https://developers.openai.com/siwc/quickstart
- https://github.com/decolua/9router/blob/master/gitbook/content/en/integration/other-tools.md

## Data dan batas akses

- Sanctum wajib untuk seluruh endpoint. Pesan dibatasi 10 request/menit melalui throttle Laravel.
- Konteks card dikirim hanya setelah izin card.view/task.view dan ResourceAccess::card lolos pada setiap permintaan. Copy lintas divisi memakai aturan CrossDivisionMirrorService.
- Data yang dikirim: judul, deskripsi teks (maks. 6.000 karakter), status, prioritas, deadline, tanggal selesai, nama board/campaign; maksimal 30 checklist jika checklist.view/task.view diizinkan. Batas item/teks berarti jawaban bukan analisis seluruh proyek.
- Tidak mengambil chat, lampiran, email, atau seluruh database. Tanpa pilihan card, model hanya menerima pesan dan riwayat percakapan tersebut.
- Riwayat disimpan sementara pada cache backend selama 30 menit setelah respons sukses, dipisahkan per user/UUID/card; maksimal tiga pasangan pesan terdahulu dikirim kembali. “Percakapan baru” berhenti memakai sesi lama; cache lama dihapus otomatis lewat TTL.
- Cache berisi teks percakapan; perlakukan cache sebagai data internal sensitif dan batasi aksesnya. Provider/gateway menerima pesan dan konteks terpilih; retensi mereka mengikuti konfigurasi serta kebijakan masing-masing.
- Log aplikasi hanya metadata sukses/gagal (user ID, card ID); key, prompt, respons, dan isi error gateway tidak dicatat oleh fitur ini.
- Timeout koneksi 5 detik; inference 60 detik; maksimal output 1.500 token. Tidak melakukan retry otomatis untuk menghindari pemakaian kuota ganda. Redirect gateway tidak diikuti.
- Prompt menginstruksikan model memperlakukan isi card sebagai data dan menyatakan keterbatasan; batas keamanan utama tetap akses backend dan ketiadaan alat mutasi.

## Verifikasi

`php artisan test --filter=AiAssistantTest` menggunakan gateway palsu untuk menguji autentikasi, disable, pemisahan riwayat, izin/konteks, copy privat, respons error, dan validasi. `npm run build:web` memeriksa TypeScript dan build frontend. Uji nyata gateway dilakukan dengan prompt sintetis tanpa data bisnis.

Jalankan `php scripts/ai-smoke.php` dari backend untuk memeriksa inference nyata. Pada verifikasi awal gateway menjawab HTTP 401 karena AI_API_KEY belum diisi; /models tetap dapat diakses. Isi key gateway lalu ulangi perintah ini. Konfigurasi lokal telah diaktifkan dengan URL pengguna dan model cx/gpt-6-luna. Tidak ada migrasi database tambahan untuk fitur ini.

Tahap selanjutnya yang paling bernilai: ringkasan campaign dari agregasi data berizin, narasi laporan dari angka yang dihitung backend, lalu draft tindakan dengan preview dan konfirmasi pengguna sebelum mutasi melalui controller/policy yang ada.
