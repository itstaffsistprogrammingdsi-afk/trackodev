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

    assert.equal(names.length, 18);
    assert.ok(names.includes("traco_get_my_context"));
    assert.ok(names.includes("traco_create_card"));
    assert.ok(names.includes("traco_set_checklist_status"));
    assert.ok(names.includes("traco_download_attachment"));
    assert.ok(names.includes("traco_baca"));
    assert.ok(names.includes("traco_ubah"));
    assert.ok(names.includes("traco_ekspor_laporan"));
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

test("normalized Indonesian actions use only the matching allow-listed route", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Request[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    return new Response(JSON.stringify({ data: {} }), {
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
    const divisionId = "11111111-1111-4111-8111-111111111111";
    const cardId = "22222222-2222-4222-8222-222222222222";

    const readResult = await client.callTool({
      name: "traco_baca",
      arguments: {
        actor_context: actorContext,
        operation: "detail_divisi",
        data: { division_id: divisionId },
      },
    });
    assert.equal(readResult.isError, undefined);
    assert.equal(new URL(requests[0]?.url ?? "").pathname, `/api/mcp/v1/divisions/${divisionId}`);

    const writeResult = await client.callTool({
      name: "traco_ubah",
      arguments: {
        actor_context: actorContext,
        idempotency_key: "33333333-3333-4333-8333-333333333333",
        operation: "tambah_komentar",
        data: { card_id: cardId, content: "Mohon dicek hari ini." },
      },
    });
    assert.equal(writeResult.isError, undefined);
    assert.equal(new URL(requests[1]?.url ?? "").pathname, `/api/mcp/v1/cards/${cardId}/comments`);
    assert.equal(requests[1]?.method, "POST");
    assert.equal(requests[1]?.headers.get("Idempotency-Key"), "33333333-3333-4333-8333-333333333333");
    assert.deepEqual(await requests[1]?.json(), { content: "Mohon dicek hari ini." });
  } finally {
    globalThis.fetch = originalFetch;
    await close();
  }
});

test("report export returns a portable file payload without exposing a download URL", async () => {
  const originalFetch = globalThis.fetch;
  let capturedRequest: Request | undefined;
  globalThis.fetch = async (input, init) => {
    capturedRequest = new Request(input, init);
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=laporan.xlsx",
      },
    });
  };

  const { client, close } = await connectedClient();
  try {
    const actorContext = signDiscordActor({ sub: "123456789012345678" }, config.actorSigningSecret);
    const result = await client.callTool({
      name: "traco_ekspor_laporan",
      arguments: {
        actor_context: actorContext,
        format: "excel",
        filters: { start_date: "2026-09-01", end_date: "2026-09-04" },
        export_password: "very-safe-export-password",
      },
    });

    assert.equal(result.isError, undefined);
    assert.equal(new URL(capturedRequest?.url ?? "").pathname, "/api/mcp/v1/reports/export/excel");
    assert.equal(capturedRequest?.headers.get("X-Export-Password"), "very-safe-export-password");
    assert.match(capturedRequest?.url ?? "", /start_date=2026-09-01/);
    const structured = result.structuredContent as { data: { file_name: string; content_base64: string } };
    assert.equal(structured.data.file_name, "laporan.xlsx");
    assert.equal(structured.data.content_base64, "AQID");
  } finally {
    globalThis.fetch = originalFetch;
    await close();
  }
});

test("attachment download stays permission-gated and returns bounded base64", async () => {
  const originalFetch = globalThis.fetch;
  let capturedRequest: Request | undefined;
  globalThis.fetch = async (input, init) => {
    capturedRequest = new Request(input, init);
    return new Response(new Uint8Array([4, 5, 6]), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "attachment; filename=hasil/versi.png",
      },
    });
  };

  const { client, close } = await connectedClient();
  try {
    const actorContext = signDiscordActor({ sub: "123456789012345678" }, config.actorSigningSecret);
    const result = await client.callTool({
      name: "traco_download_attachment",
      arguments: {
        actor_context: actorContext,
        attachment_id: "44444444-4444-4444-8444-444444444444",
        attachment_kind: "brief",
      },
    });

    assert.equal(result.isError, undefined);
    assert.equal(new URL(capturedRequest?.url ?? "").pathname, "/api/mcp/v1/brief-attachments/44444444-4444-4444-8444-444444444444/download");
    assert.equal(capturedRequest?.headers.get("X-Traco-Actor-Id"), "123456789012345678");
    const structured = result.structuredContent as { data: { file_name: string; content_base64: string; media_type: string } };
    assert.equal(structured.data.file_name, "hasil_versi.png");
    assert.equal(structured.data.content_base64, "BAUG");
    assert.equal(structured.data.media_type, "image/png");
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
