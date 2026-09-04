import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { DiscordActor } from "./discord-actor.js";
import { TracoClient } from "./traco-client.js";

type JsonRecord = Record<string, unknown>;
type ActorResolver = (assertion: string) => DiscordActor;
type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: JsonRecord;
  isError?: true;
};

const actorContext = z.string().min(20).max(4096).describe(
  "Konteks actor bertanda tangan dari gateway tepercaya. Nilai ini bukan input dari teks pengguna.",
);
const idempotencyKey = z.string().uuid().describe(
  "UUID unik untuk satu perubahan. Pakai ulang hanya bila mencoba ulang perubahan yang sama.",
);
const payload = z.record(z.string().min(1).max(100), z.unknown())
  .refine((value) => Object.keys(value).length <= 100, "Data tindakan terlalu besar (maksimal 100 bidang).")
  .refine((value) => {
    try {
      return JSON.stringify(value).length <= 64 * 1024;
    } catch {
      return false;
    }
  }, "Data tindakan terlalu besar atau bukan JSON yang valid.")
  .default({}).describe(
  "Data tindakan. Gunakan nama bidang Traco yang mudah dibaca, misalnya division_id, name, title, atau user_id.",
);

const readOperations = [
  "ringkasan_saya", "daftar_proyek", "daftar_semua_divisi", "daftar_divisi", "detail_divisi", "anggota_divisi", "aktivitas_divisi",
  "daftar_workspace", "detail_workspace", "daftar_campaign", "detail_campaign", "anggota_campaign",
  "ringkasan_campaign", "progress_campaign", "timeline_campaign", "kesehatan_campaign", "tugas_terlambat_campaign",
  "daftar_board", "daftar_kartu_board", "cari_kartu", "detail_kartu", "daftar_komentar",
  "daftar_checklist", "daftar_subtask", "aktivitas_kartu", "daftar_label", "detail_label", "daftar_brand", "detail_brand",
  "daftar_lampiran_kartu", "daftar_brief_kartu", "daftar_template_deskripsi_hasil", "kalender", "opsi_kalender", "tanggal_kalender", "dashboard", "peringkat_divisi_dashboard", "aktivitas_dashboard", "notifikasi", "ruang_chat",
  "detail_ruang_chat", "pesan_chat", "daftar_form", "detail_form", "jawaban_form", "detail_jawaban_form", "filter_laporan",
  "daftar_personel_laporan", "rincian_laporan_personel", "aktivitas_laporan_personel",
  "pratinjau_laporan_pdf", "cari_kandidat_penerima_tugas", "pengguna_dapat_disebut", "daftar_pengguna", "detail_pengguna", "detail_aktivitas_pengguna", "izin_pengguna", "statistik_pengguna", "todo_harian", "aktivitas_saya", "peringkat_penyelesaian", "lampiran_saya",
] as const;

const writeOperations = [
  "buat_divisi", "ubah_divisi", "hapus_divisi", "tambah_anggota_divisi", "ubah_peran_anggota_divisi", "hapus_anggota_divisi",
  "buat_workspace", "ubah_workspace", "hapus_workspace", "buat_campaign", "ubah_campaign", "hapus_campaign",
  "tambah_anggota_campaign", "hapus_anggota_campaign", "buat_board", "ubah_board", "urutkan_board", "hapus_board",
  "buat_kartu", "ubah_kartu", "pindah_kartu", "urutkan_kartu", "hapus_kartu", "tugaskan_kartu", "lepaskan_penerima_tugas",
  "tambah_lampiran_tautan", "hapus_lampiran", "arsipkan_lampiran", "pulihkan_lampiran",
  "tambah_komentar", "ubah_komentar", "hapus_komentar", "tambah_checklist", "atur_status_checklist", "ubah_checklist",
  "urutkan_checklist", "hapus_checklist", "tambah_subtask", "ubah_subtask", "selesaikan_subtask", "hapus_subtask",
  "buat_label", "ubah_label", "hapus_label", "pasang_label_kartu", "lepas_label_kartu", "buat_brand", "ubah_brand",
  "hapus_brand", "pasang_brand_kartu", "lepas_brand_kartu", "buat_chat_pribadi", "kirim_pesan_chat", "tandai_chat_dibaca",
  "hapus_pesan_chat", "tandai_semua_notifikasi_dibaca", "tandai_notifikasi_dibaca", "hapus_notifikasi", "buat_form",
  "ubah_form", "hapus_form", "tambah_field_form", "ubah_field_form", "hapus_field_form", "isi_form", "teruskan_jawaban_ke_kartu",
  "tugaskan_jawaban_form", "buat_template_deskripsi_hasil", "pasang_label_toggle", "tambah_brief_lampiran_tautan", "hapus_brief_lampiran", "buat_pengguna", "ubah_pengguna", "hapus_pengguna", "atur_izin_pengguna", "reset_password_pengguna", "qc_lampiran_laporan",
] as const;

