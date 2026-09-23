import { z } from "zod/v4";

const optionalUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().url().optional(),
);

const optionalSecret = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(32).optional(),
);

const optionalRoomId = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.uuid().optional(),
);

const booleanFlag = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off", ""].includes(normalized)) return false;
    return value;
  },
  z.boolean(),
);

const googleChatEnvironmentSchema = z.object({
  GOOGLE_CHAT_HOST: z.string().default("127.0.0.1"),
  GOOGLE_CHAT_PORT: z.coerce.number().int().min(1).max(65535).default(3443),
  GOOGLE_CHAT_PATH: z.string().regex(/^\/[A-Za-z0-9._~-]{1,80}$/).default("/google-chat/events"),
  GOOGLE_CHAT_AUDIENCE: z.string().min(1),
  // Agent AI eksternal bersifat OPSIONAL. Bila kosong, gateway tetap berjalan
  // sebagai relay dua arah ke ruang chat Traco.
  GOOGLE_CHAT_AGENT_URL: optionalUrl,
  GOOGLE_CHAT_AGENT_BEARER_TOKEN: optionalSecret,
  GOOGLE_CHAT_AGENT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(25000),
  DISCORD_ACTOR_SIGNING_SECRET: z.string().min(32),
  MCP_MAX_REQUEST_BYTES: z.coerce.number().int().min(16 * 1024).max(8 * 1024 * 1024).default(2 * 1024 * 1024),

  // ---- Relay dua arah Google Chat <-> ruang chat Traco -------------------
  // Aktifkan agar pesan Google Chat ditulis langsung ke ruang chat Traco tanpa
  // memerlukan AI agent. Perintah (prefix/mention) tetap diteruskan ke agent.
  GOOGLE_CHAT_RELAY_ENABLED: booleanFlag.default(false),
  // Ruang chat Traco tujuan default bila space tidak ada di peta di bawah.
  GOOGLE_CHAT_RELAY_DEFAULT_ROOM_ID: optionalRoomId,
  // Peta space -> ruang chat, format: spaces/AAA=<uuid>,spaces/BBB=<uuid>
  GOOGLE_CHAT_RELAY_SPACE_ROOM_MAP: z.string().default(""),
  // Pesan dianggap perintah agent bila diawali prefix ini (default "/").
  GOOGLE_CHAT_COMMAND_PREFIX: z.string().max(8).default("/"),
  // ...atau menyebut mention ini (case-insensitive, default "@traco").
  GOOGLE_CHAT_MENTION: z.string().max(32).default("@traco"),
});

export type GoogleChatConfig = {
  host: string;
  port: number;
  path: string;
  audience: string;
  agentUrl?: string;
  agentBearerToken?: string;
  actorSigningSecret: string;
  requestTimeoutMs: number;
  maxRequestBytes: number;
  relayEnabled: boolean;
  defaultRoomId?: string;
  spaceRoomMap: Record<string, string>;
  commandPrefix: string;
  mention: string;
};

export function loadGoogleChatConfig(environment: NodeJS.ProcessEnv = process.env): GoogleChatConfig {
  const parsed = googleChatEnvironmentSchema.safeParse(environment);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Konfigurasi Google Chat gateway tidak valid: ${details}`);
  }
  const values = parsed.data;

  if (values.GOOGLE_CHAT_AGENT_URL) {
    const agentUrl = new URL(values.GOOGLE_CHAT_AGENT_URL);
    const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(agentUrl.hostname);
    if (agentUrl.protocol !== "https:" && !loopback) {
      throw new Error("GOOGLE_CHAT_AGENT_URL wajib menggunakan HTTPS kecuali alamat loopback.");
    }
  }

  const spaceRoomMap = parseSpaceRoomMap(values.GOOGLE_CHAT_RELAY_SPACE_ROOM_MAP);

  if (
    values.GOOGLE_CHAT_RELAY_ENABLED
    && !values.GOOGLE_CHAT_RELAY_DEFAULT_ROOM_ID
    && Object.keys(spaceRoomMap).length === 0
  ) {
    throw new Error(
      "Relay Google Chat aktif tetapi tidak ada ruang tujuan. Isi GOOGLE_CHAT_RELAY_DEFAULT_ROOM_ID atau GOOGLE_CHAT_RELAY_SPACE_ROOM_MAP.",
    );
  }

  return {
    host: values.GOOGLE_CHAT_HOST,
    port: values.GOOGLE_CHAT_PORT,
    path: values.GOOGLE_CHAT_PATH,
    audience: values.GOOGLE_CHAT_AUDIENCE,
    ...(values.GOOGLE_CHAT_AGENT_URL ? { agentUrl: values.GOOGLE_CHAT_AGENT_URL } : {}),
    ...(values.GOOGLE_CHAT_AGENT_BEARER_TOKEN ? { agentBearerToken: values.GOOGLE_CHAT_AGENT_BEARER_TOKEN } : {}),
    actorSigningSecret: values.DISCORD_ACTOR_SIGNING_SECRET,
    requestTimeoutMs: values.GOOGLE_CHAT_AGENT_TIMEOUT_MS,
    maxRequestBytes: values.MCP_MAX_REQUEST_BYTES,
    relayEnabled: values.GOOGLE_CHAT_RELAY_ENABLED,
    ...(values.GOOGLE_CHAT_RELAY_DEFAULT_ROOM_ID
      ? { defaultRoomId: values.GOOGLE_CHAT_RELAY_DEFAULT_ROOM_ID }
      : {}),
    spaceRoomMap,
    commandPrefix: values.GOOGLE_CHAT_COMMAND_PREFIX,
    mention: values.GOOGLE_CHAT_MENTION,
  };
}

/**
 * Mengurai "spaces/AAA=<uuid>,spaces/BBB=<uuid>" menjadi objek. Entri kosong
 * atau tidak valid diabaikan agar satu salah ketik tidak mematikan gateway.
 */
export function parseSpaceRoomMap(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const space = trimmed.slice(0, separator).trim();
    const roomId = trimmed.slice(separator + 1).trim();
    if (!space || !z.uuid().safeParse(roomId).success) continue;
    map[space] = roomId;
  }
  return map;
}

/**
 * Pesan dianggap perintah AI bila diawali command prefix atau menyebut mention.
 */
export function isAgentCommand(text: string, config: Pick<GoogleChatConfig, "commandPrefix" | "mention">): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (config.commandPrefix && trimmed.startsWith(config.commandPrefix)) return true;
  const mention = config.mention.trim().toLowerCase();
  return mention !== "" && trimmed.toLowerCase().includes(mention);
}
