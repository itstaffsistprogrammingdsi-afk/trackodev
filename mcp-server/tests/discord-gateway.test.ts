import assert from "node:assert/strict";
import test from "node:test";
import { discordCommands } from "../src/discord-commands.js";
import { loadConfig } from "../src/config.js";
import { loadDiscordConfig } from "../src/discord-config.js";
import { formatDiscordResult } from "../src/discord-presenter.js";

test("Discord gateway publishes the deterministic Traco command set", () => {
  const command = discordCommands[0];
  assert.equal(command?.name, "traco");
  assert.deepEqual(
    command?.options?.map((option) => option.name),
    ["link", "whoami", "projects", "cards", "card", "comment"],
  );
});

test("Discord gateway configuration fails closed for non-TLS remote MCP URLs", () => {
  assert.throws(() => loadDiscordConfig({
    DISCORD_BOT_TOKEN: "test-token-that-is-long-enough-for-validation",
    DISCORD_APPLICATION_ID: "1544966877636198430",
    DISCORD_GUILD_ID: "1544966877636198431",
    TRACO_MCP_URL: "http://mcp.example.test/mcp",
    MCP_HTTP_BEARER_TOKEN: "test-bearer-token-that-is-at-least-32-characters",
    DISCORD_ACTOR_SIGNING_SECRET: "test-signing-secret-that-is-at-least-32-characters",
  }), /HTTPS/);
});

test("MCP defaults its actor allow-list to the configured Discord command guild", () => {
  const config = loadConfig({
    TRACO_API_URL: "https://traco.example.test/api",
    TRACO_MCP_API_KEY: "traco_mcp_test-service-key-that-is-long-enough",
    DISCORD_ACTOR_SIGNING_SECRET: "test-signing-secret-that-is-at-least-32-characters",
    DISCORD_GUILD_ID: "1544990303113449512",
  });

  assert.deepEqual(config.allowedGuildIds, ["1544990303113449512"]);
});

test("MCP remains usable without the optional Discord gateway configuration", () => {
  const config = loadConfig({
    TRACO_API_URL: "https://traco.example.test/api",
    TRACO_MCP_API_KEY: "traco_mcp_test-service-key-that-is-long-enough",
    DISCORD_ACTOR_SIGNING_SECRET: "test-signing-secret-that-is-at-least-32-characters",
    DISCORD_GUILD_ID: "",
  });

  assert.deepEqual(config.allowedGuildIds, []);
});

test("Discord presenter renders linked Traco identity without raw JSON", () => {
  const message = formatDiscordResult("whoami", {
    data: {
      user: {
        name: "Test User",
        email: "test@example.test",
        roles: ["admin"],
        divisions: [{ name: "IT", role: "member" }],
      },
    },
  });

  assert.match(message, /Test User/);
  assert.match(message, /admin/);
  assert.match(message, /IT/);
  assert.doesNotMatch(message, /\{"data"/);
});
