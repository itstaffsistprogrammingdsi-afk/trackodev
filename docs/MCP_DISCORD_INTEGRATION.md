# Panduan Integrasi Traco MCP ke Discord Bot dan AI Agent

Panduan end-to-end untuk menghubungkan Traco ke Discord bot deterministik dan AI
agent berbasis MCP. Implementasi MCP berada di mcp-server (lihat
../mcp-server/README.md); API Laravel yang menjadi otoritas berada di
/api/mcp/v1.

## Arsitektur

~~~text
Discord event / AI agent
  -> gateway membuat actor_context HMAC dari metadata Discord
  -> mcp-server (stdio atau Streamable HTTP /mcp)
  -> Laravel /api/mcp/v1
  -> identity link + permission + policy + membership + hierarchy
  -> database, audit, dan idempotency
~~~

Laravel tetap menjadi sumber keputusan terakhir. Bot dan AI agent tidak boleh
mengakses database langsung atau menentukan permission sendiri.

| Komponen | Tanggung jawab |
| --- | --- |
| Laravel MCP API | Validasi domain, policy resource, permission, membership, rate limit, audit, idempotensi |
| mcp-server | MCP protocol, validasi input, actor HMAC, batas ukuran, konversi file ke base64 |
| Discord gateway | Membaca user/guild dari interaction, menandatangani actor, memanggil MCP |
| AI agent | Memilih tool dan menyusun argumen dari konteks yang diberikan |

## Credential dan provisioning

| Credential | Lokasi | Fungsi |
| --- | --- | --- |
| TRACO_MCP_API_KEY | Hanya MCP server | Autentikasi service MCP ke Laravel |
| MCP_HTTP_BEARER_TOKEN | MCP server + client HTTP | Mengunci endpoint /mcp |
| DISCORD_ACTOR_SIGNING_SECRET | MCP server + gateway tepercaya | Membuktikan identitas Discord |

Jangan masukkan credential, actor_context, atau link code ke prompt, pesan
Discord, frontend, structured content, maupun log.

Pada folder backend:

~~~bash
php artisan migrate --force
php artisan mcp:client:create discord-agent --abilities=data:read,data:write,identity:link
~~~

Simpan output credential satu kali sebagai TRACO_MCP_API_KEY di host MCP. Cabut
credential dengan:

~~~bash
php artisan mcp:client:revoke <client-uuid>
~~~

Opsi --allowed-ip=<ip> dapat dipakai berulang kali saat membuat client.

## Link akun Discord

1. User login ke Traco dan membuka menu integrasi Discord.
2. User membuat kode sekali pakai (TTL default 10 menit).
3. User menjalankan /traco link kode:ABCD-EFGH.
4. Gateway memanggil traco_link_discord_account dengan actor_context yang
   dibuat dari interaction.user.
5. Request berikutnya memakai user, role, permission, dan membership Traco.

actor_context harus dibuat server-side dari event Discord. Jangan meminta user
mengetik nilai ini.

## Daftar semua MCP tool

| Tool | Input utama | Kegunaan |
| --- | --- | --- |
| traco_link_discord_account | actor_context, link_code, idempotency_key | Link Discord ke user Traco |
| traco_get_my_context | actor_context | User, email, role, permission, divisi, timezone |
| traco_list_projects | actor_context | Workspace, campaign, board, ID canonical |
| traco_search_cards | actor_context, filter, page, limit | Cari card yang boleh diakses |
| traco_get_card | actor_context, card_id UUID | Detail card, task, comment, label, brand, attachment |
| traco_download_attachment | actor_context, attachment_id UUID, attachment_kind card atau brief | File attachment sebagai base64 tanpa URL publik |
| traco_search_assignment_candidates | actor_context, query, limit | Kandidat assignment menurut hierarchy |
| traco_create_card | actor_context, idempotency_key, board_id, title, field card | Buat card |
| traco_update_card | actor_context, idempotency_key, card_id, perubahan | Ubah card |
| traco_move_card | actor_context, idempotency_key, card_id, destination_board_id, order | Pindah card dalam campaign |
| traco_add_comment | actor_context, idempotency_key, card_id, content | Tambah komentar atau reply |
| traco_assign_card | actor_context, idempotency_key, card_id, user_id | Assign user yang valid |
| traco_add_checklist_item | actor_context, idempotency_key, card_id, title | Tambah checklist |
| traco_set_checklist_status | actor_context, idempotency_key, task_id, completed | Set status checklist |
| traco_baca | actor_context, operation, data | Facade semua menu baca Bahasa Indonesia |
| traco_ubah | actor_context, idempotency_key, operation, data | Facade semua menu perubahan Bahasa Indonesia |
| traco_ekspor_laporan | actor_context, format, filters, export_password opsional | Export laporan Excel/PDF sebagai base64 |
| traco_ekspor_my_work | actor_context, format, filters, export_password opsional | Export My Work XLSX/PDF sebagai base64 |