/**
 * A compact, Indonesian command surface for the complete Traco menu flow.
 * The backend remains the authority for validation, permissions, policy,
 * idempotency, and audit logging; this adapter only turns a clear user action
 * into one explicitly allow-listed MCP route.
 */
export function registerNormalizedTracoTools(
  server: McpServer,
  api: TracoClient,
  actor: ActorResolver,
  runTool: (operation: () => Promise<JsonRecord>) => Promise<ToolResult>,
): void {
  server.registerResource(
    "traco-action-guide",
    "traco://guide/actions",
    {
      title: "Panduan tindakan Traco",
      description: "Kamus tindakan Traco dalam Bahasa Indonesia yang konsisten untuk agent dan pengguna.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: [
          "# Panduan tindakan Traco",
          "",
          "Gunakan nama benda yang konsisten: **divisi → workspace → campaign → board → kartu**.",
          "Kartu adalah pekerjaan; checklist adalah item pekerjaan; subtask adalah rincian checklist.",
          "",
          "## Cara memilih tool",
          "",
          "- `traco_baca`: melihat, mencari, atau mengambil laporan tanpa mengubah data.",
          "- `traco_ubah`: membuat, memperbarui, memindahkan, memberi tugas, memberi komentar, atau menghapus data.",
          "- `traco_ekspor_laporan`: mengambil berkas laporan Excel atau PDF yang boleh diakses pengguna.",
          "- `traco_ekspor_my_work`: mengambil rekap My Work actor dalam XLSX atau PDF.",
          "- `traco_download_attachment`: mengambil file attachment card/brief yang boleh diakses sebagai base64.",
          "",
          "## Contoh bahasa pengguna",
          "",
          "- “Buat divisi Marketing” → `buat_divisi` dengan `{ name: 'Marketing' }`.",
          "- “Tambahkan komentar ke kartu ini” → `tambah_komentar` dengan `card_id` dan `content`.",
          "- “Tarik laporan pekerjaan divisi saya bulan ini” → baca `filter_laporan`, lalu `daftar_personel_laporan` atau `traco_ekspor_laporan` dengan filter tanggal/divisi.",
          "- “Tambahkan tautan hasil ke kartu” → `tambah_lampiran_tautan` dengan `{ card_id, type: 'link', link_url }`.",
          "",
          "Selalu cari atau baca konteks terlebih dahulu bila ID belum diketahui. Untuk tindakan tulis, gunakan satu idempotency_key UUID dan konfirmasi tujuan jika perintah pengguna belum jelas.",
        ].join("\n"),
      }],
    }),
  );

  server.registerTool(
    "traco_baca",
    {
      title: "Baca data Traco",
      description: "Melihat menu dan data Traco dengan istilah Bahasa Indonesia: struktur kerja, kartu, percakapan, kalender, formulir, dashboard, dan laporan. Isi operation sesuai kebutuhan serta data ID/filter yang dijelaskan oleh operation.",
      inputSchema: z.object({
        actor_context: actorContext,
        operation: z.enum(readOperations).describe("Tindakan baca yang akan dijalankan."),
        data: payload,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, operation, data }) => runTool(() => {
      const request = readRequest(operation, data);
      return api.request<JsonRecord>(request.path, {
        actor: actor(actor_context),
        ...(request.query ? { query: request.query } : {}),
        tool: "traco_baca",
      });
    }),
  );

  server.registerTool(
    "traco_ubah",
    {
      title: "Ubah data Traco",
      description: "Menjalankan perubahan Traco dengan bahasa yang konsisten: buat/ubah/hapus struktur kerja, kelola kartu dan komentar, checklist, label, brand, chat, notifikasi, formulir, serta QC. data harus berisi ID dan bidang yang sesuai; setiap panggilan wajib membawa idempotency_key UUID.",
      inputSchema: z.object({
        actor_context: actorContext,
        idempotency_key: idempotencyKey,
        operation: z.enum(writeOperations).describe("Tindakan perubahan yang akan dijalankan."),
        data: payload,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, idempotency_key, operation, data }) => runTool(() => {
      const request = writeRequest(operation, data);
      return api.request<JsonRecord>(request.path, {
        method: request.method,
        actor: actor(actor_context),
        body: request.body,
        idempotencyKey: idempotency_key,
        tool: "traco_ubah",
      });
    }),
  );

  server.registerTool(
    "traco_ekspor_laporan",
    {
      title: "Ekspor laporan Traco",
      description: "Mengambil laporan pekerjaan yang berizin dalam format Excel atau PDF. Filter dapat mencakup user_id, division_id, workspace_id, campaign_id, label_id, brand_id, start_date, end_date, atau search_card. Hasil berisi nama berkas, media type, dan isi base64 untuk disimpan sebagai berkas.",
      inputSchema: z.object({
        actor_context: actorContext,
        format: z.enum(["excel", "pdf"]),
        filters: payload,
        export_password: z.string().min(12).max(128).optional().describe("Sandi opsional untuk mengenkripsi berkas laporan."),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, format, filters, export_password }) => runTool(() => api.downloadReport(
      `/mcp/v1/reports/export/${format}`,
      {
        actor: actor(actor_context),
        query: scalarValues(filters),
        ...(export_password ? { exportPassword: export_password } : {}),
        tool: "traco_ekspor_laporan",
      },
    )),
  );

  server.registerTool(
    "traco_ekspor_my_work",
    {
      title: "Ekspor My Work Traco",
      description: "Mengambil rekap aktivitas dan lampiran milik actor dalam format XLSX atau PDF. Filter type/date/month/year mengikuti menu My Work dan hasil dikembalikan sebagai base64 tanpa URL publik.",
      inputSchema: z.object({
        actor_context: actorContext,
        format: z.enum(["xlsx", "pdf"]).default("xlsx"),
        filters: payload,
        export_password: z.string().min(12).max(128).optional().describe("Sandi opsional untuk mengenkripsi berkas laporan."),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, format, filters, export_password }) => runTool(() => api.downloadReport(
      "/mcp/v1/my-activities/export",
      {
        actor: actor(actor_context),
        query: { ...scalarValues(filters), format },
        ...(export_password ? { exportPassword: export_password } : {}),
        tool: "traco_ekspor_my_work",
      },
    )),
  );
}

type ReadOperation = (typeof readOperations)[number];
type WriteOperation = (typeof writeOperations)[number];
type ReadRequest = { path: string; query?: Record<string, string | number | boolean> };
type WriteRequest = { method: "POST" | "PUT" | "PATCH" | "DELETE"; path: string; body?: JsonRecord };

function readRequest(operation: ReadOperation, data: JsonRecord): ReadRequest {
  switch (operation) {
    case "ringkasan_saya": return { path: "/mcp/v1/context" };
    case "daftar_proyek": return { path: "/mcp/v1/projects" };
    case "daftar_semua_divisi": return { path: "/mcp/v1/divisions", query: scalarValues(data) };
    case "daftar_divisi": return { path: "/mcp/v1/my-divisions" };
    case "detail_divisi": return withId("/mcp/v1/divisions", data, "division_id");
    case "anggota_divisi": return withId("/mcp/v1/divisions", data, "division_id", "/members");
    case "aktivitas_divisi": return withId("/mcp/v1/divisions", data, "division_id", "/activities");
    case "daftar_workspace": return withId("/mcp/v1/divisions", data, "division_id", "/workspaces");
    case "detail_workspace": return withId("/mcp/v1/workspaces", data, "workspace_id");
    case "daftar_campaign": return withId("/mcp/v1/workspaces", data, "workspace_id", "/campaigns");
    case "detail_campaign": return withId("/mcp/v1/campaigns", data, "campaign_id");
    case "anggota_campaign": return withId("/mcp/v1/campaigns", data, "campaign_id", "/members");
    case "ringkasan_campaign": return withId("/mcp/v1/campaigns", data, "campaign_id", "/stats");
    case "progress_campaign": return withId("/mcp/v1/campaigns", data, "campaign_id", "/board-progress");
    case "timeline_campaign": return withId("/mcp/v1/campaigns", data, "campaign_id", "/gantt");
    case "kesehatan_campaign": return withId("/mcp/v1/campaigns", data, "campaign_id", "/health");
    case "tugas_terlambat_campaign": return withId("/mcp/v1/campaigns", data, "campaign_id", "/overdue-tasks");
    case "daftar_board": return withId("/mcp/v1/campaigns", data, "campaign_id", "/boards");
    case "daftar_kartu_board": return withId("/mcp/v1/boards", data, "board_id", "/cards");
    case "cari_kartu": return { path: "/mcp/v1/cards/search", query: scalarValues(data) };
    case "detail_kartu": return withId("/mcp/v1/cards", data, "card_id");
    case "daftar_komentar": return withId("/mcp/v1/cards", data, "card_id", "/comments");
    case "daftar_checklist": return withId("/mcp/v1/cards", data, "card_id", "/tasks");
    case "daftar_subtask": return withId("/mcp/v1/tasks", data, "task_id", "/subtasks");
    case "aktivitas_kartu": return withId("/mcp/v1/cards", data, "card_id", "/activities");
    case "daftar_label": return { path: "/mcp/v1/labels", query: scalarValues(data) };
    case "detail_label": return withId("/mcp/v1/labels", data, "label_id");
    case "daftar_brand": return { path: "/mcp/v1/brands", query: scalarValues(data) };
    case "detail_brand": return withId("/mcp/v1/brands", data, "brand_id");
    case "daftar_lampiran_kartu": return withId("/mcp/v1/cards", data, "card_id", "/attachments");
    case "daftar_brief_kartu": return withId("/mcp/v1/cards", data, "card_id", "/brief-attachments");
    case "daftar_template_deskripsi_hasil": return { path: "/mcp/v1/result-description-templates", query: scalarValues(data) };
    case "kalender": return { path: "/mcp/v1/calendar", query: scalarValues(data) };
    case "opsi_kalender": return { path: "/mcp/v1/calendar/create-options", query: scalarValues(data) };
    case "tanggal_kalender": return withId("/mcp/v1/calendar", data, "date");
    case "dashboard": return { path: "/mcp/v1/dashboard", query: scalarValues(data) };
    case "peringkat_divisi_dashboard": return { path: "/mcp/v1/dashboard/division-rankings", query: scalarValues(data) };
    case "aktivitas_dashboard": return { path: "/mcp/v1/dashboard/activities", query: scalarValues(data) };
    case "notifikasi": return { path: "/mcp/v1/notifications", query: scalarValues(data) };
    case "ruang_chat": return { path: "/mcp/v1/chat/rooms", query: scalarValues(data) };
    case "detail_ruang_chat": return withId("/mcp/v1/chat/rooms", data, "chat_room_id");
    case "pesan_chat": return withId("/mcp/v1/chat/rooms", data, "chat_room_id", "/messages");
    case "daftar_form": return { path: "/mcp/v1/forms", query: scalarValues(data) };
    case "detail_form": return withId("/mcp/v1/forms", data, "form_id");
    case "jawaban_form": return withId("/mcp/v1/forms", data, "form_id", "/submissions");
    case "detail_jawaban_form": return withId("/mcp/v1/form-submissions", data, "submission_id");
    case "filter_laporan": return { path: "/mcp/v1/reports/filters" };
    case "daftar_personel_laporan": return { path: "/mcp/v1/reports/users", query: scalarValues(data) };
    case "rincian_laporan_personel": return withId("/mcp/v1/reports/users", data, "user_id", "/cards", true);
    case "aktivitas_laporan_personel": return withId("/mcp/v1/reports/users", data, "user_id", "/activity-logs", true);
    case "pratinjau_laporan_pdf": return { path: "/mcp/v1/reports/preview/pdf", query: scalarValues(data) };
    case "cari_kandidat_penerima_tugas": return { path: "/mcp/v1/assignment-candidates", query: scalarValues(data) };
    case "pengguna_dapat_disebut": return { path: "/mcp/v1/users/mentionable", query: scalarValues(data) };
    case "daftar_pengguna": return { path: "/mcp/v1/users", query: scalarValues(data) };
    case "detail_pengguna": return withId("/mcp/v1/users", data, "user_id");
    case "detail_aktivitas_pengguna": return withId("/mcp/v1/users", data, "user_id", "/details");
    case "izin_pengguna": return withId("/mcp/v1/users", data, "user_id", "/permissions");
    case "statistik_pengguna": return { path: "/mcp/v1/users-stats", query: scalarValues(data) };
    case "todo_harian": return { path: "/mcp/v1/daily-todo", query: scalarValues(data) };
    case "aktivitas_saya": return { path: "/mcp/v1/my-activities", query: scalarValues(data) };
    case "peringkat_penyelesaian": return { path: "/mcp/v1/my-activities/completion-ranking", query: scalarValues(data) };
    case "lampiran_saya": return { path: "/mcp/v1/my-activities/attachments", query: scalarValues(data) };
  }
}

function writeRequest(operation: WriteOperation, data: JsonRecord): WriteRequest {
  switch (operation) {
    case "buat_divisi": return bodyRequest("POST", "/mcp/v1/divisions", data);
    case "ubah_divisi": return withWriteId("PUT", "/mcp/v1/divisions", data, "division_id");
    case "hapus_divisi": return withWriteId("DELETE", "/mcp/v1/divisions", data, "division_id");
    case "tambah_anggota_divisi": return withWriteId("POST", "/mcp/v1/divisions", data, "division_id", "/members");
    case "ubah_peran_anggota_divisi": return withWriteIds("PUT", "/mcp/v1/divisions", data, "division_id", "user_id", "/members/");
    case "hapus_anggota_divisi": return withWriteIds("DELETE", "/mcp/v1/divisions", data, "division_id", "user_id", "/members/");
    case "buat_workspace": return withWriteId("POST", "/mcp/v1/divisions", data, "division_id", "/workspaces");
    case "ubah_workspace": return withWriteId("PUT", "/mcp/v1/workspaces", data, "workspace_id");
    case "hapus_workspace": return withWriteId("DELETE", "/mcp/v1/workspaces", data, "workspace_id");
    case "buat_campaign": return withWriteId("POST", "/mcp/v1/workspaces", data, "workspace_id", "/campaigns");
    case "ubah_campaign": return withWriteId("PUT", "/mcp/v1/campaigns", data, "campaign_id");
    case "hapus_campaign": return withWriteId("DELETE", "/mcp/v1/campaigns", data, "campaign_id");
    case "tambah_anggota_campaign": return withWriteId("POST", "/mcp/v1/campaigns", data, "campaign_id", "/members");
    case "hapus_anggota_campaign": return withWriteIds("DELETE", "/mcp/v1/campaigns", data, "campaign_id", "user_id", "/members/");
    case "buat_board": return withWriteId("POST", "/mcp/v1/campaigns", data, "campaign_id", "/boards");
    case "ubah_board": return withWriteId("PUT", "/mcp/v1/boards", data, "board_id");
    case "urutkan_board": return bodyRequest("PATCH", "/mcp/v1/boards/reorder", data);
    case "hapus_board": return withWriteId("DELETE", "/mcp/v1/boards", data, "board_id");
    case "buat_kartu": return withWriteId("POST", "/mcp/v1/boards", data, "board_id", "/cards");
    case "ubah_kartu": return withWriteId("PUT", "/mcp/v1/cards", data, "card_id");
    case "pindah_kartu": return withWriteId("PATCH", "/mcp/v1/cards", data, "card_id", "/move");
    case "urutkan_kartu": return bodyRequest("PATCH", "/mcp/v1/cards/reorder", data);
    case "hapus_kartu": return withWriteId("DELETE", "/mcp/v1/cards", data, "card_id");
    case "tugaskan_kartu": return withWriteId("POST", "/mcp/v1/cards", data, "card_id", "/assign");
    case "lepaskan_penerima_tugas": return withWriteIds("DELETE", "/mcp/v1/cards", data, "card_id", "user_id", "/assign/");
    case "tambah_lampiran_tautan": return withWriteId("POST", "/mcp/v1/cards", requireLinkAttachment(data), "card_id", "/attachments");
    case "tambah_brief_lampiran_tautan": return withWriteId("POST", "/mcp/v1/cards", requireLinkAttachment(data), "card_id", "/brief-attachments");
    case "hapus_brief_lampiran": return withWriteId("DELETE", "/mcp/v1/brief-attachments", data, "attachment_id");
    case "hapus_lampiran": return withWriteId("DELETE", "/mcp/v1/attachments", data, "attachment_id");
    case "arsipkan_lampiran": return withWriteId("POST", "/mcp/v1/attachments", data, "attachment_id", "/archive");
    case "pulihkan_lampiran": return withWriteId("POST", "/mcp/v1/attachments", data, "attachment_id", "/restore");
    case "tambah_komentar": return withWriteId("POST", "/mcp/v1/cards", data, "card_id", "/comments");
    case "ubah_komentar": return withWriteId("PUT", "/mcp/v1/comments", data, "comment_id");
    case "hapus_komentar": return withWriteId("DELETE", "/mcp/v1/comments", data, "comment_id");
    case "tambah_checklist": return withWriteId("POST", "/mcp/v1/cards", data, "card_id", "/tasks");
    case "atur_status_checklist": return withWriteId("PUT", "/mcp/v1/tasks", data, "task_id", "/status");
    case "ubah_checklist": return withWriteId("PUT", "/mcp/v1/tasks", data, "task_id");
    case "urutkan_checklist": return bodyRequest("PATCH", "/mcp/v1/tasks/reorder", data);
    case "hapus_checklist": return withWriteId("DELETE", "/mcp/v1/tasks", data, "task_id");
    case "tambah_subtask": return withWriteId("POST", "/mcp/v1/tasks", data, "task_id", "/subtasks");
    case "ubah_subtask": return withWriteId("PUT", "/mcp/v1/subtasks", data, "subtask_id");
    case "selesaikan_subtask": return withWriteId("PATCH", "/mcp/v1/subtasks", data, "subtask_id", "/complete");
    case "hapus_subtask": return withWriteId("DELETE", "/mcp/v1/subtasks", data, "subtask_id");
    case "buat_label": return bodyRequest("POST", "/mcp/v1/labels", data);
    case "ubah_label": return withWriteId("PUT", "/mcp/v1/labels", data, "label_id");
    case "hapus_label": return withWriteId("DELETE", "/mcp/v1/labels", data, "label_id");
    case "pasang_label_kartu": return withWriteId("POST", "/mcp/v1/cards", data, "card_id", "/labels");
    case "pasang_label_toggle": return withWriteId("PATCH", "/mcp/v1/cards", data, "card_id", "/labels");
    case "lepas_label_kartu": return withWriteIds("DELETE", "/mcp/v1/cards", data, "card_id", "label_id", "/labels/");
    case "buat_brand": return bodyRequest("POST", "/mcp/v1/brands", data);
    case "ubah_brand": return withWriteId("PUT", "/mcp/v1/brands", data, "brand_id");
    case "hapus_brand": return withWriteId("DELETE", "/mcp/v1/brands", data, "brand_id");
    case "pasang_brand_kartu": return withWriteIds("POST", "/mcp/v1/cards", data, "card_id", "brand_id", "/brands/", "/attach");
    case "lepas_brand_kartu": return withWriteIds("DELETE", "/mcp/v1/cards", data, "card_id", "brand_id", "/brands/", "/detach");
    case "buat_chat_pribadi": return bodyRequest("POST", "/mcp/v1/chat/rooms/dm", data);
    case "kirim_pesan_chat": return withWriteId("POST", "/mcp/v1/chat/rooms", data, "chat_room_id", "/messages");
    case "tandai_chat_dibaca": return withWriteId("POST", "/mcp/v1/chat/rooms", data, "chat_room_id", "/read");
    case "hapus_pesan_chat": return withWriteId("DELETE", "/mcp/v1/chat/messages", data, "message_id");
    case "tandai_semua_notifikasi_dibaca": return bodyRequest("PATCH", "/mcp/v1/notifications/read-all", data);
    case "tandai_notifikasi_dibaca": return withWriteId("PATCH", "/mcp/v1/notifications", data, "notification_id", "/read");
    case "hapus_notifikasi": return withWriteId("DELETE", "/mcp/v1/notifications", data, "notification_id");
    case "buat_form": return bodyRequest("POST", "/mcp/v1/forms", data);
    case "ubah_form": return withWriteId("PUT", "/mcp/v1/forms", data, "form_id");
    case "hapus_form": return withWriteId("DELETE", "/mcp/v1/forms", data, "form_id");
    case "tambah_field_form": return withWriteId("POST", "/mcp/v1/forms", data, "form_id", "/fields");
    case "ubah_field_form": return withWriteId("PUT", "/mcp/v1/form-fields", data, "field_id");
    case "hapus_field_form": return withWriteId("DELETE", "/mcp/v1/form-fields", data, "field_id");
    case "isi_form": return withWriteId("POST", "/mcp/v1/forms", data, "form_id", "/submissions");
    case "teruskan_jawaban_ke_kartu": return withWriteId("PATCH", "/mcp/v1/form-submissions", data, "submission_id", "/forward");
    case "tugaskan_jawaban_form": return withWriteId("POST", "/mcp/v1/form-submissions", data, "submission_id", "/assign");
    case "buat_template_deskripsi_hasil": return bodyRequest("POST", "/mcp/v1/result-description-templates", data);
    case "buat_pengguna": return bodyRequest("POST", "/mcp/v1/users", data);
    case "ubah_pengguna": return withWriteId("PUT", "/mcp/v1/users", data, "user_id");
    case "hapus_pengguna": return withWriteId("DELETE", "/mcp/v1/users", data, "user_id");
    case "atur_izin_pengguna": return withWriteId("PUT", "/mcp/v1/users", data, "user_id", "/permissions");
    case "reset_password_pengguna": return withWriteId("PUT", "/mcp/v1/users", data, "user_id", "/password");
    case "qc_lampiran_laporan": return withWriteId("POST", "/mcp/v1/reports/attachments", data, "attachment_id", "/qc");
  }
}

function withId(prefix: string, data: JsonRecord, idKey: string, suffix = "", includeQuery = false): ReadRequest {
  const id = requiredString(data, idKey);
  return {
    path: `${prefix}/${encodeURIComponent(id)}${suffix}`,
    ...(includeQuery ? { query: scalarValues(without(data, idKey)) } : {}),
  };
}

function withWriteId(method: WriteRequest["method"], prefix: string, data: JsonRecord, idKey: string, suffix = ""): WriteRequest {
  const id = requiredString(data, idKey);
  return bodyRequest(method, `${prefix}/${encodeURIComponent(id)}${suffix}`, without(data, idKey));
}

function withWriteIds(method: WriteRequest["method"], prefix: string, data: JsonRecord, firstKey: string, secondKey: string, middle: string, suffix = ""): WriteRequest {
  const first = requiredString(data, firstKey);
  const second = requiredString(data, secondKey);
  return bodyRequest(method, `${prefix}/${encodeURIComponent(first)}${middle}${encodeURIComponent(second)}${suffix}`, without(data, firstKey, secondKey));
}

function bodyRequest(method: WriteRequest["method"], path: string, body: JsonRecord): WriteRequest {
  return { method, path, ...(method === "DELETE" || Object.keys(body).length === 0 ? {} : { body }) };
}

function requiredString(data: JsonRecord, key: string): string {
  const value = data[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`data.${key} wajib diisi untuk tindakan ini.`);
  }
  const normalized = value.trim();
  if (normalized.length > 128 || /[\\\0\r\n?#]/.test(normalized)) {
    throw new Error(`data.${key} memiliki format yang tidak valid.`);
  }
  if (key === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("data.date harus berformat YYYY-MM-DD.");
  }
  if (key.endsWith("_id") && !isUuid(normalized)) {
    throw new Error(`data.${key} harus berupa UUID yang valid.`);
  }
  return normalized;
}

function without(data: JsonRecord, ...keys: string[]): JsonRecord {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !keys.includes(key)));
}

function scalarValues(data: JsonRecord): Record<string, string | number | boolean> {
  const invalid = Object.entries(data).filter(([, value]) => (
    value !== undefined && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean"
  ));
  if (invalid.length > 0) {
    throw new Error(`Filter ${invalid.map(([key]) => `data.${key}`).join(", ")} harus berupa nilai sederhana.`);
  }
  return Object.fromEntries(Object.entries(data).filter(([, value]) => (
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
  ))) as Record<string, string | number | boolean>;
}

function isUuid(value: string): boolean {
  return z.uuid().safeParse(value).success;
}

function requireLinkAttachment(data: JsonRecord): JsonRecord {
  if (data.type !== "link" || typeof data.link_url !== "string") {
    throw new Error("Lampiran MCP hanya mendukung tautan. Isi data.type='link' dan data.link_url yang valid.");
  }
  try {
    const url = new URL(data.link_url);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported protocol");
  } catch {
    throw new Error("data.link_url harus berupa URL HTTP/HTTPS yang valid.");
  }
  return data;
}
