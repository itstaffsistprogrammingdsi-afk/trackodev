# Integrasi AI agent → Google Chat → Traco

Implementasi ini menambahkan gateway `traco-google-chat` ke `mcp-server`.
Google Chat mengirim interaction event ke gateway, gateway memverifikasi bearer
token Google, menandatangani identitas user sebagai `google_chat`, lalu
meneruskan pesan ke AI agent. Agent memanggil MCP Traco dengan `actor_context`
tersebut; API Laravel tetap menjadi sumber kebenaran untuk link identity,
permission, membership, audit, dan idempotency.

```text
Google Chat MESSAGE
  -> traco-google-chat (verify Google OIDC/JWT)
  -> AI_AGENT_URL { message, actor_context }
  -> Traco MCP tools (HTTP /mcp)
  -> Laravel MCP API (provider=google_chat, permission + audit)
  -> { text } kembali ke Google Chat
```

Google Chat mendukung authentication audience berupa URL endpoint (OIDC ID
token) atau project number (JWT). Gateway mendukung keduanya dan hanya menerima
token yang diterbitkan oleh `chat@system.gserviceaccount.com`. Lihat [verifikasi resmi Google Chat](https://developers.google.com/workspace/chat/verify-requests-from-chat).

## Konfigurasi backend

Jalankan migrasi dan buat credential MCP dengan kemampuan yang diperlukan:

```bash
cd backend
php artisan migrate --force
php artisan mcp:client:create google-chat-agent --abilities=data:read,data:write,identity:link
```

Pada menu Integrations Traco, user membuat link code dengan provider
`google_chat`. Kode hanya berlaku sekali dan 10 menit. Simpan code untuk
perintah onboarding agent; jangan simpan di source code atau log.

## Konfigurasi Google Cloud

1. Enable **Google Chat API** pada Google Cloud project.
2. Buka konfigurasi Chat app dan pilih **HTTP endpoint URL** (disarankan) atau
   **Project number** sebagai Authentication audience.
3. Isi URL endpoint HTTPS, misalnya `https://chat.example.com/google-chat/events`.
4. Set URL/audience yang sama pada `GOOGLE_CHAT_AUDIENCE` (atau project number).
5. Atur visibility ke user/group penguji, lalu aktifkan direct messages dan
   join spaces sesuai kebutuhan.

Google Chat harus dapat mencapai endpoint publik melalui HTTPS. Reverse proxy
boleh meneruskan ke loopback `127.0.0.1:3443`; jangan mengekspos port internal
MCP atau agent tanpa autentikasi.

## Konfigurasi agent dan menjalankan gateway

Salin `.env.example` menjadi `.env`, lalu isi sekurang-kurangnya:

```dotenv
TRACO_API_URL=https://traco.example.com/api
TRACO_MCP_API_KEY=traco_mcp_...
MCP_TRANSPORT=http
MCP_HTTP_HOST=127.0.0.1
MCP_HTTP_PORT=3333
MCP_ALLOWED_HOSTS=mcp.traco.example.com
MCP_HTTP_BEARER_TOKEN=<random-minimum-32-characters>
DISCORD_ACTOR_SIGNING_SECRET=<random-minimum-32-characters>

GOOGLE_CHAT_HOST=127.0.0.1
GOOGLE_CHAT_PORT=3443
GOOGLE_CHAT_PATH=/google-chat/events
GOOGLE_CHAT_AUDIENCE=https://chat.example.com/google-chat/events
GOOGLE_CHAT_AGENT_URL=https://agent.example.com/google-chat
GOOGLE_CHAT_AGENT_BEARER_TOKEN=<random-minimum-32-characters>
GOOGLE_CHAT_AGENT_TIMEOUT_MS=25000
```

Timeout agent dibatasi maksimal 30 detik agar sesuai batas response sinkron
Google Chat. Pekerjaan yang lebih lama harus diproses asynchronous oleh agent.

`GOOGLE_CHAT_AGENT_URL` adalah endpoint internal milik AI agent. Gateway
mengirim JSON berikut dan tidak pernah menampilkan actor context ke pengguna:

```json
{
  "source": "google_chat",
  "event_type": "MESSAGE",
  "message": "buat kartu untuk kampanye minggu ini",
  "actor_context": "<signed-short-lived-assertion>",
  "actor": { "id": "users/123", "display_name": "Ayu" },
  "space": { "name": "spaces/AAA", "type": "ROOM" }
}
```

Agent mengembalikan `{ "text": "..." }` atau `{ "message": { "text": "..." } }`.
Agent MCP client harus meneruskan `actor_context` ke setiap tool call dan tidak
menerima actor context dari isi pesan. Untuk operasi tulis, buat satu UUID
`idempotency_key` per maksud user dan gunakan ulang UUID itu hanya saat retry.

Build dan jalankan:

```bash
cd mcp-server
npm ci
npm run build
npm run google-chat:start
```

PM2 menjalankan proses yang sama sebagai `traco-google-chat`:

```bash
pm2 startOrReload ecosystem.config.cjs --only traco-mcp,traco-google-chat --update-env
pm2 logs traco-google-chat --lines 50 --nostream
```

Health check gateway: `GET /healthz` mengembalikan status tanpa memerlukan
token Google Chat.

## Linking user dan smoke test

User membuat link code pada Traco dengan provider `google_chat`, kemudian
mengirimkannya ke agent melalui mekanisme onboarding yang hanya boleh diproses
oleh agent tepercaya. Agent memanggil tool link MCP yang sudah ada; server
menentukan provider dari actor context Google Chat yang telah diverifikasi,
sehingga identity tersimpan sebagai `google_chat` tanpa menerima provider dari
teks pesan.

Setelah linked, uji di Google Chat:

```text
@Traco siapa saya?
@Traco tampilkan proyek saya
@Traco cari kartu yang terlambat
```

Event yang tidak terkait pesan (`ADDED_TO_SPACE`, `REMOVED_FROM_SPACE`, dan
event interaksi lain) ditangani gateway tanpa meneruskan data sensitif ke agent.
Google Chat dapat mengulangi delivery ketika endpoint timeout/gagal; semua
perubahan Traco harus tetap idempotent.

## Verifikasi lokal

```bash
cd mcp-server
npm run typecheck
npm test
npm run build
```

Untuk pengujian endpoint yang sebenarnya, gunakan token interaksi dari Google
Chat atau deploy sementara pada HTTPS. Jangan mematikan verifikasi token pada
lingkungan yang dapat diakses publik.