Semua field *_id divalidasi UUID. Semua mutation wajib memakai UUID
idempotency_key; UUID yang sama hanya boleh dipakai untuk retry payload dan
tujuan yang identik.

### Slash command yang tersedia

| Command | Tool | Contoh |
| --- | --- | --- |
| /traco link | traco_link_discord_account | /traco link kode:ABCD-EFGH |
| /traco whoami | traco_get_my_context | Menampilkan identitas Traco |
| /traco projects | traco_list_projects | Menampilkan project yang accessible |
| /traco cards | traco_search_cards | /traco cards query:landing limit:10 |
| /traco card | traco_get_card | /traco card card_id:<uuid> |
| /traco comment | traco_add_comment | /traco comment card_id:<uuid> pesan:Mohon dicek |

Contoh hasil /traco whoami:

~~~text
Terhubung sebagai **Super Admin**
Email: superadmin@gmail.com
Role: super_admin
Divisi: -
~~~

Reply dikirim ephemeral, mention dinonaktifkan, dan teks hasil di-escape.

## Facade Bahasa Indonesia

traco_baca menerima actor_context, operation, dan data. traco_ubah menerima
actor_context, idempotency_key, operation, dan data. data dibatasi maksimal
100 field dan 64 KiB.

### Operasi baca

| Area | operation |
| --- | --- |
| Konteks/struktur | ringkasan_saya, daftar_proyek, daftar_semua_divisi, daftar_divisi, detail_divisi, anggota_divisi, aktivitas_divisi, daftar_workspace, detail_workspace, daftar_campaign, detail_campaign, anggota_campaign |
| Campaign analytics | ringkasan_campaign, progress_campaign, timeline_campaign, kesehatan_campaign, tugas_terlambat_campaign |
| Board/card | daftar_board, daftar_kartu_board, cari_kartu, detail_kartu, daftar_komentar, daftar_checklist, daftar_subtask, aktivitas_kartu |
| Master/attachment | daftar_label, detail_label, daftar_brand, detail_brand, daftar_lampiran_kartu, daftar_brief_kartu, daftar_template_deskripsi_hasil |
| Kalender/dashboard | kalender, opsi_kalender, tanggal_kalender, dashboard, peringkat_divisi_dashboard, aktivitas_dashboard |
| Chat/notifikasi | notifikasi, ruang_chat, detail_ruang_chat, pesan_chat |
| Formulir | daftar_form, detail_form, jawaban_form, detail_jawaban_form |
| Laporan | filter_laporan, daftar_personel_laporan, rincian_laporan_personel, aktivitas_laporan_personel, pratinjau_laporan_pdf |
| User | cari_kandidat_penerima_tugas, pengguna_dapat_disebut, daftar_pengguna, detail_pengguna, detail_aktivitas_pengguna, izin_pengguna, statistik_pengguna |
| My Work | todo_harian, aktivitas_saya, peringkat_penyelesaian, lampiran_saya |

Contoh:

~~~json
{
  "actor_context": "<signed-actor-context>",
  "operation": "detail_kartu",
  "data": {
    "card_id": "22222222-2222-4222-8222-222222222222"
  }
}
~~~

