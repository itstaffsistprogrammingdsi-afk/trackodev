import { createHash, randomUUID } from "node:crypto";
import { TracoApiError, TracoClient } from "./traco-client.js";

export type RelayOutcome =
  | { status: "sent"; roomId: string }
  | { status: "unmapped" }
  | { status: "not_linked" }
  | { status: "failed"; message: string };

export type LinkOutcome =
  | { status: "linked" }
  | { status: "invalid_code" }
  | { status: "failed"; message: string };

export type GoogleChatLinker = (input: {
  actorSub: string;
  displayName?: string;
  code: string;
}) => Promise<LinkOutcome>;

const LINK_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$/i;

export type RelayMapping = {
  resolveRoom(spaceName?: string): string | undefined;
};

export type RelayInput = {
  actorSub: string;
  spaceName?: string;
  text: string;
  /**
   * Kunci idempotensi deterministik. Bila diisi, retry delivery Google Chat
   * untuk pesan yang sama tidak akan membuat pesan ganda di Traco.
   */
  idempotencySeed?: string;
};

export type GoogleChatRelay = (input: RelayInput) => Promise<RelayOutcome>;

/**
 * Membangun pemetaan space Google Chat -> ruang chat Traco. Nama space
 * dicocokkan tanpa membedakan huruf besar/kecil; bila tidak ada, dipakai
 * ruang default.
 */
export function buildRelayMapping(options: {
  defaultRoomId?: string;
  spaceRoomMap: Record<string, string>;
}): RelayMapping {
  const normalized = new Map<string, string>();
  for (const [space, room] of Object.entries(options.spaceRoomMap)) {
    const key = space.trim().toLowerCase();
    const value = room.trim();
    if (key && value) normalized.set(key, value);
  }
  const fallback = options.defaultRoomId?.trim() || undefined;

  return {
    resolveRoom(spaceName?: string) {
      const key = spaceName?.trim().toLowerCase();
      if (key && normalized.has(key)) return normalized.get(key);
      return fallback;
    },
  };
}

export function createGoogleChatRelay(api: TracoClient, mapping: RelayMapping): GoogleChatRelay {
  return async function relay(input: RelayInput): Promise<RelayOutcome> {
    const text = input.text.trim();
    if (!text) return { status: "failed", message: "Pesan kosong." };

    const roomId = mapping.resolveRoom(input.spaceName);
    if (!roomId) return { status: "unmapped" };

    try {
      await api.request(`/mcp/v1/chat/rooms/${roomId}/messages`, {
        method: "POST",
        actor: { provider: "google_chat", sub: input.actorSub },
        body: { content: text },
        idempotencyKey: input.idempotencySeed
          ? deterministicUuid(input.idempotencySeed)
          : randomUUID(),
        tool: "kirim_pesan_chat",
      });
      return { status: "sent", roomId };
    } catch (error) {
      if (error instanceof TracoApiError) {
        if (error.status === 401) return { status: "not_linked" };
        if (error.status === 403) {
          return { status: "failed", message: "Akun Anda tidak memiliki akses ke ruang chat tujuan." };
        }
        if (error.status === 404) {
          return { status: "failed", message: "Ruang chat tujuan tidak ditemukan di Traco." };
        }
        if (error.status === 429) {
          return { status: "failed", message: "Terlalu banyak pesan. Coba lagi sebentar." };
        }
      }
      return {
        status: "failed",
        message: error instanceof Error ? error.message : "Gagal mengirim pesan ke Traco.",
      };
    }
  };
}

/**
 * UUID deterministik (mirip v5) dari sebuah seed. Dipakai untuk idempotensi
 * delivery Google Chat tanpa menyimpan state tambahan.
 */
export function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
  // Set versi 5 dan varian RFC 4122.
  hex[12] = "5";
  const variantNibble = parseInt(hex[16] ?? "0", 16);
  hex[16] = ((variantNibble & 0x3) | 0x8).toString(16);
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

/**
 * Mengenali perintah linking mandiri, mis. "/link AB12-CD34". Mengembalikan
 * kode yang dinormalisasi (tanpa tanda hubung, huruf besar) atau null.
 */
export function parseLinkCommand(text: string): string | null {
  const raw = text.trim().match(/^\/link\s+([A-HJ-NP-Z2-9-]{8,9})$/i)?.[1];
  if (!raw || !LINK_CODE_PATTERN.test(raw)) return null;
  return raw.replace(/-/g, "").toUpperCase();
}

/**
 * Menghubungkan user Google Chat ke user Traco memakai kode sekali-pakai dari
 * menu Integrations Traco. Tidak memerlukan AI agent.
 */
export function createGoogleChatLinker(api: TracoClient): GoogleChatLinker {
  return async function link(input) {
    const code = input.code.trim();
    if (!LINK_CODE_PATTERN.test(code)) return { status: "invalid_code" };

    try {
      await api.request("/mcp/v1/identities/link", {
        method: "POST",
        body: {
          provider: "google_chat",
          code,
          external_user_id: input.actorSub,
          ...(input.displayName ? { display_name: input.displayName } : {}),
        },
        idempotencyKey: deterministicUuid(`link:${input.actorSub}:${code.toUpperCase()}`),
        tool: "traco_link_google_chat_account",
      });
      return { status: "linked" };
    } catch (error) {
      if (error instanceof TracoApiError) {
        if (error.status === 404 || error.status === 422) return { status: "invalid_code" };
      }
      return {
        status: "failed",
        message: error instanceof Error ? error.message : "Gagal menghubungkan akun.",
      };
    }
  };
}
