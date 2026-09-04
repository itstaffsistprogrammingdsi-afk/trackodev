import { randomUUID } from "node:crypto";
import { Client as McpClient, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import {
  ChatInputCommandInteraction,
  Client as DiscordClient,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from "discord.js";
import { z } from "zod/v4";
import { loadDiscordConfig } from "./discord-config.js";
import { signDiscordActor } from "./discord-actor.js";
import { formatDiscordError, formatDiscordResult } from "./discord-presenter.js";

type JsonObject = Record<string, unknown>;

const config = loadDiscordConfig();
const mcpTransport = new StreamableHTTPClientTransport(new URL(config.mcpUrl), {
  authProvider: { token: async () => config.mcpBearerToken },
  onInsufficientScope: "throw",
});
const mcp = new McpClient({ name: "traco-discord-gateway", version: "1.0.0" });
const discord = new DiscordClient({
  intents: [GatewayIntentBits.Guilds],
  allowedMentions: { parse: [] },
});
const recentInteractions = new Map<string, number>();
const INTERACTION_COOLDOWN_MS = 1500;

discord.once(Events.ClientReady, (readyClient) => {
  console.log(`Traco Discord gateway online sebagai ${readyClient.user.tag}.`);
});

discord.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "traco") return;
  await handleTracoCommand(interaction);
});

discord.on(Events.Error, (error) => console.error("Discord gateway error", error));

async function handleTracoCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.guildId !== config.guildId) {
    await interaction.reply({
      content: "Guild Discord ini tidak diizinkan menggunakan Traco.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const rateKey = `${interaction.guildId}:${interaction.user.id}`;
  const now = Date.now();
  const previous = recentInteractions.get(rateKey) ?? 0;
  if (now - previous < INTERACTION_COOLDOWN_MS) {
    await interaction.reply({
      content: "Tunggu sebentar sebelum menjalankan perintah Traco berikutnya.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  recentInteractions.set(rateKey, now);
  if (recentInteractions.size > 5000) {
    for (const [key, timestamp] of recentInteractions) {
      if (now - timestamp > INTERACTION_COOLDOWN_MS * 4) recentInteractions.delete(key);
    }
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const subcommand = interaction.options.getSubcommand(true);
  const actorContext = signDiscordActor({
    sub: interaction.user.id,
    username: interaction.user.globalName ?? interaction.user.username,
    guild_id: interaction.guildId,
  }, config.actorSigningSecret, 120);

  try {
    const request = createToolRequest(interaction, subcommand, actorContext);
    const result = await mcp.callTool({ name: request.name, arguments: request.arguments });
    const payload = result.structuredContent ?? parseTextContent(result.content);
    const message = result.isError
      ? formatDiscordError(payload)
      : formatDiscordResult(subcommand, payload);
    await interaction.editReply({ content: message, allowedMentions: { parse: [] } });
  } catch (error) {
    console.error(`Perintah /traco ${subcommand} gagal`, error);
    await interaction.editReply({
      content: "Permintaan gagal diproses. Silakan coba lagi atau hubungi administrator Traco.",
      allowedMentions: { parse: [] },
    });
  }
}

export function createToolRequest(
  interaction: ChatInputCommandInteraction,
  subcommand: string,
  actorContext: string,
): { name: string; arguments: JsonObject } {
  switch (subcommand) {
    case "link":
      {
        const linkCode = interaction.options.getString("kode", true).trim().toUpperCase();
        if (!/^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$/.test(linkCode)) {
          throw new Error("Kode link harus 8 karakter alfanumerik (opsional tanda hubung).");
        }
      return {
        name: "traco_link_discord_account",
        arguments: {
          actor_context: actorContext,
          link_code: linkCode,
          idempotency_key: randomUUID(),
        },
      };
      }
    case "whoami":
      return { name: "traco_get_my_context", arguments: { actor_context: actorContext } };
    case "projects":
      return { name: "traco_list_projects", arguments: { actor_context: actorContext } };
    case "cards": {
      const query = interaction.options.getString("query")?.trim();
      return {
        name: "traco_search_cards",
        arguments: {
          actor_context: actorContext,
          ...(query ? { query } : {}),
          limit: interaction.options.getInteger("limit") ?? 10,
          page: 1,
        },
      };
    }
    case "card":
      return {
        name: "traco_get_card",
        arguments: {
          actor_context: actorContext,
          card_id: requiredUuid(interaction.options.getString("card_id", true), "card_id"),
        },
      };
    case "comment":
      return {
        name: "traco_add_comment",
        arguments: {
          actor_context: actorContext,
          idempotency_key: randomUUID(),
          card_id: requiredUuid(interaction.options.getString("card_id", true), "card_id"),
          content: interaction.options.getString("pesan", true),
        },
      };
    default:
      throw new Error(`Subcommand Discord tidak didukung: ${subcommand}`);
  }
}

function requiredUuid(value: string, field: string): string {
  const normalized = value.trim();
  if (!z.uuid().safeParse(normalized).success) {
    throw new Error(`${field} harus berupa UUID Traco yang valid.`);
  }
  return normalized;
}

function parseTextContent(content: unknown): unknown {
  if (!Array.isArray(content)) return {};
  const text = content.find((item) => {
    const record = typeof item === "object" && item !== null ? item as JsonObject : null;
    return record?.type === "text" && typeof record.text === "string";
  }) as JsonObject | undefined;
  if (typeof text?.text !== "string") return {};

  try {
    return JSON.parse(text.text);
  } catch {
    return { message: text.text };
  }
}

async function start(): Promise<void> {
  await mcp.connect(mcpTransport);
  await discord.login(config.botToken);
}

let shuttingDown = false;
async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  discord.destroy();
  await mcp.close().catch(() => undefined);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

start().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
