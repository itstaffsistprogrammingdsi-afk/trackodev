import { z } from "zod/v4";

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
  DISCORD_ACTOR_MAX_TTL_SECONDS: z.coerce.number().int().min(30).max(900).default(300),
  TRACO_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
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
  if (values.MCP_TRANSPORT === "http" && !values.MCP_HTTP_BEARER_TOKEN) {
    throw new Error("MCP_HTTP_BEARER_TOKEN wajib diisi pada mode HTTP.");
  }

  return {
    tracoApiUrl: values.TRACO_API_URL,
    tracoApiKey: values.TRACO_MCP_API_KEY,
    transport: values.MCP_TRANSPORT,
    httpHost: values.MCP_HTTP_HOST,
    httpPort: values.MCP_HTTP_PORT,
    allowedHosts: splitCsv(values.MCP_ALLOWED_HOSTS),
    ...(values.MCP_HTTP_BEARER_TOKEN
      ? { httpBearerToken: values.MCP_HTTP_BEARER_TOKEN }
      : {}),
    allowedOrigins: splitCsv(values.MCP_ALLOWED_ORIGINS),
    actorSigningSecret: values.DISCORD_ACTOR_SIGNING_SECRET,
    allowedGuildIds: splitCsv(values.DISCORD_ALLOWED_GUILD_IDS),
    actorMaxTtlSeconds: values.DISCORD_ACTOR_MAX_TTL_SECONDS,
    requestTimeoutMs: values.TRACO_REQUEST_TIMEOUT_MS,
    logLevel: values.LOG_LEVEL,
  };
}

function splitCsv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
