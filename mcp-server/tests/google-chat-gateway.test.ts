import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { TracoClient } from "../src/traco-client.js";
import { TracoApiError } from "../src/traco-client.js";
import {
  buildRelayMapping,
  createGoogleChatLinker,
  createGoogleChatRelay,
  deterministicUuid,
  parseLinkCommand,
} from "../src/google-chat-relay.js";
import {
  isAgentCommand,
  loadGoogleChatConfig,
  parseSpaceRoomMap,
  type GoogleChatConfig,
} from "../src/google-chat-config.js";
import { createGoogleChatHandler } from "../src/google-chat-bot.js";

const ROOM_ID = "11111111-1111-4111-8111-111111111111";

type CapturedCall = { path: string; options: Record<string, unknown> };

function fakeClient(handler: (call: CapturedCall) => unknown): { client: TracoClient; calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  const client = {
    async request(path: string, options: Record<string, unknown>) {
      const call = { path, options };
      calls.push(call);
      return handler(call);
    },
  } as unknown as TracoClient;
  return { client, calls };
}

test("deterministicUuid is stable and uuid-shaped", () => {
  const first = deterministicUuid("spaces/AAA:messages/1");
  const second = deterministicUuid("spaces/AAA:messages/1");
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(first, deterministicUuid("spaces/AAA:messages/2"));
});

test("parseLinkCommand accepts valid codes and rejects noise", () => {
  assert.equal(parseLinkCommand("/link ABCD-EFGH"), "ABCDEFGH");
  assert.equal(parseLinkCommand("/link abcdefgh"), "ABCDEFGH");
  assert.equal(parseLinkCommand("/link"), null);
  assert.equal(parseLinkCommand("/link 123"), null);
  assert.equal(parseLinkCommand("halo /link abcdefgh"), null);
});

test("relay mapping prefers the space map and falls back to the default room", () => {
  const mapping = buildRelayMapping({
    defaultRoomId: ROOM_ID,
    spaceRoomMap: { "Spaces/AAA": "22222222-2222-4222-8222-222222222222" },
  });
  assert.equal(mapping.resolveRoom("spaces/aaa"), "22222222-2222-4222-8222-222222222222");
  assert.equal(mapping.resolveRoom("spaces/unknown"), ROOM_ID);
  assert.equal(buildRelayMapping({ spaceRoomMap: {} }).resolveRoom("spaces/unknown"), undefined);
});

test("relay writes the message into the mapped Traco room as the Google actor", async () => {
  const { client, calls } = fakeClient(() => ({ data: { id: "msg-1" } }));
  const relay = createGoogleChatRelay(client, buildRelayMapping({ defaultRoomId: ROOM_ID, spaceRoomMap: {} }));

  const outcome = await relay({
    actorSub: "users/123",
    spaceName: "spaces/AAA",
    text: "  Halo tim  ",
    idempotencySeed: "spaces/AAA:messages/1",
  });

  assert.deepEqual(outcome, { status: "sent", roomId: ROOM_ID });
  assert.equal(calls[0]?.path, `/mcp/v1/chat/rooms/${ROOM_ID}/messages`);
  assert.equal(calls[0]?.options.method, "POST");
  assert.deepEqual(calls[0]?.options.actor, { provider: "google_chat", sub: "users/123" });
  assert.deepEqual(calls[0]?.options.body, { content: "Halo tim" });
  assert.equal(calls[0]?.options.idempotencyKey, deterministicUuid("spaces/AAA:messages/1"));
});

test("relay classifies unmapped spaces and unlinked actors", async () => {
  const unmapped = createGoogleChatRelay(
    fakeClient(() => ({})).client,
    buildRelayMapping({ spaceRoomMap: {} }),
  );
  assert.deepEqual(await unmapped({ actorSub: "users/1", text: "hi" }), { status: "unmapped" });

  const unlinked = createGoogleChatRelay(
    fakeClient(() => {
      throw new TracoApiError("Akun channel belum terhubung ke user Traco.", 401, "MCP_ACTOR_NOT_LINKED");
    }).client,
    buildRelayMapping({ defaultRoomId: ROOM_ID, spaceRoomMap: {} }),
  );
  assert.deepEqual(await unlinked({ actorSub: "users/1", text: "hi" }), { status: "not_linked" });
});

test("linker normalizes codes and maps bad codes to invalid_code", async () => {
  const { client, calls } = fakeClient(() => ({ data: {} }));
  const linker = createGoogleChatLinker(client);

  assert.deepEqual(await linker({ actorSub: "users/1", code: "ABCD-EFGH", displayName: "Ayu" }), { status: "linked" });
  assert.equal(calls[0]?.path, "/mcp/v1/identities/link");
  assert.deepEqual(calls[0]?.options.body, {
    provider: "google_chat",
    code: "ABCD-EFGH",
    external_user_id: "users/1",
    display_name: "Ayu",
  });

  assert.deepEqual(await linker({ actorSub: "users/1", code: "xx" }), { status: "invalid_code" });
});

test("parseSpaceRoomMap ignores malformed entries", () => {
  assert.deepEqual(
    parseSpaceRoomMap(`spaces/AAA=${ROOM_ID}, bad, spaces/BBB=not-a-uuid, spaces/CCC=33333333-3333-4333-8333-333333333333`),
    {
      "spaces/AAA": ROOM_ID,
      "spaces/CCC": "33333333-3333-4333-8333-333333333333",
    },
  );
});

