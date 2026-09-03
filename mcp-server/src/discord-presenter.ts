type JsonObject = Record<string, unknown>;

export function formatDiscordResult(subcommand: string, payload: unknown): string {
  const body = asObject(payload);
  if (!body) return "Traco mengembalikan respons yang tidak dapat dibaca.";

  const message = asString(body.message);
  const data = body.data;

  if (subcommand === "link") {
    const user = asObject(asObject(data)?.user);
    return truncate([
      message ?? "Akun Discord berhasil dihubungkan ke Traco.",
      user ? `User: ${asString(user.name) ?? "-"} (${asString(user.email) ?? "-"})` : null,
    ].filter(Boolean).join("\n"));
  }

  if (subcommand === "whoami") {
    const user = asObject(asObject(data)?.user);
    if (!user) return "Identitas Traco tidak ditemukan pada respons server.";
    const roles = asArray(user.roles).map(asString).filter(Boolean);
    const divisions = asArray(user.divisions)
      .map(asObject)
      .filter(Boolean)
      .map((division) => `${asString(division?.name) ?? "-"}${asString(division?.role) ? ` (${asString(division?.role)})` : ""}`);

    return truncate([
      `Terhubung sebagai **${escapeMarkdown(asString(user.name) ?? "-")}**`,
      `Email: ${escapeMarkdown(asString(user.email) ?? "-")}`,
      `Role: ${roles.map((role) => escapeMarkdown(role ?? "")).join(", ") || "-"}`,
      `Divisi: ${divisions.map(escapeMarkdown).join(", ") || "-"}`,
    ].join("\n"));
  }

  if (subcommand === "projects") {
    const workspaces = asArray(data).map(asObject).filter(Boolean);
    if (workspaces.length === 0) return "Tidak ada project Traco yang dapat diakses.";

    const lines: string[] = [`**Project yang dapat diakses (${workspaces.length} workspace)**`];
    for (const workspace of workspaces) {
      lines.push(`\n**${escapeMarkdown(asString(workspace?.name) ?? "Workspace")}**`);
      for (const campaign of asArray(workspace?.campaigns).map(asObject).filter(Boolean)) {
        lines.push(`• ${escapeMarkdown(asString(campaign?.name) ?? "Campaign")}`);
        for (const board of asArray(campaign?.boards).map(asObject).filter(Boolean)) {
          lines.push(`  ↳ ${escapeMarkdown(asString(board?.name) ?? "Board")} — \`${asString(board?.id) ?? "-"}\``);
        }
      }
    }
    return truncate(lines.join("\n"));
  }

  if (subcommand === "cards") {
    const cards = asArray(data).map(asObject).filter(Boolean);
    const total = asString(asObject(body.meta)?.total) ?? String(cards.length);
    if (cards.length === 0) return "Tidak ada card yang cocok.";

    const lines = [`**Hasil pencarian card (${total})**`];
    for (const card of cards) {
      const state = [asString(card?.status), asString(card?.priority)].filter(Boolean).join(" · ");
      lines.push(`• **${escapeMarkdown(asString(card?.title) ?? "Tanpa judul")}**${state ? ` — ${state}` : ""}`);
      lines.push(`  \`${asString(card?.id) ?? "-"}\``);
    }
    return truncate(lines.join("\n"));
  }

  if (subcommand === "card") {
    const card = asObject(data);
    if (!card) return "Detail card tidak ditemukan pada respons server.";
    const board = asObject(card.board);
    const campaign = asObject(card.campaign);
    return truncate([
      `**${escapeMarkdown(asString(card.title) ?? "Tanpa judul")}**`,
      `ID: \`${asString(card.id) ?? "-"}\``,
      `Status: ${asString(card.status) ?? "-"} · Prioritas: ${asString(card.priority) ?? "-"}`,
      `Campaign: ${escapeMarkdown(asString(campaign?.name) ?? "-")} · Board: ${escapeMarkdown(asString(board?.name) ?? "-")}`,
      `Due: ${asString(card.due_date) ?? "-"}`,
      asString(card.description) ? `\n${escapeMarkdown(asString(card.description) ?? "")}` : null,
    ].filter(Boolean).join("\n"));
  }

  if (subcommand === "comment") {
    return truncate(message ?? "Komentar berhasil ditambahkan ke Traco.");
  }

  return truncate(message ?? "Permintaan Traco berhasil diproses.");
}

export function formatDiscordError(payload: unknown): string {
  const body = asObject(payload);
  const error = asObject(body?.error);
  return truncate(`Permintaan Traco gagal: ${asString(error?.message) ?? asString(body?.message) ?? "kesalahan tidak diketahui"}`);
}

function asObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+\-.!|>~])/g, "\\$1");
}

function truncate(value: string): string {
  const maxLength = 1900;
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 16)}\n…hasil dipotong`;
}
