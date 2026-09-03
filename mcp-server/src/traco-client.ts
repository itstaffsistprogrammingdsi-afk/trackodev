import type { AppConfig } from "./config.js";
import type { DiscordActor } from "./discord-actor.js";

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
  actor?: DiscordActor;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  idempotencyKey?: string;
  tool: string;
};

export class TracoClient {
  constructor(private readonly config: AppConfig) {}

  async request<T>(path: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${this.config.tracoApiUrl}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const requestId = crypto.randomUUID();
    const headers = new Headers({
      Accept: "application/json",
      Authorization: `Bearer ${this.config.tracoApiKey}`,
      "X-Request-ID": requestId,
      "X-Traco-Tool": options.tool,
    });
    if (options.actor) {
      headers.set("X-Traco-Actor-Provider", "discord");
      headers.set("X-Traco-Actor-Id", options.actor.sub);
    }
    if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
    if (options.body !== undefined) headers.set("Content-Type", "application/json");

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown network error";
      throw new TracoApiError(`Traco API tidak dapat dihubungi: ${message}`, 503, "TRACO_UNAVAILABLE");
    }

    const raw = await response.text();
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
      const message = [String(record.message ?? `Traco API error ${response.status}`), validation]
        .filter(Boolean)
        .join(" ");
      throw new TracoApiError(message, response.status, String(record.code ?? "TRACO_API_ERROR"), payload);
    }

    return payload as T;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
