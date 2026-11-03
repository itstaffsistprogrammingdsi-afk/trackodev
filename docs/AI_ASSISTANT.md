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

Panel “Asisten AI” tersedia di layout setelah login. Tombol “Tanya AI” di detail card memilih konteks langsung. Panel membaca konteks halaman (`/divisions/:id`, `/workspaces/:id/campaigns`, `/workspaces/:id/campaigns/:id`) dan konteks card. Mengganti konteks memulai percakapan baru. Respons ditampilkan sebagai teks, tanpa menjalankan HTML dari model.

Asisten dapat mengusulkan tindakan melalui MCP internal: membuat workspace, campaign, board, card, checklist, serta memperbarui card/checklist. Setiap proposal menampilkan target dan perubahan; eksekusi baru berjalan setelah pengguna menekan “Setujui & jalankan”. Tidak ada perubahan otomatis.

Untuk pertanyaan lintas modul, asisten memakai alat baca `baca_tracko`: ranking penyelesai task (termasuk bulan lalu), ringkasan dashboard, pencarian card, card terlambat, detail card, pencarian division/workspace/campaign/board/user, dan statistik campaign. Hasil alat baca dibatasi izin pengguna dan dikirim kembali ke gateway sebagai data jawaban.

`create_workspace` dapat diusulkan tanpa membuka halaman division: asisten boleh mengirim nama division atau `division_id`. Backend mencocokkan nama dengan toleransi typo ringan hanya pada division yang boleh dikelola pengguna, lalu tetap memeriksa permission dan ulang saat persetujuan.

System prompt membatasi asisten pada topik dan tindakan di dalam Tracko. Permintaan di luar sistem ditolak dengan pola jawaban tetap: “Maaf, saya hanya dapat membantu hal-hal terkait Tracko dan pekerjaan di sistem ini.” Pembatasan ini adalah guardrail prompt, bukan klasifikasi intent di backend.

Respons dinormalisasi menjadi teks biasa agar tidak menampilkan penanda Markdown mentah: `**`, `__`, backtick, heading, tautan Markdown, dan tabel pipa diubah atau dihapus; tabel menjadi baris dengan pemisah “—”. Frontend juga menerapkan normalisasi saat render sebagai lapisan kedua.

Endpoint:
- GET /api/ai/status: status konfigurasi lokal, bukan jaminan kesehatan provider.
- GET /api/ai/cards?query=...: maksimal 20 card terbaru; izin card.view/task.view dan visibilitas campaign/copy diterapkan.
- POST /api/ai/messages: message (maksimal 4.000 karakter), card_id/board_id/campaign_id/workspace_id/division_id opsional, conversation_id opsional. Backend memvalidasi hierarki dan akses setiap konteks. Tidak menerima history, system prompt, URL, model, atau key dari browser.
- POST /api/ai/proposals/{id}/approve dan /reject: hanya pemilik proposal; eksekusi memakai MCP internal dengan aktor pengguna, permission, policy resource, audit, dan idempotency yang sama seperti MCP eksternal.

Operasi proposal yang didukung: `create_workspace`, `update_workspace`, `create_campaign`, `update_campaign`, `create_board`, `update_board`, `create_card`, `update_card`, `assign_card`, `unassign_card`, `comment_card`, `move_card`, `add_checklist_item`, `update_checklist_item`, `set_checklist_status`. Operasi ditawarkan bila permission pengguna mencukupi; ID target diambil dari alat baca, bukan dikarang model.

Cakupan yang sengaja belum diekspos ke asisten: hapus workspace/campaign/board/card/checklist, manajemen user dan permission, chat, form dan submission, upload/download attachment, notifikasi, serta export report. Alasan utamanya risiko destruktif, data percakapan/pribadi, atau alur file/ekspor yang tidak cocok dijalankan lewat chat. Jika dibutuhkan, operasi tersebut harus ditambahkan eksplisit dengan approval dan audit yang sama.

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
- Data yang dikirim: judul, deskripsi teks (maks. 6.000 karakter), status, prioritas, deadline, tanggal selesai, nama board/campaign; maksimal 30 checklist jika checklist.view/task.view diizinkan. Nama division/workspace/campaign/board dari konteks halaman juga dikirim. Batas item/teks berarti jawaban bukan analisis seluruh proyek.
- Tidak mengambil chat, lampiran, email, atau seluruh database. Tanpa pilihan card, model hanya menerima pesan, riwayat, dan nama konteks halaman yang sedang dibuka (jika ada).
- Saat alat baca dipakai, hasil yang dikirim ke gateway mencakup agregat sesuai izin dan dapat memuat nama user pada ranking, judul card, status, prioritas, deadline, board, campaign, workspace, assignee, label, brand, serta checklist. Batas hasil: 10 ranking, 20 hasil pencarian/daftar, 50 checklist per detail card.
- Riwayat disimpan sementara pada cache backend selama 30 menit setelah respons sukses, dipisahkan per user/UUID/card; maksimal tiga pasangan pesan terdahulu dikirim kembali. “Percakapan baru” berhenti memakai sesi lama; cache lama dihapus otomatis lewat TTL.
- Cache berisi teks percakapan; perlakukan cache sebagai data internal sensitif dan batasi aksesnya. Provider/gateway menerima pesan dan konteks terpilih; retensi mereka mengikuti konfigurasi serta kebijakan masing-masing.
- Log aplikasi hanya metadata sukses/gagal (user ID, card ID); key, prompt, respons, dan isi error gateway tidak dicatat oleh fitur ini.
- Timeout koneksi 5 detik; inference 60 detik; maksimal output 1.500 token. Tidak melakukan retry otomatis untuk menghindari pemakaian kuota ganda. Redirect gateway tidak diikuti.
- Prompt menginstruksikan model memperlakukan isi card sebagai data dan menyatakan keterbatasan; batas keamanan utama tetap akses backend dan ketiadaan alat mutasi.

## Verifikasi

`php artisan test --filter=AiAssistantTest` menggunakan gateway palsu untuk menguji autentikasi, disable, pemisahan riwayat, izin/konteks, copy privat, respons error, validasi, pembacaan hierarchy/card/user/statistik, proposal create/update workspace-campaign-board-card, assign/unassign, komentar, pindah card, checklist, sampai eksekusi MCP. `npm run build:web` memeriksa TypeScript dan build frontend. Uji nyata gateway dilakukan dengan prompt sintetis tanpa data bisnis.

Jalankan `php scripts/ai-smoke.php` dari backend untuk memeriksa inference nyata. Jika gateway mewajibkan autentikasi, isi `AI_API_KEY`; `/v1/models` dapat berhasil meski inference belum tentu. Konfigurasi aktif memakai gateway 9router HTTPS dan model yang dipilih administrator. Tidak ada migrasi database tambahan untuk fitur ini.

Tahap selanjutnya yang masih terbuka: label/brand, subtask lanjutan, attachment, form, chat, notifikasi, manajemen user, dan export report. Area tersebut belum diekspos karena risiko destruktif, data pribadi/percakapan, atau alur file yang lebih cocok ditangani di UI khusus.
