import { createHash, timingSafeEqual } from "node:crypto";
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import {
  hostHeaderValidation,
  originValidation,
  toNodeHandler,
  type NodeIncomingMessageLike,
} from "@modelcontextprotocol/node";
import { loadConfig } from "./config.js";
import { createTracoMcpServer } from "./server.js";

const config = loadConfig();

if (config.transport === "stdio") {
  const handle = serveStdio(() => createTracoMcpServer(config), {
    onerror: (error) => console.error("MCP stdio error", error),
  });
  console.error("Traco MCP server listening on stdio");
  process.on("SIGINT", () => void handle.close().finally(() => process.exit(0)));
  process.on("SIGTERM", () => void handle.close().finally(() => process.exit(0)));
} else {
  const handler = createMcpHandler(() => createTracoMcpServer(config));
  const nodeHandler = toNodeHandler(handler, {
    onerror: (error) => console.error("MCP HTTP adapter error", error),
  });
  const validateHost = hostHeaderValidation(config.allowedHosts);
  const originHostnames = config.allowedOrigins.map((origin) => new URL(origin).hostname);
  const validateOrigin = originValidation(originHostnames);

  const httpServer = createHttpServer({
    maxHeaderSize: 16 * 1024,
    requestTimeout: config.requestTimeoutMs,
    headersTimeout: Math.min(config.requestTimeoutMs, 30_000),
    keepAliveTimeout: 5_000,
  }, async (request, response) => {
    if (request.method === "GET" && request.url?.split("?")[0] === "/healthz") {
      sendJson(response, 200, { status: "ok", service: "traco-mcp" });
      return;
    }
    if (request.url?.split("?")[0] !== "/mcp") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }
    const contentLength = Number(request.headers["content-length"]);
    if (Number.isFinite(contentLength) && contentLength > (config.maxRequestBytes ?? 2 * 1024 * 1024)) {
      sendJson(response, 413, { error: "Request body too large" });
      request.destroy();
      return;
    }
    if (!validateHost(request, response)) return;
    if (request.headers.origin && !config.allowedOrigins.includes(request.headers.origin)) {
      sendJson(response, 403, { error: "Origin not allowed" });
      return;
    }
    if (request.headers.origin && !validateOrigin(request, response)) return;
    if (!hasValidBearer(request, config.httpBearerToken ?? "")) {
      response.setHeader("WWW-Authenticate", "Bearer");
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }

    // IncomingMessage stays paused until the MCP adapter starts reading it.
    // Keep the size observer paused as well; otherwise a `data` listener would
    // put the stream in flowing mode and could consume chunks before
    // `toNodeHandler` attaches its body reader.
    const maxRequestBytes = config.maxRequestBytes ?? 2 * 1024 * 1024;
    let receivedBytes = 0;
    let requestTooLarge = false;
    request.on("data", (chunk: Buffer | string) => {
      receivedBytes += Buffer.byteLength(chunk);
      if (!requestTooLarge && receivedBytes > maxRequestBytes) {
        requestTooLarge = true;
        if (!response.headersSent) sendJson(response, 413, { error: "Request body too large" });
        request.destroy();
      }
    });
    request.pause();

    try {
      await nodeHandler(request as unknown as NodeIncomingMessageLike, response);
    } catch (error) {
      console.error("MCP HTTP request error", error instanceof Error ? error.message : error);
      if (!response.headersSent) sendJson(response, 500, { error: "Internal server error" });
    }
  });

  httpServer.listen(config.httpPort, config.httpHost, () => {
    console.error(`Traco MCP server listening on http://${config.httpHost}:${config.httpPort}/mcp`);
  });

  const close = () => {
    httpServer.close(() => void handler.close().finally(() => process.exit(0)));
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

function hasValidBearer(request: IncomingMessage, expectedToken: string): boolean {
  const authorization = request.headers.authorization ?? "";
  const suppliedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const suppliedHash = createHash("sha256").update(suppliedToken).digest();
  const expectedHash = createHash("sha256").update(expectedToken).digest();

  return timingSafeEqual(suppliedHash, expectedHash) && suppliedToken.length > 0;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  if (response.headersSent) return;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  response.end(JSON.stringify(body));
}
