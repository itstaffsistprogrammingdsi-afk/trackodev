import { z } from "zod/v4";

const snowflake = z.string().regex(/^\d{15,22}$/);

const discordEnvironmentSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(30),
  DISCORD_APPLICATION_ID: snowflake,
  DISCORD_GUILD_ID: snowflake,
  TRACO_MCP_URL: z.string().url().default("http://127.0.0.1:3333/mcp"),
  MCP_HTTP_BEARER_TOKEN: z.string().min(32),
  DISCORD_ACTOR_SIGNING_SECRET: z.string().min(32),
});

export type DiscordConfig = {
  botToken: string;
  applicationId: string;
  guildId: string;
  mcpUrl: string;
  mcpBearerToken: string;
  actorSigningSecret: string;
};

export function loadDiscordConfig(environment: NodeJS.ProcessEnv = process.env): DiscordConfig {
  const parsed = discordEnvironmentSchema.safeParse(environment);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Konfigurasi Discord gateway tidak valid: ${details}`);
  }

  const values = parsed.data;
  const mcpUrl = new URL(values.TRACO_MCP_URL);
  const isLoopback = ["127.0.0.1", "localhost", "[::1]"].includes(mcpUrl.hostname);
  if (mcpUrl.protocol !== "https:" && !isLoopback) {
    throw new Error("TRACO_MCP_URL wajib menggunakan HTTPS kecuali untuk alamat loopback.");
  }
  if (mcpUrl.pathname !== "/mcp") {
    throw new Error("TRACO_MCP_URL harus mengarah ke endpoint /mcp.");
  }

  return {
    botToken: values.DISCORD_BOT_TOKEN,
    applicationId: values.DISCORD_APPLICATION_ID,
    guildId: values.DISCORD_GUILD_ID,
    mcpUrl: mcpUrl.href,
    mcpBearerToken: values.MCP_HTTP_BEARER_TOKEN,
    actorSigningSecret: values.DISCORD_ACTOR_SIGNING_SECRET,
  };
}
