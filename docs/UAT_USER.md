# User Acceptance Test (UAT) — Tracko

**Dokumen:** UAT pengguna aplikasi Tracko<br>
**Versi:** 1.1<br>
**Tanggal baseline:** 31 Agustus 2026<br>
**Environment:** [https://dev.tracko.dsicorp.id/](https://dev.tracko.dsicorp.id/)<br>
**API:** `https://dev.tracko.dsicorp.id/api`<br>
**Platform:** Web desktop/mobile browser dan Android APK Tracko (target baseline saat ini: v1.0.4, versionCode 11; update angka ini bila build demo berubah).<br>
**Status dokumen:** Template eksekusi dan sign-off

Dokumen ini ditujukan untuk UAT role **user reguler**. Skenario yang membutuhkan hak admin/super admin diberi label **ADMIN-SETUP** atau **NEGATIVE** dan hanya digunakan untuk menyiapkan data serta memverifikasi pembatasan akses.

## 1. Tujuan dan ruang lingkup

UAT memverifikasi bahwa pengguna dapat:

- masuk dan keluar aplikasi dengan akun hasil sinkronisasi HRIS;
- melihat data yang memang menjadi kewenangannya;
- bekerja pada workspace, campaign, board, card, task, dan hasil pekerjaan;
- berkomunikasi melalui chat, komentar, notifikasi, dan mention;
- melihat produktivitas melalui My Work dan kalender;
- memperbarui profil, avatar, dan password sendiri;
- menggunakan fungsi board terbaru, termasuk pencarian card dan board mobile yang dapat di-scroll;
- tidak dapat membaca atau mengubah data di luar scope aksesnya.

UAT tidak menggantikan pengujian unit, integrasi, performance, security penetration, atau disaster recovery. Semua hasil API, realtime, dan sinkronisasi Web–Mobile yang terlihat oleh user tetap divalidasi melalui skenario di bawah.

## 2. Peran, akun, dan data uji

| Kode | Data uji | Tujuan |
|---|---|---|
| `U-01` | Akun user reguler hasil HRIS (nama dan email tersinkron) | Eksekusi utama seluruh skenario user |
| `U-02` | Akun user reguler lain dalam division/campaign yang sama | Menguji assignment, mention, chat, dan kolaborasi |
| `U-03` | Akun user dari division/campaign berbeda | Menguji pembatasan scope dan akses tidak sah |
| `A-01` | Akun admin/super admin | Menyiapkan division, workspace, campaign, board, master label/brand, dan data pembanding |
| `D-01` | Minimal 1 division yang boleh diakses `U-01` | Data navigasi Task Management |
| `W-01` | Minimal 1 workspace pada `D-01` | Data campaign |
| `C-01` | Campaign aktif dengan minimal 3 collaborator | Data board dan kolaborasi |
| `B-01` | Minimal 3 column/status, contoh To Do, In Progress, Done | Data Kanban/List dan perpindahan card |
| `K-01` | Minimal 10 card, termasuk judul unik, due date, priority, assignee, label, brand | Data pencarian, filter visual, dan detail card |
| `F-01` | File JPG/PNG/PDF dan satu URL hasil pekerjaan | Uji attachment dan preview/download |
| `F-02` | File brief JPG/PNG/PDF | Uji brief attachment |

Password dan token tidak ditulis di dokumen atau repository. Gunakan password default hasil prosedur sinkronisasi HRIS untuk login pertama, kemudian gunakan password baru yang disetujui tester. Siapkan juga satu password salah untuk skenario negatif.

### Status eksekusi

Gunakan status berikut pada kolom hasil:

- **PASS** — hasil aktual sesuai expected result;
- **FAIL** — hasil aktual berbeda atau ada defect;
- **BLOCKED** — tidak dapat diuji karena dependency/environment;
- **N/T** — belum dijalankan.

## 3. Matriks menu dan hak akses user

Menu ditampilkan berdasarkan permission akun. Daftar di bawah adalah baseline `user` saat ini; data aktual dapat lebih sempit jika scope division/campaign dibatasi.

| Menu/area | Route atau entry point | Hak user baseline | Fungsi yang diuji | Web | Mobile |
|---|---|---|---|:---:|:---:|
| Dashboard / **My Work** | `/my-work` (label sidebar Dashboard bila user tidak punya `dashboard.view`) | Lihat pekerjaan pribadi | Ringkasan task, completion rate, filter periode, movement feed, attachment kerja, export pribadi | ✓ | ✓ |
| Task Management — Divisions | `/divisions` | Lihat division yang diizinkan | Daftar division dan masuk ke workspace | ✓ | ✓ |
| Task Management — Workspace | `/divisions/:id` | Lihat workspace pada division yang diizinkan | Daftar, pencarian, buka workspace; tombol create/edit/delete hanya admin | ✓ | ✓ |
| Task Management — Campaigns | `/workspaces/:workspaceId/campaigns` | Lihat/buat/ubah/hapus campaign sesuai policy | Search, refresh, campaign baru, edit, hapus, kelola collaborator, buka detail/board | ✓ | ✓ |
| Campaign Detail | `/workspaces/:workspaceId/campaigns/:campaignId` | Lihat campaign yang diizinkan | Periode, statistik, progress board, Gantt, health, overdue (sesuai permission analitik) | ✓ | ✓ |
| Board | `/workspaces/:workspaceId/campaigns/:campaignId/boards` | Lihat dan kelola board/card sesuai permission | Kanban/List, column, card, drag/drop, status, card search, detail card | ✓ | ✓ |
| Calendar | `/calendar` | Lihat calendar dan detail pekerjaan | Navigasi tanggal/periode, daftar pekerjaan, buka card, buat card dari tanggal bila tersedia | ✓ | ✓ |
| Chats | `/chats` | Lihat room dan pesan; buat DM; kirim/hapus pesan sendiri | Room, pencarian/pilih user, pesan, read state | ✓ | ✓ |
| Notifications | Bell header atau `/notifications` | Notifikasi milik sendiri | Buka detail, mark one/read all, hapus | ✓ | ✓ |
| Akun saya | User dropdown → `/account/edit` | Kelola akun sendiri | Profil, avatar, password | ✓ | ✓ |
| Logout | User dropdown → Sign Out | Selalu tersedia | Hapus sesi dan kembali ke sign-in | ✓ | ✓ |

### Menu bersyarat dan bukan baseline user

| Area | Kondisi | UAT |
|---|---|---|
| Forms | Muncul jika akun memiliki `form.view`; create/builder/responses membutuhkan permission tambahan | Verifikasi tidak muncul/403 untuk user baseline; bila diberi permission, jalankan smoke test form sebagai add-on |
| Report & QC | Membutuhkan `report.view` | Verifikasi tidak muncul/403 untuk user baseline; eksekusi hanya oleh role yang disetujui |
| User Management/Profile | `/profile` membutuhkan `profile.view` dan umumnya admin | User baseline tidak boleh mengelola akun user lain |
| Dashboard global dan ranking | `dashboard.view`, `dashboard.division_ranking.view`, atau role admin | User baseline diarahkan ke My Work, bukan dashboard global |
| Create/edit/delete workspace dan master division | Hak admin/super admin | User baseline hanya melihat data yang diberikan |

### Ringkasan permission user baseline

Ini adalah ringkasan permission role `user` yang menjadi dasar expected result. Permission tambahan dapat diberikan secara eksplisit oleh administrator; jika diberikan, jalankan add-on UAT pada bagian 5.

| Modul | Hak user baseline |
|---|---|
| User mention | Cari user untuk collaborator, assignment, dan mention |
| Division | Lihat division dan anggota division |
| Workspace | Lihat workspace |
| Campaign | Lihat/buat/ubah/hapus campaign; lihat/tambah/hapus collaborator; lihat stats, progress, overdue, dan health |
| Board | Lihat/buat/ubah/reorder/hapus column/board |
| Card dan task | Lihat/buat/ubah/pindah/reorder/hapus card; assign/unassign; lihat aktivitas; task create/update/delete/assign |
| Label dan brand | Lihat/pasang/lepas/toggle label; lihat/pasang/lepas brand |
| Hasil dan brief | Lihat/upload/download/hapus attachment hasil; lihat/upload/download/hapus brief attachment |
| Kolaborasi card | Komentar lihat/tambah/ubah/hapus; checklist dan subtask lihat/buat/ubah/complete/reorder/hapus; template deskripsi lihat/buat |
| My Work | Lihat halaman, todo/aktivitas sendiri, attachment kerja, dan export pribadi |
| Calendar | Lihat kalender dan detail pekerjaan per tanggal |
| Chat | Lihat room/pesan, buat DM, kirim/hapus pesan, tandai sudah dibaca |
| Notifikasi | Lihat, read satu/read all, dan hapus notifikasi sendiri |
| Akun | Lihat/ubah profil sendiri, password, dan avatar |

## 4. Publish sebagai public form

Public questionnaire UAT dibuat idempotent melalui Artisan command. Jalankan di server backend setelah migration dan akun admin tersedia:

```bash
cd ~/trackodev/backend
php artisan app:create-uat-public-form
```

Command akan membuat atau memperbarui form dengan slug `uat-tracko-user`, menambahkan **200 field** yang mencakup seluruh menu, fungsi, dan fitur Tracko. Sebanyak **155 field** adalah pertanyaan status test case individual (bukan satu rating umum per menu), sedangkan sisanya adalah 17 heading section, metadata tester, kesiapan data, integritas/performa/recovery, jumlah dan severity defect, evidence upload/link, saran, serta keputusan sign-off. Form menggunakan navigasi section sehingga tester dapat berpindah per kelompok dan kembali ke section sebelumnya sebelum mengirim satu submission lengkap. Link berikut tetap sama setiap kali command dijalankan:

- **Link publik pengisian:** `https://dev.tracko.dsicorp.id/public/forms/uat-tracko-user`
- **Link response admin:** `https://dev.tracko.dsicorp.id/forms`

Jika URL deployment berbeda, gunakan nilai `FRONTEND_URL` pada backend; command akan menyesuaikan link yang dicetak. Submission publik tidak memerlukan login dan tersimpan sebagai response form. Admin dapat membuka menu Forms → Responses untuk meninjau hasil. Satu submission merepresentasikan satu sesi pengujian; tester dapat mengirim sesi lain menggunakan tombol **Isi jawaban lain**. Jangan menaruh password atau token pada jawaban.

### Cakupan exhaustive pada public form

| Section | Cakupan | Jumlah test case |
|---|---|---:|
| A | Landing page dan public form | 5 |
| B | Authentication dan navigasi umum | 15 |
| C | Dashboard user dan My Work | 14 |
| D | Division dan Workspace | 9 |
| E | Campaign, detail, analitik, dan collaborator | 13 |
| F | Board, column, Kanban/List, dan card search | 16 |
| G | Detail card, task, checklist, attachment, komentar | 18 |
| H | Calendar dan due date | 5 |
| I | Chat dan komunikasi realtime | 8 |
| J | Notifikasi | 5 |
| K | Profile, avatar, password, dan account | 6 |
| L | Mobile, realtime, dan konsistensi Web ↔ APK | 7 |
| M | Permission, scope, validasi, dan keamanan | 6 |
| N | Menu dan fungsi admin/super admin | 12 |
| O | Forms, builder, public response, dan forwarding | 7 |
| P | Report dan QC | 5 |
| Q | Kualitas umum dan usability | 4 |
| **Total** | **Pertanyaan status test case individual** | **155** |

## 5. Skenario UAT detail

### A. Autentikasi, sesi, dan navigasi umum

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| AUTH-01 | P0 | Login user valid; `U-01` aktif | Buka URL → pilih Sign In → isi email `U-01` dan password valid → klik Masuk | Login berhasil, token/sesi tersimpan, user diarahkan ke My Work atau route terakhir yang valid |  | N/T |
| AUTH-02 | P0 | Password salah tersedia | Isi email valid dan password salah → klik Masuk | Login ditolak; pesan error jelas; tidak ada akses ke halaman protected |  | N/T |
| AUTH-03 | P1 | Field login kosong | Kirim form tanpa email/password | Validasi field wajib tampil; request login tidak dikirim |  | N/T |
| AUTH-04 | P1 | Akun tidak aktif/tidak dikenal | Login dengan akun `U-03` atau akun yang dinonaktifkan | Login ditolak dengan pesan aman tanpa membocorkan detail internal |  | N/T |
| AUTH-05 | P1 | Sesi sudah login | Refresh browser, tutup-buka tab, lalu buka `/` | Sesi tetap valid selama token belum kedaluwarsa dan aplikasi membuka route aman terakhir |  | N/T |
| AUTH-06 | P0 | Token invalid/expired | Hapus atau invalidate token melalui environment uji → buka halaman protected | User diarahkan ke Sign In; data protected tidak tampil dan tidak ada loop redirect |  | N/T |
| AUTH-07 | P0 | Logout | Buka user dropdown → Sign Out → coba tombol Back/browser dan URL protected | Sesi dihapus, kembali ke Sign In/landing, halaman protected tidak dapat dibuka tanpa login |  | N/T |
| NAV-01 | P1 | User berhasil login | Periksa sidebar, header, breadcrumb, dan user dropdown | Menu yang tampil sesuai matriks role; nama/email/avatar benar; tidak ada menu admin baseline |  | N/T |
| NAV-02 | P1 | Desktop dan viewport kecil | Buka/tutup sidebar; resize ke mobile; gunakan tombol hamburger/backdrop | Navigasi tetap dapat dipakai, menu tidak tertutup oleh viewport, klik item menutup sidebar mobile |  | N/T |
| NAV-03 | P1 | Navigasi bertingkat | Buka Task Management → Divisions → Workspace → Campaigns → Detail → Board | Submenu membuka/menutup, item aktif benar, route dan breadcrumb sesuai entity yang dipilih |  | N/T |
| NAV-04 | P1 | Route invalid | Buka URL acak atau ID entity tidak ada | Halaman Not Found/empty state informatif; aplikasi tidak crash |  | N/T |

### B. My Work / Dashboard user

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| MYW-01 | P0 | `U-01` memiliki card/task | Buka My Work | Summary total, selesai, dan completion rate tampil dan hanya menghitung pekerjaan `U-01` sesuai scope |  | N/T |
| MYW-02 | P1 | Tersedia aktivitas pada beberapa tanggal | Ganti filter periode (harian/mingguan/bulanan/periode custom bila ada) | Data dan ringkasan berubah sesuai periode; loading/error state jelas |  | N/T |
| MYW-03 | P1 | Ada movement activity | Klik item movement feed | Detail card/campaign yang benar terbuka; perubahan status/aktivitas terlihat |  | N/T |
| MYW-04 | P1 | Ada attachment milik/terkait pekerjaan user | Gunakan panel attachment dan ubah periode | Daftar attachment sesuai periode dan akses user; link/file dapat dibuka atau di-download sesuai permission |  | N/T |
| MYW-05 | P1 | Data kerja tersedia | Jalankan export pribadi dari Export Log/Export report → cek file hasil | Export berhasil; filter tanggal/scope diterapkan; log export muncul dan file dapat dibaca |  | N/T |
| MYW-06 | P2 | Belum ada aktivitas | Login dengan user tanpa aktivitas | Empty state informatif; angka 0 ditampilkan; tidak ada error JavaScript |  | N/T |
| MYW-07 | P1 | User reguler bukan admin | Bandingkan dengan akun admin | Ranking/top user tidak tampil untuk user baseline kecuali permission ranking memang diberikan |  | N/T |

### C. Division dan Workspace

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| DIV-01 | P0 | `D-01` dapat diakses | Buka Divisions | Daftar division termuat; nama/metadata benar; hanya division dalam scope user yang dapat dibuka |  | N/T |
| DIV-02 | P1 | Banyak division | Gunakan pencarian/filter jika tersedia; buka satu division | Hasil konsisten, card division dapat dipilih, workspace division terbuka |  | N/T |
| DIV-03 | P1 | `U-01` anggota division | Buka detail/anggota division | Anggota dapat dilihat sesuai `division.member.view`; data nama/email tidak tertukar |  | N/T |
| DIV-04 | P1 | User baseline tidak punya hak admin division | Periksa tombol Create/Edit/Delete/Manage member | Tombol admin tidak tampil atau API menolak 403; user tidak dapat mengubah anggota/division |  | N/T |
| WSP-01 | P0 | `W-01` tersedia pada `D-01` | Klik Workspace | Daftar workspace termuat dan hanya workspace yang diizinkan yang tampil |  | N/T |
| WSP-02 | P1 | Banyak workspace | Cari berdasarkan nama/deskripsi; hapus kata kunci | Jumlah dan hasil pencarian berubah real-time di sisi UI; reset menampilkan semua data |  | N/T |
| WSP-03 | P1 | User baseline bukan admin | Periksa Workspace Baru, Edit, Delete | User dapat membuka workspace; tombol mutasi workspace tersembunyi/ditolak sesuai policy |  | N/T |
| WSP-04 | P0 | Workspace tidak diizinkan | Buka URL workspace milik `U-03` secara manual | API/route menolak akses, tidak ada data bocor, dan user mendapat halaman unauthorized/empty state yang sesuai |  | N/T |

### D. Campaign dan collaborator

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| CAM-01 | P0 | `W-01` memiliki campaign | Buka Campaigns | Campaign termuat dengan nama, deskripsi, tipe, jumlah member, dan due date yang benar |  | N/T |
| CAM-02 | P1 | Banyak campaign | Isi `Cari campaign...` dengan sebagian nama lalu kosongkan | Hanya campaign yang namanya cocok yang tampil; counter total akurat; empty state jelas bila tidak ada hasil |  | N/T |
| CAM-03 | P1 | API/cache perlu diperbarui | Klik Refresh Data | Loading indicator tampil singkat; data terbaru termuat tanpa duplikasi card campaign |  | N/T |
| CAM-04 | P0 | User memiliki `campaign.create` | Klik Campaign Baru → isi nama, deskripsi, tipe, due date → pilih collaborator → Create | Campaign tersimpan sekali, modal tertutup, list ter-refresh, collaborator dan due date benar |  | N/T |
| CAM-05 | P1 | Validasi form | Buka Campaign Baru → kosongkan nama atau masukkan due date lampau | Form mencegah submit atau server menolak dengan pesan validasi; tidak ada campaign kosong |  | N/T |
| CAM-06 | P0 | User memiliki `campaign.update` | Pilih Edit Campaign → ubah nama/deskripsi/due date → simpan → refresh | Perubahan tersimpan dan tetap ada setelah refresh/web–mobile reload |  | N/T |
| CAM-07 | P0 | User memiliki `campaign.delete`; gunakan campaign dummy | Klik Delete → batalkan konfirmasi, lalu ulangi dan konfirmasi | Cancel tidak menghapus; Confirm menghapus tepat campaign target dan list ter-update |  | N/T |
| CAM-08 | P0 | Collaborator HRIS tersedia | Buka Manage Collaborator → cari dengan nama dan email → pilih lebih dari satu user → Add | User yang dipilih masuk collaborator; tidak ada duplikasi; search menampilkan nama/email yang sesuai |  | N/T |
| CAM-09 | P0 | Validasi scope collaborator | Login/siapkan user yang bukan admin dan campaign pada division tertentu | User hanya dapat memilih collaborator yang diizinkan oleh policy campaign/division; user di luar scope tidak muncul atau API menolak |  | N/T |
| CAM-10 | P1 | Ada collaborator campaign | Buka Manage Collaborator → hapus satu member → konfirmasi | Member target terhapus, member lain tetap ada, dan perubahan terlihat setelah reload |  | N/T |
| CAM-11 | P0 | Campaign milik `U-03` | Akses detail/list campaign melalui URL langsung | Akses ditolak; tidak ada nama, anggota, statistik, atau board yang bocor |  | N/T |
| CAM-12 | P1 | Campaign memiliki data board | Buka View Details | Periode campaign dan widget statistik/progress/Gantt/health/overdue tampil sesuai permission dan konsisten dengan board |  | N/T |

### E. Board, column, card, dan pencarian card

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| BRD-01 | P0 | `B-01` tersedia | Buka Board dari campaign | Board tampil tanpa error; seluruh column dan jumlah card benar |  | N/T |
| BRD-02 | P1 | Board memiliki beberapa column | Ganti Kanban ↔ List | Kanban menampilkan column/card; List menampilkan card terstruktur; data dan urutan sama |  | N/T |
| BRD-03 | P1 | User memiliki `board.create` | Klik Column/Tambah Column → isi nama dan warna → simpan | Column baru muncul satu kali dengan nama/warna benar |  | N/T |
| BRD-04 | P1 | User memiliki `board.update` | Buka menu column → Edit Column → ubah data → simpan | Nama/warna column berubah dan bertahan setelah reload |  | N/T |
| BRD-05 | P1 | Board dummy dapat dihapus | Buka menu column → Delete → batalkan lalu konfirmasi | Cancel aman; Confirm menghapus column target sesuai aturan server dan meminta konfirmasi yang jelas |  | N/T |
| BRD-06 | P1 | Ada minimal 3 column | Drag column ke urutan baru → refresh | Urutan column tersimpan; column terkunci/system tidak dapat dipindahkan bila aturan menguncinya |  | N/T |
| BRD-07 | P0 | `K-01` tersedia | Klik Tambah Task Baru → isi judul, due date, priority, assignee → Buat Task | Card tersimpan pada column target; metadata benar; tidak ada duplikasi saat klik/Enter berulang |  | N/T |
| BRD-08 | P1 | Validasi card | Coba buat card tanpa judul, lalu tekan Escape/Batal | Card kosong tidak dibuat; form dapat dibatalkan dan state bersih |  | N/T |
| BRD-09 | P0 | Card dapat dipindahkan | Drag card antar-column (web) atau gunakan pilihan status pada mobile | Card berpindah ke status target; reload dan platform lain menampilkan status yang sama |  | N/T |
| BRD-10 | P1 | Ada beberapa card satu column | Drag card dalam column → refresh | Urutan card tersimpan sesuai posisi baru |  | N/T |
| BRD-11 | P0 | Fitur search card terbaru | Isi `Cari nama card...` dengan kata kunci unik | Hanya card yang judulnya cocok yang tampil pada column terkait; counter `x dari y card` akurat; column tanpa hasil menampilkan empty state |  | N/T |
| BRD-12 | P1 | Search aktif | Uji huruf besar/kecil, spasi awal/akhir, kata kunci tidak ditemukan, tombol X dan Escape | Pencarian case-insensitive, spasi dinormalisasi, hasil 0 informatif, clear mengembalikan semua card |  | N/T |
| BRD-13 | P1 | Search aktif | Coba drag card/column saat hasil terfilter | Drag dinonaktifkan/ditangani aman selama search sehingga tidak mengubah urutan berdasarkan daftar parsial |  | N/T |
| BRD-14 | P0 | Card memiliki detail | Klik card | Modal detail membuka dengan title, board, member, brand, label, priority, due date, description, task, attachment, comment, dan activity |  | N/T |
| BRD-15 | P1 | Board kosong atau API error | Buka board tanpa column/putuskan API pada environment test | Empty/loading/error state informatif; tidak ada halaman putih atau crash |  | N/T |

### F. Detail card, task, checklist, dan assignment

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| CARD-01 | P0 | Card detail terbuka | Ubah title, tekan Enter/blur, kemudian reload | Title tersimpan sekali dan tampil di board, detail, dashboard, dan mobile |  | N/T |
| CARD-02 | P0 | User memiliki `card.update` | Ubah description; tutup modal; buka kembali | Description tersimpan; pending save selesai sebelum modal ditutup; error ditampilkan bila gagal |  | N/T |
| CARD-03 | P1 | User memiliki `card.assign`/`card.unassign` | Buka member picker → cari `U-02` → assign; lalu unassign | Assignee bertambah/berkurang sesuai target; avatar dan notifikasi assignment benar |  | N/T |
| CARD-04 | P1 | User memiliki `card.move` | Gunakan move target dari card pada mobile | Status card berubah ke board target; board asal/tujuan dan activity log benar |  | N/T |
| CARD-05 | P1 | Priority tersedia | Ubah priority (low/medium/high/urgent bila ada) | Warna/label priority berubah dan tersimpan di semua tampilan |  | N/T |
| CARD-06 | P1 | Due date tersedia | Set, ubah, dan hapus due date | Due date tampil sesuai timezone; status on-track/due-soon/overdue konsisten; card overdue diperlakukan sesuai policy delete |  | N/T |
| CARD-07 | P0 | User memiliki task/checklist permission | Tambah task/checklist → tandai selesai → ubah/reorder → hapus dummy | Counter dan progress berubah benar; state selesai bertahan setelah reload; delete meminta konfirmasi bila ada |  | N/T |
| CARD-08 | P1 | Subtask tersedia | Tambah, edit, complete, dan hapus subtask | Subtask tersimpan pada parent yang benar; completion tidak mengubah card lain |  | N/T |
| CARD-09 | P1 | Label master tersedia | Buka Labels → cari/pasang label → lepas/toggle label | Label yang dipilih terpasang/terlepas tanpa duplikasi; warna/nama benar |  | N/T |
| CARD-10 | P1 | Brand master tersedia | Buka Brands → pasang dan lepas brand | Brand card berubah sesuai pilihan; user tidak dapat mengubah master brand tanpa permission |  | N/T |
| CARD-11 | P0 | Komentar diizinkan | Tulis komentar → kirim → edit/hapus komentar milik sendiri | Komentar tampil dengan author/time yang benar; edit/hapus mengikuti policy; komentar user lain tidak dapat diubah sembarang |  | N/T |
| CARD-12 | P0 | `F-02` tersedia | Upload, preview/download, dan hapus brief attachment dummy | File tersimpan pada Brief Attachments, dapat diakses user yang berhak, delete hanya target yang dipilih |  | N/T |
| CARD-13 | P0 | `F-01` tersedia | Upload hasil file dan URL → isi result description/quantity bila tersedia → preview/download → hapus dummy | File/link tersimpan sebagai Result Attachment; metadata benar; file rusak/tipe tidak didukung ditolak dengan pesan jelas |  | N/T |
| CARD-14 | P1 | Template deskripsi tersedia | Pilih/buat template result description bila permission ada | Template dapat dipakai tanpa menghapus input lain; user tanpa permission tidak melihat tombol create |  | N/T |
| CARD-15 | P1 | Activity tersedia | Buka Activity Timeline → Load more | Riwayat perubahan, actor, dan waktu benar; pagination/load more tidak menggandakan item |  | N/T |
| CARD-16 | P1 | Card detail mobile | Buka detail card di APK → buka Card tools → tutup dengan X, backdrop, dan tombol Back | Modal, bottom sheet, focus, dan scroll dapat digunakan; perubahan tersimpan sebelum ditutup |  | N/T |
| CARD-17 | P0 | Card tidak boleh terhapus oleh aturan bisnis tertentu | Coba hapus card overdue atau card tanpa hak | Tombol/API menolak sesuai policy; card tetap ada dan alasan penolakan terlihat |  | N/T |

### G. Calendar

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| CAL-01 | P0 | Ada card dengan due date | Buka Calendar | Kalender memuat pekerjaan dalam scope user dengan tanggal, judul, status, dan warna yang benar |  | N/T |
| CAL-02 | P1 | Navigasi tanggal tersedia | Pindah bulan/minggu/hari dan kembali ke hari ini | Data berubah sesuai periode dan tidak hilang setelah navigasi |  | N/T |
| CAL-03 | P1 | Ada pekerjaan pada tanggal tertentu | Klik event/tanggal | Detail pekerjaan/card yang benar terbuka; unauthorized card tidak dapat dibuka |  | N/T |
| CAL-04 | P1 | Fitur create dari calendar tersedia | Klik tanggal kosong → isi card minimal, board, priority/due date → simpan | Card dibuat pada board/status yang dipilih dan muncul di calendar serta board |  | N/T |
| CAL-05 | P1 | Web–mobile memakai data sama | Ubah due date/status dari board web → buka Calendar mobile, dan sebaliknya | Calendar merefleksikan data terbaru setelah realtime/refetch atau refresh yang disepakati |  | N/T |

### H. Chat dan komunikasi

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| CHAT-01 | P0 | `U-01` dan `U-02` aktif | Buka Chats | Daftar room dan unread count tampil; user hanya melihat room yang diizinkan |  | N/T |
| CHAT-02 | P1 | `chat.room.create` tersedia | Buat direct message dengan `U-02` | Room dibuat satu kali dan terbuka pada recipient yang benar |  | N/T |
| CHAT-03 | P0 | Room tersedia | Kirim pesan teks; tekan Enter sesuai perilaku UI | Pesan tampil sekali dengan author/time benar pada pengirim dan penerima |  | N/T |
| CHAT-04 | P1 | Pesan milik user | Hapus pesan sendiri; coba hapus pesan user lain | Pesan sendiri terhapus/ditandai sesuai policy; pesan orang lain ditolak |  | N/T |
| CHAT-05 | P1 | Room memiliki unread message | Buka room lalu kembali ke daftar | Read state dan unread badge berubah konsisten di web/mobile |  | N/T |
| CHAT-06 | P1 | Koneksi realtime tersedia | Kirim pesan dari web → amati mobile (dan sebaliknya) | Pesan muncul tanpa refresh manual dalam batas waktu yang disepakati; jika realtime gagal, fallback/refetch tetap aman |  | N/T |
| CHAT-07 | P1 | API/network error | Putuskan koneksi saat kirim pesan | Pesan tidak mengganda; error/retry terlihat; draft tidak hilang bila UI menjanjikan penyimpanannya |  | N/T |

### I. Notifikasi

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| NOTIF-01 | P0 | Ada notifikasi assignment/comment/chat | Klik bell header | Dropdown menampilkan unread count dan item notifikasi milik user |  | N/T |
| NOTIF-02 | P1 | Ada notifikasi actionable | Klik notifikasi | Notifikasi ditandai read dan mengarahkan ke card/campaign/chat target yang benar |  | N/T |
| NOTIF-03 | P1 | Banyak unread | Pilih Mark all as read | Semua notifikasi milik user menjadi read; badge menjadi 0 setelah refresh |  | N/T |
| NOTIF-04 | P1 | Ada notifikasi dummy | Hapus satu notifikasi | Hanya item target terhapus; item lain tetap ada |  | N/T |
| NOTIF-05 | P1 | Web–mobile aktif | Buat assignment/comment dari platform lain | Notifikasi muncul pada platform penerima sesuai realtime/refetch dan tidak menggandakan item |  | N/T |

### J. Profil, avatar, password, dan logout

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| ACC-01 | P0 | `account.view` tersedia | User dropdown → Edit profile | Halaman akun menampilkan data akun sendiri; user tidak melihat form edit akun lain |  | N/T |
| ACC-02 | P1 | `account.update` tersedia | Ubah nama/profil yang diperbolehkan → simpan → refresh | Perubahan tersimpan, header/avatar context ikut diperbarui, email HRIS tidak berubah bila read-only |  | N/T |
| ACC-03 | P1 | `account.avatar.update` tersedia | Upload avatar valid → refresh web/mobile | Avatar tampil konsisten; file invalid/terlalu besar ditolak |  | N/T |
| ACC-04 | P0 | `account.password.update` tersedia | Masukkan password lama benar, password baru memenuhi rule, konfirmasi sama → simpan | Password berubah; sesi tetap/berakhir sesuai policy; password lama tidak dapat dipakai dan password baru dapat login |  | N/T |
| ACC-05 | P1 | Validasi password | Password lama salah, password baru pendek, atau konfirmasi beda | Update ditolak dengan pesan validasi; password existing tetap aman |  | N/T |
| ACC-06 | P0 | Logout | Sign Out dari web dan APK | Token lokal dibersihkan; route protected tidak bisa dibuka; login screen tampil |  | N/T |

### K. Sinkronisasi realtime dan konsistensi Web–Mobile

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| SYNC-01 | P0 | Web dan APK login sebagai user/collaborator berbeda | Buat campaign/board/card dari web → buka atau refresh mobile | Entity baru muncul di mobile sesuai scope, tanpa perlu reinstall APK |  | N/T |
| SYNC-02 | P0 | Web dan APK aktif pada campaign sama | Ubah status/card dari mobile → amati web | Web menerima perubahan melalui realtime atau refetch fallback dalam batas waktu yang disepakati |  | N/T |
| SYNC-03 | P0 | Realtime Reverb aktif | Buat card/komentar/assignment dari web → amati mobile | Event tidak hilang, tidak dobel, dan hanya dikirim ke user/channel berhak |  | N/T |
| SYNC-04 | P1 | Realtime sementara gagal | Matikan koneksi/realtime sementara, lakukan perubahan, pulihkan koneksi, refresh | UI tidak crash; data server menjadi sumber kebenaran setelah retry/refetch |  | N/T |
| SYNC-05 | P0 | Board memiliki >1 card per column | Buka Board di APK → scroll vertikal dalam column → buka card bagian bawah | Seluruh card dapat di-scroll dan dipilih; card tidak tertutup header/footer dan tidak mengubah urutan tanpa aksi |  | N/T |
| SYNC-06 | P0 | Board memiliki banyak card | Gunakan card search di APK dengan kata kunci unik → clear search | Hasil search sama dengan web, counter akurat, dan board berpindah ke status pertama yang memiliki hasil bila diperlukan |  | N/T |
| SYNC-07 | P1 | Build APK kandidat demo | Install/update APK di device UAT → login → cek version/update manifest | APK dapat terpasang di atas versi sebelumnya, membuka API environment benar, dan menampilkan fitur source terbaru |  | N/T |

### L. Keamanan dan permission (negative test)

| ID | Prioritas | Skenario dan prasyarat | Langkah uji | Expected result | Aktual | Status |
|---|:---:|---|---|---|---|---|
| SEC-01 | P0 | User baseline | Akses `/profile`, `/reports`, `/forms/create`, atau endpoint admin secara manual | Route/menu tidak memberi akses; response 401/403 atau redirect yang sesuai; tidak ada data sensitif |  | N/T |
| SEC-02 | P0 | ID entity milik `U-03` diketahui | Ganti ID division/workspace/campaign/board/card pada URL/request | Server tetap menolak berdasarkan policy, bukan hanya menyembunyikan tombol di UI |  | N/T |
| SEC-03 | P1 | Input teks/file tersedia | Masukkan HTML/script, nama sangat panjang, karakter unicode, URL invalid, file unsupported | Input disanitasi/divalidasi; tidak ada XSS; pesan error aman dan data lain tidak rusak |  | N/T |
| SEC-04 | P1 | Hak mutasi dicabut sementara | Cabut permission user atau gunakan user read-only → coba create/update/delete/assign | UI menyembunyikan/menonaktifkan aksi dan API menolak; tidak ada optimistic state yang tersisa setelah refresh |  | N/T |
| SEC-05 | P1 | User mencoba mengubah resource orang lain | Edit/hapus komentar, attachment, pesan, atau card yang bukan kewenangannya | Hanya aksi yang policy izinkan berhasil; server menolak aksi lain dan audit tidak berubah |  | N/T |
| SEC-06 | P0 | Browser storage tersedia | Logout → periksa route protected dan local storage token/user secara aman | Token tidak dapat dipakai kembali; tidak ada data akun user sebelumnya yang tampil pada login user berikutnya |  | N/T |

## 6. Add-on UAT untuk menu bersyarat

Jalankan bagian ini hanya jika stakeholder memang memberikan permission tambahan kepada akun user. Ini menjaga dokumen tetap lengkap tanpa mengubah baseline role user.

| ID | Modul | Skenario minimum | Expected result |
|---|---|---|---|
| ADD-FORM-01 | Forms | Buat form, tambah/ubah/hapus field, simpan, buka public form | Form dan field tersimpan; public link dapat dibuka; validasi field bekerja |
| ADD-FORM-02 | Form responses | Kirim submission, buka responses, expand row, assign/forward, export | Response benar, assignment/forward tepat, export dapat dibaca |
| ADD-REPORT-01 | Report & QC | Filter user/division/workspace/campaign → preview → export PDF/Excel → submit QC | Filter diterapkan, file valid, QC/audit tercatat |
| ADD-ADMIN-01 | User Management | Lihat user HRIS, search, edit role/permission, reset password | Hanya admin; perubahan permission efektif pada login/refresh berikutnya |
| ADD-ADMIN-02 | Division admin | Buat/edit/hapus division, kelola anggota dan role anggota | Hanya admin; anggota dan scope akses berubah sesuai policy |
| ADD-ADMIN-03 | Workspace admin | Buat/edit/hapus workspace | Hanya admin; campaign pada workspace tidak ikut terhapus tanpa konfirmasi/policy yang benar |

## 7. Data aktual dan defect log

Isi bagian ini saat eksekusi. Setiap FAIL/BLOCKED harus memiliki bukti (screenshot, waktu, URL/route, akun/role, request ID atau log bila ada).

| ID test | Tanggal/jam | Tester | Platform/browser/device | Hasil aktual | Severity | Link bukti/tiket | Status retest |
|---|---|---|---|---|:---:|---|---|
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |

**Severity:** P0 blocker/kritis, P1 tinggi, P2 sedang, P3 rendah.

## 8. Kriteria kelulusan dan sign-off

UAT dinyatakan **LULUS** apabila:

1. seluruh skenario P0 berstatus PASS;
2. tidak ada defect P0/P1 yang masih open atau workaround-nya belum disetujui;
3. data utama konsisten antara web dan APK, khususnya login, campaign, board/card, search card, scroll mobile, komentar, assignment, notifikasi, dan due date;
4. negative test permission tidak menunjukkan kebocoran data atau bypass API;
5. stakeholder menyetujui bukti dan hasil retest.

### Ringkasan hasil

| Ringkasan | Nilai |
|---|---:|
| Total skenario baseline terdokumentasi (AUTH–SYNC–SEC) | 106 |
| Test case individual pada public form exhaustive | 155 |
| Total field public form (termasuk metadata, section, dan sign-off) | 200 |
| PASS |  |
| FAIL |  |
| BLOCKED |  |
| N/T |  |
| Defect P0/P1 open |  |
| Keputusan | LULUS / LULUS DENGAN CATATAN / TIDAK LULUS |

### Persetujuan

| Peran | Nama | Tanggal | Tanda tangan/catatan |
|---|---|---|---|
| Tester/QA |  |  |  |
| Perwakilan user bisnis |  |  |  |
| Product owner |  |  |  |
| Technical lead |  |  |  |
