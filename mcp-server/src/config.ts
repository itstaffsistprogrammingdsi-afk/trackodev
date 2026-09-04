import { z } from "zod/v4";

const optionalSnowflake = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().regex(/^\d{15,22}$/).optional(),
);

const environmentSchema = z.object({
  TRACO_API_URL: z.string().url().transform((value) => value.replace(/\/$/, "")),
  TRACO_MCP_API_KEY: z.string().min(40),
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),
  MCP_HTTP_HOST: z.string().default("127.0.0.1"),
  MCP_HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  MCP_ALLOWED_HOSTS: z.string().default("127.0.0.1,localhost,[::1]"),
  MCP_HTTP_BEARER_TOKEN: z.string().min(32).optional(),
  MCP_ALLOWED_ORIGINS: z.string().default(""),
  DISCORD_ACTOR_SIGNING_SECRET: z.string().min(32),
  DISCORD_ALLOWED_GUILD_IDS: z.string().default(""),
  // Gateway Discord memakai guild ini untuk registrasi slash command. Ketika
  // allow-list MCP belum diisi, gunakan sebagai default yang aman agar actor
  // context dari guild lain tetap ditolak.
  DISCORD_GUILD_ID: optionalSnowflake,
  DISCORD_ACTOR_MAX_TTL_SECONDS: z.coerce.number().int().min(30).max(900).default(300),
  TRACO_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
  MCP_MAX_REQUEST_BYTES: z.coerce.number().int().min(16 * 1024).max(8 * 1024 * 1024).default(2 * 1024 * 1024),
  TRACO_MAX_RESPONSE_BYTES: z.coerce.number().int().min(64 * 1024).max(50 * 1024 * 1024).default(8 * 1024 * 1024),
  TRACO_MAX_EXPORT_BYTES: z.coerce.number().int().min(64 * 1024).max(50 * 1024 * 1024).default(20 * 1024 * 1024),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type AppConfig = {
  tracoApiUrl: string;
  tracoApiKey: string;
  transport: "stdio" | "http";
  httpHost: string;
  httpPort: number;
  allowedHosts: string[];
  httpBearerToken?: string;
  allowedOrigins: string[];
  actorSigningSecret: string;
  allowedGuildIds: string[];
  actorMaxTtlSeconds: number;
  requestTimeoutMs: number;
  /** Optional for embedders that construct AppConfig directly; env-loaded
   * configurations always contain these values. */
  maxRequestBytes?: number;
  maxResponseBytes?: number;
  maxExportBytes?: number;
  logLevel: "debug" | "info" | "warn" | "error";
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Konfigurasi MCP tidak valid: ${details}`);
  }

  const values = parsed.data;
  const tracoUrl = new URL(values.TRACO_API_URL);
  const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (tracoUrl.search || tracoUrl.hash || tracoUrl.username || tracoUrl.password) {
    throw new Error("TRACO_API_URL tidak boleh memuat kredensial, query string, atau fragment.");
  }
  if (tracoUrl.protocol !== "https:" && !loopbackHosts.has(tracoUrl.hostname)) {
    throw new Error("TRACO_API_URL wajib menggunakan HTTPS kecuali untuk alamat loopback.");
  }
  if (values.MCP_TRANSPORT === "http" && !values.MCP_HTTP_BEARER_TOKEN) {
    throw new Error("MCP_HTTP_BEARER_TOKEN wajib diisi pada mode HTTP.");
  }

  const allowedHosts = splitCsv(values.MCP_ALLOWED_HOSTS);
  if (values.MCP_TRANSPORT === "http" && (allowedHosts.length === 0 || allowedHosts.includes("*"))) {
    throw new Error("MCP_ALLOWED_HOSTS wajib berisi host eksplisit pada mode HTTP.");
  }
  const allowedOrigins = splitCsv(values.MCP_ALLOWED_ORIGINS);
  for (const origin of allowedOrigins) {
    const parsedOrigin = new URL(origin);
    if (!["http:", "https:"].includes(parsedOrigin.protocol) || parsedOrigin.username || parsedOrigin.password || parsedOrigin.pathname !== "/") {
      throw new Error(`MCP_ALLOWED_ORIGINS tidak valid: ${origin}`);
    }
  }

  const configuredGuildIds = splitCsv(values.DISCORD_ALLOWED_GUILD_IDS);

  return {
    tracoApiUrl: values.TRACO_API_URL,
    tracoApiKey: values.TRACO_MCP_API_KEY,
    transport: values.MCP_TRANSPORT,
    httpHost: values.MCP_HTTP_HOST,
    httpPort: values.MCP_HTTP_PORT,
    allowedHosts,
    ...(values.MCP_HTTP_BEARER_TOKEN
      ? { httpBearerToken: values.MCP_HTTP_BEARER_TOKEN }
      : {}),
    allowedOrigins,
    actorSigningSecret: values.DISCORD_ACTOR_SIGNING_SECRET,
    allowedGuildIds: configuredGuildIds.length > 0
      ? configuredGuildIds
      : values.DISCORD_GUILD_ID ? [values.DISCORD_GUILD_ID] : [],
    actorMaxTtlSeconds: values.DISCORD_ACTOR_MAX_TTL_SECONDS,
    requestTimeoutMs: values.TRACO_REQUEST_TIMEOUT_MS,
    maxRequestBytes: values.MCP_MAX_REQUEST_BYTES,
    maxResponseBytes: values.TRACO_MAX_RESPONSE_BYTES,
    maxExportBytes: values.TRACO_MAX_EXPORT_BYTES,
    logLevel: values.LOG_LEVEL,
  };
}

function splitCsv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
