import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import type { AppConfig } from "../src/config.js";
import { signDiscordActor } from "../src/discord-actor.js";
import { createTracoMcpServer } from "../src/server.js";

const config: AppConfig = {
  tracoApiUrl: "https://traco.example.test/api",
  tracoApiKey: "traco_mcp_test-service-key-that-is-long-enough",
  transport: "stdio",
  httpHost: "127.0.0.1",
  httpPort: 3333,
  allowedHosts: ["127.0.0.1"],
  allowedOrigins: [],
  actorSigningSecret: "test-secret-that-is-at-least-thirty-two-characters",
  allowedGuildIds: [],
  actorMaxTtlSeconds: 300,
  requestTimeoutMs: 5000,
  logLevel: "error",
};

test("server publishes the collaboration tool catalog", async () => {
  const { client, close } = await connectedClient();
  try {
    const result = await client.listTools();
    const names = result.tools.map((tool) => tool.name);

    assert.equal(names.length, 13);
    assert.ok(names.includes("traco_get_my_context"));
    assert.ok(names.includes("traco_create_card"));
    assert.ok(names.includes("traco_set_checklist_status"));
  } finally {
    await close();
  }
});

test("tool verifies actor assertion and forwards trusted identity headers", async () => {
  const originalFetch = globalThis.fetch;
  let capturedRequest: Request | undefined;
  globalThis.fetch = async (input, init) => {
    capturedRequest = new Request(input, init);
    return new Response(JSON.stringify({ data: { user: { id: "user-1" } } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const { client, close } = await connectedClient();
  try {
    const actorContext = signDiscordActor({
      sub: "123456789012345678",
      username: "tester",
    }, config.actorSigningSecret);
    const result = await client.callTool({
      name: "traco_get_my_context",
      arguments: { actor_context: actorContext },
    });

    assert.equal(result.isError, undefined);
    assert.equal(capturedRequest?.headers.get("X-Traco-Actor-Id"), "123456789012345678");
    assert.equal(capturedRequest?.headers.get("Authorization"), `Bearer ${config.tracoApiKey}`);
    assert.equal(new URL(capturedRequest?.url ?? "").pathname, "/api/mcp/v1/context");
  } finally {
    globalThis.fetch = originalFetch;
    await close();
  }
});

test("invalid actor assertion fails closed before calling Traco", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response("{}", { status: 200 });
  };

  const { client, close } = await connectedClient();
  try {
    const result = await client.callTool({
      name: "traco_get_my_context",
      arguments: { actor_context: "invalid.actor-context" },
    });

    assert.equal(result.isError, true);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    await close();
  }
});

async function connectedClient() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createTracoMcpServer(config);
  const client = new Client({ name: "traco-test-client", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
