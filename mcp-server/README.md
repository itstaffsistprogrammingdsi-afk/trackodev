# Traco Collaboration MCP

MCP server ini menjadi bridge aman antara Discord AI agent dan Traco. Server tidak mengakses database secara langsung; seluruh operasi melewati API Laravel khusus MCP dan tetap dievaluasi sebagai user Traco yang identitas Discord-nya sudah diverifikasi.

Implementasi memakai MCP TypeScript SDK v2 dan mendukung dua transport:

- `stdio` untuk agent/bot yang menjalankan MCP sebagai child process.
- Streamable HTTP stateless di `/mcp` untuk agent yang berjalan terpisah.

Panduan integrasi end-to-end untuk Discord bot dan AI agent tersedia di
[`docs/MCP_DISCORD_INTEGRATION.md`](../docs/MCP_DISCORD_INTEGRATION.md),
termasuk daftar seluruh tool, contoh `/traco whoami`, payload, deployment,
dan troubleshooting.

## Arsitektur keamanan

```text
Discord event
  -> Discord gateway menandatangani actor context (HMAC, TTL singkat)
  -> MCP server memverifikasi signature, expiry, dan optional guild allow-list
  -> Laravel MCP API memverifikasi service credential
  -> Discord ID dipetakan ke user Traco yang sudah linked
  -> permission + membership Traco diperiksa
  -> mutation disimpan dengan idempotency key
  -> request dicatat di mcp_audit_logs
```

Credential memiliki fungsi yang terpisah:

1. `MCP_HTTP_BEARER_TOKEN` melindungi endpoint MCP dari client yang tidak dikenal.
2. `DISCORD_ACTOR_SIGNING_SECRET` membuktikan actor berasal dari Discord gateway tepercaya, bukan dari prompt user.
3. `TRACO_MCP_API_KEY` mengautentikasi MCP server ke Laravel. Credential ini tidak menentukan akses data user.

Jangan memasukkan ketiga secret tersebut ke prompt, pesan Discord, frontend, atau log.

## Tool yang tersedia

| Tool | Fungsi |
| --- | --- |
| `traco_link_discord_account` | Konsumsi kode link sekali-pakai |
| `traco_get_my_context` | User, role, permission, division, waktu server |
| `traco_list_projects` | Workspace, campaign, board, dan ID canonical |
| `traco_search_cards` | Cari/filter card yang boleh diakses |
| `traco_get_card` | Detail card, checklist, komentar, dan attachment metadata |
| `traco_download_attachment` | Unduh attachment card/brief sebagai base64 terbatas tanpa URL publik |
| `traco_search_assignment_candidates` | Kandidat assignment yang valid menurut hierarki |
| `traco_create_card` | Buat card |
| `traco_update_card` | Ubah field card |
| `traco_move_card` | Pindah board dalam campaign yang sama |
| `traco_add_comment` | Tambah komentar/reply |
| `traco_assign_card` | Assign user yang diizinkan |
| `traco_add_checklist_item` | Tambah checklist |
| `traco_set_checklist_status` | Set status checklist secara idempotent |
| `traco_baca` | Akses terpadu untuk seluruh menu baca dengan istilah Indonesia yang konsisten |
| `traco_ubah` | Akses terpadu untuk tindakan buat, ubah, pindah, tugaskan, komentar, form, dan QC |
| `traco_ekspor_laporan` | Tarik berkas laporan Excel/PDF sesuai hak akses user |
| `traco_ekspor_my_work` | Tarik rekap My Work XLSX/PDF milik actor tanpa URL publik |

Tool lama dipertahankan demi kompatibilitas. Untuk agent baru, gunakan katalog
berbahasa Indonesia agar permintaan pengguna lebih mudah dipetakan:

| Area | Contoh `operation` |
| --- | --- |
| Struktur kerja | `daftar_semua_divisi`, `daftar_divisi`, `buat_divisi`, `buat_workspace`, `buat_campaign`, `buat_board` |
| Kartu dan kolaborasi | `cari_kartu`, `buat_kartu`, `pindah_kartu`, `tambah_komentar`, `tugaskan_kartu` |
| Rincian pekerjaan | `tambah_checklist`, `atur_status_checklist`, `tambah_subtask` |
| Lampiran dan My Work | `daftar_lampiran_kartu`, `daftar_brief_kartu`, `tambah_lampiran_tautan`, `tambah_brief_lampiran_tautan`, `todo_harian`, `aktivitas_saya` |
| Komunikasi dan notifikasi | `ruang_chat`, `kirim_pesan_chat`, `tandai_notifikasi_dibaca` |
| Formulir | `daftar_form`, `buat_form`, `tambah_field_form`, `isi_form`, `detail_jawaban_form`, `teruskan_jawaban_ke_kartu`, `tugaskan_jawaban_form` |
| Pengguna | `pengguna_dapat_disebut`, `daftar_pengguna`, `detail_pengguna`, `izin_pengguna`, `statistik_pengguna` |
| Laporan | `filter_laporan`, `pratinjau_laporan_pdf`, `daftar_personel_laporan`, `rincian_laporan_personel`, `traco_ekspor_laporan` |