test("loadGoogleChatConfig keeps relay off by default and requires a target when on", () => {
  const base = {
    GOOGLE_CHAT_AUDIENCE: "https://chat.example.test/google-chat/events",
    DISCORD_ACTOR_SIGNING_SECRET: "test-signing-secret-that-is-at-least-32-characters",
  };

  const off = loadGoogleChatConfig({ ...base });
  assert.equal(off.relayEnabled, false);
  assert.equal(off.agentUrl, undefined);

  assert.throws(() => loadGoogleChatConfig({
    ...base,
    GOOGLE_CHAT_RELAY_ENABLED: "true",
  }), /ruang tujuan/i);

  const on = loadGoogleChatConfig({
    ...base,
    GOOGLE_CHAT_RELAY_ENABLED: "true",
    GOOGLE_CHAT_RELAY_DEFAULT_ROOM_ID: ROOM_ID,
  });
  assert.equal(on.relayEnabled, true);
  assert.equal(on.defaultRoomId, ROOM_ID);
});

test("isAgentCommand detects prefix and mention", () => {
  assert.equal(isAgentCommand("/traco status", { commandPrefix: "/", mention: "@traco" }), true);
  assert.equal(isAgentCommand("halo @Traco bantu", { commandPrefix: "/", mention: "@traco" }), true);
  assert.equal(isAgentCommand("pesan biasa", { commandPrefix: "/", mention: "@traco" }), false);
});

// ---------------------------------------------------------------------------
// Handler routing
// ---------------------------------------------------------------------------

function baseConfig(overrides: Partial<GoogleChatConfig> = {}): GoogleChatConfig {
  return {
    host: "127.0.0.1",
    port: 3443,
    path: "/google-chat/events",
    audience: "https://chat.example.test/google-chat/events",
    actorSigningSecret: "test-signing-secret-that-is-at-least-32-characters",
    requestTimeoutMs: 5000,
    maxRequestBytes: 1024 * 1024,
    relayEnabled: true,
    defaultRoomId: ROOM_ID,
    spaceRoomMap: {},
    commandPrefix: "/",
    mention: "@traco",
    ...overrides,
  };
}

function chatEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "MESSAGE",
    user: { name: "users/123", displayName: "Ayu" },
    space: { name: "spaces/AAA", type: "ROOM" },
    message: { name: "spaces/AAA/messages/1", text: "Halo tim" },
    ...overrides,
  };
}

function fakeRequest(body: unknown): IncomingMessage {
  const stream = Readable.from([Buffer.from(JSON.stringify(body))]);
  Object.assign(stream, {
    method: "POST",
    url: "/google-chat/events",
    headers: { authorization: "Bearer test" },
  });
  return stream as unknown as IncomingMessage;
}

function fakeResponse(): { response: ServerResponse; status: () => number; body: () => Record<string, unknown> } {
  const chunks: string[] = [];
  const state = { status: 0, headersSent: false };
  const response = {
    get headersSent() { return state.headersSent; },
    writeHead(status: number) {
      state.status = status;
      state.headersSent = true;
      return this;
    },
    end(data?: string) {
      if (data) chunks.push(data);
    },
  } as unknown as ServerResponse;
  return {
    response,
    status: () => state.status,
    body: () => JSON.parse(chunks.join("") || "{}") as Record<string, unknown>,
  };
}

test("handler relays plain messages to Traco without an AI agent", async () => {
  const relayed: Array<Record<string, unknown>> = [];
  const handler = createGoogleChatHandler(baseConfig(), {
    verify: async () => true,
    relay: async (input) => {
      relayed.push(input as unknown as Record<string, unknown>);
      return { status: "sent", roomId: ROOM_ID };
    },
  });

  const res = fakeResponse();
  await handler(fakeRequest(chatEvent()), res.response);

  assert.equal(res.status(), 200);
  assert.match(String(res.body().text), /diteruskan/i);
  assert.equal(relayed[0]?.actorSub, "users/123");
  assert.equal(relayed[0]?.spaceName, "spaces/AAA");
});

test("handler links accounts via /link without an AI agent", async () => {
  const codes: string[] = [];
  const handler = createGoogleChatHandler(baseConfig(), {
    verify: async () => true,
    linker: async ({ code }) => {
      codes.push(code);
      return { status: "linked" };
    },
  });

  const res = fakeResponse();
  await handler(fakeRequest(chatEvent({ message: { text: "/link ABCD-EFGH" } })), res.response);

  assert.equal(res.status(), 200);
  assert.match(String(res.body().text), /berhasil dihubungkan/i);
  assert.deepEqual(codes, ["ABCDEFGH"]);
});

test("handler answers clearly when a command arrives without an AI agent", async () => {
  const handler = createGoogleChatHandler(baseConfig(), {
    verify: async () => true,
    relay: async () => ({ status: "sent", roomId: ROOM_ID }),
  });

  const res = fakeResponse();
  await handler(fakeRequest(chatEvent({ message: { text: "/traco status" } })), res.response);

  assert.equal(res.status(), 200);
  assert.match(String(res.body().text), /perintah ai belum diaktifkan/i);
});

test("handler forwards commands to the agent when configured", async () => {
  const handler = createGoogleChatHandler(
    baseConfig({ agentUrl: "https://agent.example.test/hook", agentBearerToken: "b".repeat(40) }),
    {
      verify: async () => true,
      relay: async () => ({ status: "sent", roomId: ROOM_ID }),
      fetchImpl: (async () => new Response(JSON.stringify({ text: "jawaban agent" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as unknown as typeof fetch,
    },
  );

  const res = fakeResponse();
  await handler(fakeRequest(chatEvent({ message: { text: "/traco status" } })), res.response);

  assert.equal(res.status(), 200);
  assert.equal(res.body().text, "jawaban agent");
});
