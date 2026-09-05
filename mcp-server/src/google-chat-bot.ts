import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "node:crypto";
import { loadGoogleChatConfig, type GoogleChatConfig } from "./google-chat-config.js";
import { signGoogleChatActor } from "./google-chat-actor.js";

const CHAT_ISSUER = "chat@system.gserviceaccount.com";
const certsUrl = `https://www.googleapis.com/service_accounts/v1/metadata/x509/${CHAT_ISSUER}`;
let cachedCerts: { expiresAt: number; certs: Record<string, string> } | undefined;

type JsonObject = Record<string, unknown>;

export async function verifyGoogleChatRequest(
  authorization: string | undefined,
  audience: string,
): Promise<boolean> {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return false;
  try {
    const client = new OAuth2Client();
    if (/^\d+$/.test(audience)) {
      const certs = await getCertificates();
      await client.verifySignedJwtWithCertsAsync(token, certs, audience, [CHAT_ISSUER]);
      return true;
    }
    const ticket = await client.verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    return payload?.email_verified === true && payload.email === CHAT_ISSUER;
  } catch {
    return false;
  }
}

export function createGoogleChatHandler(config: GoogleChatConfig) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method === "GET" && (request.url ?? "").split("?", 1)[0] === "/healthz") {
      sendJson(response, 200, { status: "ok", service: "traco-google-chat" });
      return;
    }
    if (request.method !== "POST" || (request.url ?? "").split("?", 1)[0] !== config.path) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }
    if (!await verifyGoogleChatRequest(request.headers.authorization, config.audience)) {
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }

    let event: JsonObject;
    try {
      event = await readJson(request, config.maxRequestBytes);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid JSON" });
      return;
    }
    const type = typeof event.type === "string" ? event.type : "";
    if (type === "ADDED_TO_SPACE") {
      sendJson(response, 200, { text: "Traco siap membantu. Kirim pesan atau gunakan perintah Chat untuk mengelola pekerjaan." });
      return;
    }
    if (type === "REMOVED_FROM_SPACE") {
      sendJson(response, 200, {});
      return;
    }
    if (type !== "MESSAGE" && type !== "APP_COMMAND") {
      sendJson(response, 200, { text: "Event Google Chat diterima." });
      return;
    }

    const user = asRecord(event.user) ?? {};
    const space = asRecord(event.space) ?? {};
    const message = asRecord(event.message) ?? {};
    const subject = firstString(user.name, user.email);
    if (!subject) {
      sendJson(response, 400, { error: "Google Chat user identity is required" });
      return;
    }
    const actorContext = signGoogleChatActor({
      sub: subject,
      username: firstString(user.displayName, user.email),
      space_name: firstString(space.name),
    }, config.actorSigningSecret, 120);
    const text = firstString(message.argumentText, message.text, event.text) ?? "";

    try {
      const agentResponse = await fetch(config.agentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${config.agentBearerToken}`,
          "X-Request-ID": randomUUID(),
        },
        body: JSON.stringify({
          source: "google_chat",
          event_type: type,
          message: text,
          actor_context: actorContext,
          actor: { id: subject, display_name: firstString(user.displayName, user.email) },
          space: { name: firstString(space.name), type: firstString(space.type) },
        }),
        signal: AbortSignal.timeout(config.requestTimeoutMs),
        redirect: "error",
      });
      if (!agentResponse.ok) {
        sendJson(response, 502, { error: "AI agent unavailable" });
        return;
      }
      const result = await agentResponse.json() as unknown;
      const reply = extractReply(result);
      sendJson(response, 200, { text: reply || "Permintaan diterima, tetapi agent tidak mengembalikan jawaban." });
    } catch {
      sendJson(response, 502, { error: "AI agent unavailable" });
    }
  };
}

export async function startGoogleChatBot(config = loadGoogleChatConfig()): Promise<ReturnType<typeof createServer>> {
  const server = createServer({ requestTimeout: config.requestTimeoutMs }, (request, response) => {
    void createGoogleChatHandler(config)(request, response);
  });
  await new Promise<void>((resolve) => server.listen(config.port, config.host, resolve));
  console.error(`Traco Google Chat gateway listening on http://${config.host}:${config.port}${config.path}`);
  return server;
}

async function getCertificates(): Promise<Record<string, string>> {
  if (cachedCerts && cachedCerts.expiresAt > Date.now()) return cachedCerts.certs;
  const response = await fetch(certsUrl, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Google Chat signing certificates unavailable");
  const certs = await response.json() as Record<string, string>;
  cachedCerts = { certs, expiresAt: Date.now() + 5 * 60 * 1000 };
  return certs;
}

async function readJson(request: IncomingMessage, maxBytes: number): Promise<JsonObject> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > maxBytes) throw new Error("Request body too large");
    chunks.push(buffer);
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const record = asRecord(parsed);
  if (!record) throw new Error("Request body must be a JSON object");
  return record;
}

function extractReply(value: unknown): string {
  const record = asRecord(value);
  if (!record) return typeof value === "string" ? value : "";
  if (typeof record.text === "string") return record.text;
  const message = asRecord(record.message);
  return typeof message?.text === "string" ? message.text : "";
}

function asRecord(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonObject : null;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.trim() !== "")?.trim();
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  if (response.headersSent) return;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}