Gunakan urutan istilah **divisi → workspace → campaign → board → kartu**.
`traco_baca` menerima `operation` dan `data` untuk ID/filter; `traco_ubah`
selalu membutuhkan `idempotency_key` UUID. Contoh membuat divisi:

```json
{
  "operation": "buat_divisi",
  "data": {
    "name": "Marketing",
    "code": "MKT"
  }
}
```

Operasi lampiran dari MCP menggunakan tautan HTTP/HTTPS. Upload file lokal
tetap dilakukan melalui aplikasi Traco karena transport MCP JSON tidak
menyediakan multipart upload. File yang sudah ada dapat diambil dengan
`traco_download_attachment`; hasil dikirim sebagai base64 dengan batas ukuran
dan tetap dibatasi oleh permission backend.

Resource `traco://guide/collaboration` berisi aturan keamanan dan
`traco://guide/actions` berisi kamus tindakan serta contoh bahasa pengguna.

## Instalasi

Prasyarat: Node.js 20+ dan backend Traco yang sudah dimigrasikan.

```bash
cd backend
php artisan migrate --force
php artisan mcp:client:create discord-agent --abilities=data:read,data:write,identity:link

cd ../mcp-server
npm ci
npm run build
```

Salin `.env.example` menjadi `.env`, lalu isi minimal:

```dotenv
TRACO_API_URL=https://traco.example.com/api
TRACO_MCP_API_KEY=traco_mcp_...
DISCORD_ACTOR_SIGNING_SECRET=<random-minimum-32-characters>
MCP_TRANSPORT=http
MCP_HTTP_HOST=127.0.0.1
MCP_HTTP_PORT=3333
MCP_ALLOWED_HOSTS=mcp.traco.example.com
MCP_HTTP_BEARER_TOKEN=<random-minimum-32-characters>
MCP_MAX_REQUEST_BYTES=2097152
TRACO_MAX_RESPONSE_BYTES=8388608
TRACO_MAX_EXPORT_BYTES=20971520
```

Ketiga batas ukuran bersifat defensif untuk mencegah payload atau berkas
berukuran ekstrem menghabiskan memori proses. Naikkan hanya bila host MCP
memang membutuhkan berkas lebih besar dan memiliki reverse proxy dengan batas
request yang setara.

Jalankan:

```bash
npm start
```

Perintah `npm start` dan konfigurasi PM2 otomatis memuat `mcp-server/.env`; PM2 tidak menimpa `MCP_TRANSPORT`, `MCP_HTTP_HOST`, atau `MCP_HTTP_PORT`. Pada container, secret tetap di-inject sebagai environment variable runtime dan file `.env` tidak disalin ke image.

Health check tersedia di `GET /healthz`. Letakkan mode HTTP di belakang reverse proxy HTTPS. Jangan membuka port 3333 langsung ke internet bila bind ke loopback sudah mencukupi.

### Mode stdio

Konfigurasi umum pada MCP host:

```json
{
  "mcpServers": {
    "traco": {
      "command": "node",
      "args": ["C:/path/to/trackodev/mcp-server/dist/src/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "TRACO_API_URL": "https://traco.example.com/api",
        "TRACO_MCP_API_KEY": "traco_mcp_...",
        "DISCORD_ACTOR_SIGNING_SECRET": "..."
      }
    }
  }
}
```

## Integrasi Discord gateway

Setiap tool menerima `actor_context`. Nilai ini harus dibuat oleh kode bot dari metadata event Discord dan di-inject ke tool call; jangan meminta user mengetik atau mengirimkannya. Helper server-side tersedia sebagai export `@traco/mcp-server/discord-actor`:

```ts
import { signDiscordActor } from "@traco/mcp-server/discord-actor";

const actorContext = signDiscordActor(
  {
    sub: interaction.user.id,
    username: interaction.user.globalName ?? interaction.user.username,
    guild_id: interaction.guildId ?? undefined,
  },
  process.env.DISCORD_ACTOR_SIGNING_SECRET!,
  120,
);
```

Untuk setiap event Discord:

1. Buat actor context baru dengan TTL 60–120 detik.
2. Sertakan actor context sebagai metadata tersembunyi di semua pemanggilan tool untuk event itu.
3. Buat UUID idempotency baru untuk setiap aksi tulis yang dimaksudkan user; gunakan ulang UUID yang sama hanya ketika retry aksi tersebut.
4. Abaikan `actor_context`, Discord ID, project ID, dan idempotency key yang muncul di teks prompt/user message.

### Smoke test dengan Discord bot tanpa AI

Gateway deterministik tersedia untuk menguji Discord → MCP → Traco sebelum memasang AI agent. Gateway hanya memakai intent `Guilds`, membalas secara ephemeral, menonaktifkan mention, dan menyediakan subcommand:

