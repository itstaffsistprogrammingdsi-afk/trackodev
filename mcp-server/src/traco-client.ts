import type { AppConfig } from "./config.js";
import type { ExternalActor } from "./discord-actor.js";
import type { GoogleChatActor } from "./google-chat-actor.js";
type TracoActor = ExternalActor | GoogleChatActor;

const DEFAULT_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_EXPORT_BYTES = 20 * 1024 * 1024;
const MAX_ERROR_BODY_BYTES = 64 * 1024;

export class TracoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "TracoApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  actor?: TracoActor;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  idempotencyKey?: string;
  tool: string;
};

type DownloadOptions = Omit<RequestOptions, "method" | "body" | "idempotencyKey" | "actor"> & {
  actor: TracoActor;
  exportPassword?: string;
};

export class TracoClient {
  constructor(private readonly config: AppConfig) {}

  async request<T>(path: string, options: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options.query);

    const requestId = crypto.randomUUID();
    let serializedBody: string | undefined;
    if (options.body !== undefined) {
      try {
        serializedBody = JSON.stringify(options.body);
      } catch {
        throw new TracoApiError("Payload request Traco bukan JSON yang valid.", 422, "TRACO_REQUEST_INVALID");
      }
      if (Buffer.byteLength(serializedBody, "utf8") > (this.config.maxRequestBytes ?? 2 * 1024 * 1024)) {
        throw new TracoApiError("Payload request Traco terlalu besar.", 413, "TRACO_REQUEST_TOO_LARGE");
      }
    }
    const headers = new Headers({
      Accept: "application/json",
      Authorization: `Bearer ${this.config.tracoApiKey}`,
      "X-Request-ID": requestId,
      "X-Traco-Tool": options.tool,
    });
    if (options.actor) {
      headers.set("X-Traco-Actor-Provider", options.actor.provider);
      headers.set("X-Traco-Actor-Id", options.actor.sub);
    }
    if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
    if (serializedBody !== undefined) headers.set("Content-Type", "application/json");

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        ...(serializedBody !== undefined ? { body: serializedBody } : {}),
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        // Credentials and actor headers must never follow an untrusted
        // redirect to another origin.
        redirect: "error",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown network error";
      throw new TracoApiError(`Traco API tidak dapat dihubungi: ${message}`, 503, "TRACO_UNAVAILABLE");
    }

    const raw = await this.readResponseText(response, this.config.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES);
    let payload: unknown = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = { message: raw || response.statusText };
    }

    if (!response.ok) {
      const record = isRecord(payload) ? payload : {};
      const validation = isRecord(record.errors)
        ? Object.values(record.errors).flat().join(" ")
        : "";
      const message = [truncate(String(record.message ?? `Traco API error ${response.status}`), 1000), truncate(validation, 2000)]
        .filter(Boolean)
        .join(" ");
      throw new TracoApiError(message, response.status, String(record.code ?? "TRACO_API_ERROR"), payload);
    }

    return payload as T;
  }

  /**
   * ReportController returns a download response, not JSON. Convert it into a
   * portable MCP payload so a host can save the exact file without exposing a
   * temporary public URL or a Traco credential.
   */
  async downloadReport(path: string, options: DownloadOptions): Promise<Record<string, unknown>> {
    const url = this.buildUrl(path, options.query);

    const requestId = crypto.randomUUID();
    const headers = new Headers({
      Accept: "application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json",
      Authorization: `Bearer ${this.config.tracoApiKey}`,
      "X-Request-ID": requestId,
      "X-Traco-Tool": options.tool,
      "X-Traco-Actor-Provider": options.actor.provider,
      "X-Traco-Actor-Id": options.actor.sub,
    });
    if (options.exportPassword) headers.set("X-Export-Password", options.exportPassword);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        redirect: "error",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown network error";
      throw new TracoApiError(`Traco API tidak dapat dihubungi: ${message}`, 503, "TRACO_UNAVAILABLE");
    }

    if (!response.ok) {
      const raw = await this.readResponseText(response, MAX_ERROR_BODY_BYTES);
      let details: unknown = null;
      try { details = raw ? JSON.parse(raw) : null; } catch { details = { message: raw || response.statusText }; }
      const record = isRecord(details) ? details : {};
      throw new TracoApiError(
        String(record.message ?? `Traco API error ${response.status}`),
        response.status,
        String(record.code ?? "TRACO_API_ERROR"),
        details,
      );
    }

    const mediaType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    const allowedMediaTypes = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]);
    if (mediaType && !allowedMediaTypes.has(mediaType)) {
      throw new TracoApiError("Traco mengembalikan tipe berkas laporan yang tidak didukung.", 502, "REPORT_MEDIA_TYPE_INVALID");
    }

    const bytes = await this.readResponseBytes(response, this.config.maxExportBytes ?? DEFAULT_MAX_EXPORT_BYTES);
    const maxBytes = this.config.maxExportBytes ?? DEFAULT_MAX_EXPORT_BYTES;
    if (bytes.byteLength > maxBytes) {
      throw new TracoApiError("Berkas laporan terlalu besar untuk dikirim lewat MCP. Persempit filter laporan terlebih dahulu.", 413, "REPORT_TOO_LARGE");
    }

    return {
      data: {
        file_name: sanitizeFilename(fileNameFrom(response.headers.get("content-disposition")) ?? "traco-report"),
        media_type: mediaType ?? "application/octet-stream",
        content_base64: Buffer.from(bytes).toString("base64"),
        size_bytes: bytes.byteLength,
      },
    };
  }

  /**
   * Download an attachment through the authenticated API and return its bytes
   * as a bounded base64 payload. The API remains responsible for card access;
   * this method never turns a storage path into a public URL.
   */
  async downloadAttachment(path: string, options: DownloadOptions): Promise<Record<string, unknown>> {
    const url = this.buildUrl(path, options.query);

    const requestId = crypto.randomUUID();
    const headers = new Headers({
      Accept: "*/*",
      Authorization: `Bearer ${this.config.tracoApiKey}`,
      "X-Request-ID": requestId,
      "X-Traco-Tool": options.tool,
      "X-Traco-Actor-Provider": options.actor.provider,
      "X-Traco-Actor-Id": options.actor.sub,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        redirect: "error",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown network error";
      throw new TracoApiError(`Traco API tidak dapat dihubungi: ${message}`, 503, "TRACO_UNAVAILABLE");
    }

    if (!response.ok) {
      const raw = await this.readResponseText(response, MAX_ERROR_BODY_BYTES);
      let details: unknown = null;
      try { details = raw ? JSON.parse(raw) : null; } catch { details = { message: raw || response.statusText }; }
      const record = isRecord(details) ? details : {};
      throw new TracoApiError(
        String(record.message ?? `Traco API error ${response.status}`),
        response.status,
        String(record.code ?? "TRACO_API_ERROR"),
        details,
      );
    }

    const mediaType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (mediaType === "application/json" || mediaType === "text/html") {
      throw new TracoApiError("Traco mengembalikan tipe respons attachment yang tidak didukung.", 502, "ATTACHMENT_MEDIA_TYPE_INVALID");
    }

    const maxBytes = this.config.maxExportBytes ?? DEFAULT_MAX_EXPORT_BYTES;
    const bytes = await this.readResponseBytes(response, maxBytes);
    return {
      data: {
        file_name: sanitizeFilename(fileNameFrom(response.headers.get("content-disposition")) ?? "traco-attachment"),
        media_type: mediaType ?? "application/octet-stream",
        content_base64: Buffer.from(bytes).toString("base64"),
        size_bytes: bytes.byteLength,
      },
    };
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): URL {
    if (!path.startsWith("/") || path.includes("\\") || path.includes("..") || path.includes("?") || path.includes("#")) {
      throw new TracoApiError("Jalur API Traco tidak valid.", 500, "TRACO_PATH_INVALID");
    }

    const base = new URL(this.config.tracoApiUrl);
    const basePath = base.pathname.replace(/\/$/, "");
    const url = new URL(`${basePath}${path}`, base.origin);
    if (url.origin !== base.origin || !url.pathname.startsWith(`${basePath}/`)) {
      throw new TracoApiError("Jalur API Traco keluar dari origin yang dikonfigurasi.", 500, "TRACO_PATH_INVALID");
    }
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url;
  }

  private async readResponseText(response: Response, maxBytes: number): Promise<string> {
    const bytes = await this.readResponseBytes(response, maxBytes);
    return new TextDecoder().decode(bytes);
  }

  private async readResponseBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new TracoApiError("Respons Traco terlalu besar untuk diproses.", 502, "TRACO_RESPONSE_TOO_LARGE");
    }

    if (!response.body) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > maxBytes) {
        throw new TracoApiError("Respons Traco terlalu besar untuk diproses.", 502, "TRACO_RESPONSE_TOO_LARGE");
      }
      return bytes;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          throw new TracoApiError("Respons Traco terlalu besar untuk diproses.", 502, "TRACO_RESPONSE_TOO_LARGE");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fileNameFrom(contentDisposition: string | null): string | undefined {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return undefined;
    }
  }
  const plain = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
  return plain || undefined;
}

function sanitizeFilename(value: string): string {
  const normalized = value
    .replace(/[\\/\0\r\n]/g, "_")
    .replace(/\.\.+/g, ".")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim()
    .replace(/^\.+$/, "");
  return (normalized || "traco-report").slice(0, 128);
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