### Operasi perubahan

| Area | operation |
| --- | --- |
| Struktur | buat_divisi, ubah_divisi, hapus_divisi, tambah_anggota_divisi, ubah_peran_anggota_divisi, hapus_anggota_divisi, buat_workspace, ubah_workspace, hapus_workspace, buat_campaign, ubah_campaign, hapus_campaign, tambah_anggota_campaign, hapus_anggota_campaign, buat_board, ubah_board, urutkan_board, hapus_board |
| Card | buat_kartu, ubah_kartu, pindah_kartu, urutkan_kartu, hapus_kartu, tugaskan_kartu, lepaskan_penerima_tugas |
| Attachment | tambah_lampiran_tautan, hapus_lampiran, arsipkan_lampiran, pulihkan_lampiran, tambah_brief_lampiran_tautan, hapus_brief_lampiran |
| Checklist/subtask | tambah_checklist, atur_status_checklist, ubah_checklist, urutkan_checklist, hapus_checklist, tambah_subtask, ubah_subtask, selesaikan_subtask, hapus_subtask |
| Komentar | tambah_komentar, ubah_komentar, hapus_komentar |
| Label/brand | buat_label, ubah_label, hapus_label, pasang_label_kartu, pasang_label_toggle, lepas_label_kartu, buat_brand, ubah_brand, hapus_brand, pasang_brand_kartu, lepas_brand_kartu |
| Chat/notifikasi | buat_chat_pribadi, kirim_pesan_chat, tandai_chat_dibaca, hapus_pesan_chat, tandai_semua_notifikasi_dibaca, tandai_notifikasi_dibaca, hapus_notifikasi |
| Formulir | buat_form, ubah_form, hapus_form, tambah_field_form, ubah_field_form, hapus_field_form, isi_form, teruskan_jawaban_ke_kartu, tugaskan_jawaban_form |
| Administrasi/QC | buat_template_deskripsi_hasil, buat_pengguna, ubah_pengguna, hapus_pengguna, atur_izin_pengguna, reset_password_pengguna, qc_lampiran_laporan |

Contoh mutation:

~~~json
{
  "actor_context": "<signed-actor-context>",
  "idempotency_key": "33333333-3333-4333-8333-333333333333",
  "operation": "tambah_komentar",
  "data": {
    "card_id": "22222222-2222-4222-8222-222222222222",
    "content": "Mohon dicek hari ini."
  }
}
~~~

MCP mendukung attachment link HTTP/HTTPS. Upload multipart file lokal tetap
dilakukan dari aplikasi Traco; file existing dapat diambil melalui
traco_download_attachment.

## Konfigurasi MCP server

Salin mcp-server/.env.example ke mcp-server/.env:

~~~dotenv
TRACO_API_URL=https://traco.example.com/api
TRACO_MCP_API_KEY=traco_mcp_...
DISCORD_ACTOR_SIGNING_SECRET=<random-minimum-32-characters>

MCP_TRANSPORT=http
MCP_HTTP_HOST=127.0.0.1
MCP_HTTP_PORT=3333
MCP_ALLOWED_HOSTS=mcp.traco.example.com
MCP_ALLOWED_ORIGINS=https://agent.example.com
MCP_HTTP_BEARER_TOKEN=<random-minimum-32-characters>

MCP_MAX_REQUEST_BYTES=2097152
TRACO_MAX_RESPONSE_BYTES=8388608
TRACO_MAX_EXPORT_BYTES=20971520

DISCORD_GUILD_ID=<guild-snowflake>
DISCORD_ALLOWED_GUILD_IDS=<guild-snowflake>
~~~

URL remote wajib HTTPS. HTTP hanya untuk loopback. Mode HTTP wajib bearer
token dan host allow-list eksplisit; jangan memakai wildcard host.

~~~bash
cd mcp-server
npm ci
npm run build
npm start
curl -fsS http://127.0.0.1:3333/healthz
~~~

