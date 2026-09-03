# Traco Collaboration MCP

MCP server ini menjadi bridge aman antara Discord AI agent dan Traco. Server tidak mengakses database secara langsung; seluruh operasi melewati API Laravel khusus MCP dan tetap dievaluasi sebagai user Traco yang identitas Discord-nya sudah diverifikasi.

Implementasi memakai MCP TypeScript SDK v2 dan mendukung dua transport:

- `stdio` untuk agent/bot yang menjalankan MCP sebagai child process.
- Streamable HTTP stateless di `/mcp` untuk agent yang berjalan terpisah.

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
| `traco_search_assignment_candidates` | Kandidat assignment yang valid menurut hierarki |
| `traco_create_card` | Buat card |
| `traco_update_card` | Ubah field card |
| `traco_move_card` | Pindah board dalam campaign yang sama |
| `traco_add_comment` | Tambah komentar/reply |
| `traco_assign_card` | Assign user yang diizinkan |
| `traco_add_checklist_item` | Tambah checklist |
| `traco_set_checklist_status` | Set status checklist secara idempotent |

Resource `traco://guide/collaboration` berisi aturan operasi yang dapat dibaca MCP client.

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
```

Jalankan:

```bash
npm start
```

Perintah `npm start` dan konfigurasi PM2 otomatis memuat `mcp-server/.env`. Pada container, secret tetap di-inject sebagai environment variable runtime dan file `.env` tidak disalin ke image.

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
- Untuk PM2: `pm2 start ecosystem.config.cjs`.
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