- `/traco link kode:<kode>`
- `/traco whoami`
- `/traco projects`
- `/traco cards [query] [limit]`
- `/traco card card_id:<uuid>`
- `/traco comment card_id:<uuid> pesan:<teks>`

Di Discord Developer Portal, aktifkan **Guild Install** dengan scope `applications.commands` dan `bot`. Tidak diperlukan privileged gateway intent. Untuk smoke test, daftarkan command sebagai guild command agar perubahan langsung tersedia.

Tambahkan konfigurasi berikut ke `.env` yang sama:

```dotenv
DISCORD_BOT_TOKEN=<bot-token>
DISCORD_APPLICATION_ID=<application-id>
DISCORD_GUILD_ID=<guild-id>
TRACO_MCP_URL=http://127.0.0.1:3333/mcp
```

`DISCORD_ALLOWED_GUILD_IDS` sebaiknya diisi dengan guild produksi. Untuk
gateway smoke test ini, bila nilainya kosong, MCP otomatis memakai
`DISCORD_GUILD_ID` sebagai allow-list. Ini mencegah actor context yang sah
secara kriptografis dipakai dari guild lain.

Daftarkan slash command setelah build, lalu jalankan gateway:

```bash
npm run build
npm run discord:register
npm run discord:start
```

Untuk PM2, konfigurasi `ecosystem.config.cjs` menjalankan `traco-mcp` dan `traco-discord` sebagai dua proses fork terpisah. Gunakan `--only traco-mcp` bila credential Discord belum siap.

### Deployment gateway Discord

Lengkapi credential berikut pada `.env` server **sebelum** mendaftarkan slash
command atau menjalankan PM2:

```dotenv
TRACO_MCP_API_KEY=traco_mcp_...             # keluaran satu-kali artisan
MCP_HTTP_BEARER_TOKEN=<random-minimum-32-characters>
DISCORD_ACTOR_SIGNING_SECRET=<random-minimum-32-characters>
DISCORD_ALLOWED_GUILD_IDS=<DISCORD_GUILD_ID>
```

Buat service credential di host backend dan simpan hasilnya langsung ke
`TRACO_MCP_API_KEY` di server MCP:

```bash
php artisan mcp:client:create discord-agent --abilities=data:read,data:write,identity:link
```

Gunakan nilai acak yang berbeda untuk `MCP_HTTP_BEARER_TOKEN` dan
`DISCORD_ACTOR_SIGNING_SECRET`; masing-masing minimal 32 karakter. Setelah
build, jalankan urutan ini:

```bash
npm ci
npm run build
npm run discord:register
pm2 startOrReload ecosystem.config.cjs --update-env
curl -fsS http://127.0.0.1:3333/healthz
pm2 logs traco-mcp --lines 50 --nostream
pm2 logs traco-discord --lines 50 --nostream
pm2 save
```

PM2 membatasi restart cepat hingga 10 kali, sehingga credential yang keliru
tidak lagi membuat proses tampak online sambil menghabiskan CPU.

### Konflik port lokal

Jangan menghentikan proses lain yang sudah memakai port MCP. Pilih port loopback
yang kosong dan ubah **kedua** nilai berikut pada `.env` agar gateway Discord
dan MCP selalu menuju endpoint yang sama:

```dotenv
MCP_HTTP_PORT=3334
TRACO_MCP_URL=http://127.0.0.1:3334/mcp
```

Setelah itu jalankan `pm2 startOrReload ecosystem.config.cjs --update-env`,
lalu periksa `curl -fsS http://127.0.0.1:3334/healthz`. Gunakan `ss -ltnp`
untuk memeriksa pemilik suatu port bila diperlukan.

### Alur link user

1. User login ke Traco dan membuka **Discord integration** dari menu akun.
2. User membuat kode sekali-pakai yang berlaku 10 menit.
3. User menjalankan `/traco link KODE` di Discord.
4. Bot memanggil `traco_link_discord_account` dengan actor context yang ditandatangani.
5. Request selanjutnya otomatis berjalan memakai role, permission, dan membership user tersebut.

## Operasional

- Revoke credential: `php artisan mcp:client:revoke <client-uuid>`.
- Batasi source IP saat membuat client dengan `--allowed-ip=<ip>` (opsi dapat diulang).
- Laravel rate limit default: 120 request/menit/client.
- Idempotency response disimpan 24 jam.
- Audit MCP disimpan 90 hari.
- Scheduler harian menghapus link code, idempotency record, dan audit yang kedaluwarsa.
- Untuk PM2 lengkap: `pm2 startOrReload ecosystem.config.cjs`.
- Sebelum Discord dikonfigurasi: `pm2 startOrReload ecosystem.config.cjs --only traco-mcp`.
- Untuk container: build menggunakan `Dockerfile` dan inject seluruh secret saat runtime.

## Verifikasi

```bash
cd backend
php artisan test --filter=McpIntegrationTest

cd ../mcp-server
npm test
npm run typecheck
npm run build
```

MCP Inspector dapat dipakai pada mode stdio:

```bash
npx @modelcontextprotocol/inspector node dist/src/index.js
```