Untuk produksi, letakkan server di belakang reverse proxy HTTPS dan private
network bila memungkinkan.

### Client stdio

~~~json
{
  "mcpServers": {
    "traco": {
      "command": "node",
      "args": ["C:/laragon/www/trackodev/mcp-server/dist/src/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "TRACO_API_URL": "https://traco.example.com/api",
        "TRACO_MCP_API_KEY": "traco_mcp_...",
        "DISCORD_ACTOR_SIGNING_SECRET": "..."
      }
    }
  }
}
~~~

### Gateway Discord

~~~dotenv
DISCORD_BOT_TOKEN=<bot-token>
DISCORD_APPLICATION_ID=<application-id>
DISCORD_GUILD_ID=<guild-snowflake>
TRACO_MCP_URL=http://127.0.0.1:3333/mcp
MCP_HTTP_BEARER_TOKEN=<same-token-used-by-mcp-server>
~~~

~~~bash
npm run build
npm run discord:register
npm run discord:start
~~~

Gateway hanya membutuhkan intent Guilds dan menggunakan ephemeral reply.

## Contoh implementasi bot Discord

Pola minimal untuk /traco whoami:

~~~ts
import { Client as McpClient, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { signDiscordActor } from '@traco/mcp-server/discord-actor';

const mcp = new McpClient({ name: 'my-traco-discord-bot', version: '1.0.0' });
const transport = new StreamableHTTPClientTransport(
  new URL(process.env.TRACO_MCP_URL!),
  { authProvider: { token: async () => process.env.MCP_HTTP_BEARER_TOKEN! } },
);
await mcp.connect(transport);

async function handleWhoami(interaction: any) {
  const actorContext = signDiscordActor({
    sub: interaction.user.id,
    username: interaction.user.globalName ?? interaction.user.username,
    guild_id: interaction.guildId,
  }, process.env.DISCORD_ACTOR_SIGNING_SECRET!, 120);

  const result = await mcp.callTool({
    name: 'traco_get_my_context',
    arguments: { actor_context: actorContext },
  });

  if (result.isError) {
    await interaction.reply({ content: 'Akun belum terhubung atau akses ditolak.', ephemeral: true });
    return;
  }

  const context = result.structuredContent as any;
  const user = context.data.user;
  await interaction.reply({
    ephemeral: true,
    allowedMentions: { parse: [] },
    content: [
      'Terhubung sebagai **' + (user.roles.join(', ') || 'User') + '**',
      'Email: ' + user.email,
      'Role: ' + (user.roles.join(', ') || '-'),
      'Divisi: ' + (user.divisions.map((division: any) => division.name).join(', ') || '-'),
    ].join('\n'),
  });
}
~~~

Untuk mutation, buat UUID idempotency baru. Jangan mengambil actor_context,
ID, atau credential dari teks user.

## Contoh AI agent Discord

AI agent memakai tool MCP melalui stdio atau HTTP dengan pola berikut:

1. Gateway menerima event Discord dan membuat actor_context.
2. Actor context disimpan di metadata internal turn AI.
3. AI memanggil traco_get_my_context atau traco_list_projects sebelum memilih ID.
4. AI meminta konfirmasi jika tujuan mutation ambigu.
5. Setiap mutation memakai idempotency key UUID.
6. Gateway meng-escape output dan menonaktifkan mention.

System instruction yang direkomendasikan:

~~~text
Kamu adalah assistant kolaborasi Traco di Discord.
- Gunakan MCP Traco untuk data dan perubahan; jangan mengarang ID.
- Panggil traco_get_my_context bila identitas atau permission belum jelas.
- Panggil traco_list_projects atau traco_search_cards untuk menemukan ID.
- Minta konfirmasi sebelum mutation yang ambigu.
- Setiap mutation wajib memiliki idempotency_key UUID baru.
- Jangan meminta actor_context, credential, atau service token kepada user.
- Jangan mengklaim berhasil sebelum hasil tool menunjukkan sukses.
~~~

Urutan untuk “tambahkan komentar ke card X”:

~~~text
1. traco_search_cards(actor_context, query="X")
2. traco_get_card(actor_context, card_id=<hasil pencarian>)
3. konfirmasi bila card atau isi komentar ambigu
4. traco_add_comment(actor_context, idempotency_key=<UUID>, card_id=<UUID>, content="...")
5. tampilkan ringkasan hasil
~~~

AI agent non-Discord dapat memakai tool baca dengan actor yang disediakan
integrator. Permission dan role Laravel tetap final, termasuk untuk user
management, result template, dan QC.

## Format hasil dan error

Sukses:

~~~json
{
  "data": {
    "user": {
      "id": "...",
      "name": "Super Admin",
      "email": "superadmin@gmail.com",
      "roles": ["super_admin"],
      "divisions": []
    }
  }
}
~~~

Error:

~~~json
{
  "ok": false,
  "error": {
    "message": "Akun Discord belum terhubung ke user Traco.",
    "status": 401,
    "code": "MCP_ACTOR_NOT_LINKED"
  }
}
~~~

| Code | Arti | Tindakan |
| --- | --- | --- |
| MCP_CLIENT_UNAUTHORIZED | Credential invalid/expired/IP ditolak | Periksa client Laravel dan allowed IP |
| MCP_ACTOR_REQUIRED | Header actor tidak ada | Buat actor dari event Discord |
| MCP_ACTOR_NOT_LINKED | Akun belum link | Jalankan /traco link |
| MCP_ABILITY_DENIED | Ability data:read/data:write tidak cukup | Provision client dengan ability yang benar |
| MCP_IDEMPOTENCY_KEY_REQUIRED | Mutation tanpa UUID | Tambahkan idempotency key |
| MCP_IDEMPOTENCY_CONFLICT | UUID dipakai untuk payload berbeda | Buat UUID baru |
| TRACO_PATH_INVALID | Path tidak allow-listed | Gunakan tool MCP resmi |
| TRACO_RESPONSE_TOO_LARGE / REPORT_TOO_LARGE | Respons melewati batas | Persempit filter atau naikkan limit dengan sadar |

## Checklist keamanan produksi

- Simpan secret di secret manager/environment runtime, bukan repository.
- Gunakan HTTPS, host/origin allow-list, dan guild allow-list eksplisit.
- Gunakan ability minimum; client read-only cukup untuk agent baca.
- Jangan log Authorization, actor_context, link code, password, atau export password.
- Jangan ikuti redirect API dan jangan kirim URL storage publik.
- Escape output Discord dan set allowedMentions parse kosong.
- Pantau mcp_audit_logs, rate limit, error 401/403/409, dan memory.
- Aktifkan scheduler Laravel untuk cleanup link code, idempotency, dan audit.
- Gunakan idempotency key yang sama hanya untuk retry aksi yang sama.

Login, logout, profile, reset password mandiri, public form, dan broadcasting
sengaja tidak dijadikan AI action. Endpoint tersebut tetap berada di boundary
aplikasi agar actor Discord tidak dapat melewati autentikasi atau privilege
account-management.

## Verifikasi dan troubleshooting

~~~bash
cd backend
php artisan optimize:clear
php artisan route:list --path=mcp
php artisan test

cd ../mcp-server
npm ci
npm run typecheck
npm test
npm run build
~~~

Jika /traco whoami gagal:

1. Pastikan GET /healthz mengembalikan {"status":"ok"}.
2. Pastikan TRACO_MCP_URL gateway sesuai dengan port MCP.
3. Pastikan bearer token gateway sama dengan MCP_HTTP_BEARER_TOKEN server.
4. Pastikan TRACO_MCP_API_KEY aktif dan client memiliki ability yang diperlukan.
5. Pastikan kode link belum kedaluwarsa dan Discord ID belum terhubung ke user lain.
6. Cari X-Request-ID di mcp_audit_logs; jangan menyalakan log secret.

MCP Inspector:

~~~bash
npx @modelcontextprotocol/inspector node dist/src/index.js
~~~
