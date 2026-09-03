# Discord AI Agent Collaboration

Implementasi MCP untuk kolaborasi Discord berada di [`mcp-server`](../mcp-server/README.md). Dokumen tersebut mencakup arsitektur keamanan, daftar tool, provisioning credential, deployment stdio/HTTP, actor signing, link user, dan verifikasi.

Untuk validasi sebelum AI agent dipasang, paket yang sama menyediakan gateway Discord non-AI dengan slash command deterministik. Gateway tersebut tetap memanggil MCP melalui Streamable HTTP sehingga autentikasi actor, permission Traco, audit, dan idempotensi diuji melalui jalur produksi yang sama.

Komponen backend yang terkait:

- API user untuk membuat kode link: `GET /api/integrations/identities`, `POST /api/integrations/link-codes`, dan `DELETE /api/integrations/identities/{identity}`.
- API service MCP berversi di `/api/mcp/v1`.
- Credential lifecycle melalui `mcp:client:create` dan `mcp:client:revoke`.
- Audit trail di `mcp_audit_logs`.
- Proteksi retry di `mcp_idempotency_keys`.

Setelah deploy backend, jalankan `php artisan migrate --force`, `php artisan optimize:clear`, dan pastikan `php artisan schedule:work` tetap aktif agar data integrasi yang kedaluwarsa dipangkas.
