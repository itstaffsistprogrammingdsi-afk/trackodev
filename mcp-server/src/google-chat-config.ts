import { z } from "zod/v4";

const googleChatEnvironmentSchema = z.object({
  GOOGLE_CHAT_HOST: z.string().default("127.0.0.1"),
  GOOGLE_CHAT_PORT: z.coerce.number().int().min(1).max(65535).default(3443),
  GOOGLE_CHAT_PATH: z.string().regex(/^\/[A-Za-z0-9._~-]{1,80}$/).default("/google-chat/events"),
  GOOGLE_CHAT_AUDIENCE: z.string().min(1),
  GOOGLE_CHAT_AGENT_URL: z.string().url(),
  GOOGLE_CHAT_AGENT_BEARER_TOKEN: z.string().min(32),
  GOOGLE_CHAT_AGENT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(25000),
  DISCORD_ACTOR_SIGNING_SECRET: z.string().min(32),
  MCP_MAX_REQUEST_BYTES: z.coerce.number().int().min(16 * 1024).max(8 * 1024 * 1024).default(2 * 1024 * 1024),
});

export type GoogleChatConfig = {
  host: string;
  port: number;
  path: string;
  audience: string;
  agentUrl: string;
  agentBearerToken: string;
  actorSigningSecret: string;
  requestTimeoutMs: number;
  maxRequestBytes: number;
};

export function loadGoogleChatConfig(environment: NodeJS.ProcessEnv = process.env): GoogleChatConfig {
  const parsed = googleChatEnvironmentSchema.safeParse(environment);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Konfigurasi Google Chat gateway tidak valid: ${details}`);
  }
  const values = parsed.data;
  const agentUrl = new URL(values.GOOGLE_CHAT_AGENT_URL);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(agentUrl.hostname);
  if (agentUrl.protocol !== "https:" && !loopback) {
    throw new Error("GOOGLE_CHAT_AGENT_URL wajib menggunakan HTTPS kecuali alamat loopback.");
  }
  return {
    host: values.GOOGLE_CHAT_HOST,
    port: values.GOOGLE_CHAT_PORT,
    path: values.GOOGLE_CHAT_PATH,
    audience: values.GOOGLE_CHAT_AUDIENCE,
    agentUrl: agentUrl.href,
    agentBearerToken: values.GOOGLE_CHAT_AGENT_BEARER_TOKEN,
    actorSigningSecret: values.DISCORD_ACTOR_SIGNING_SECRET,
    requestTimeoutMs: values.GOOGLE_CHAT_AGENT_TIMEOUT_MS,
    maxRequestBytes: values.MCP_MAX_REQUEST_BYTES,
  };
}
