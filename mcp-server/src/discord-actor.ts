import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod/v4";

const actorPayloadSchema = z.object({
  sub: z.string().regex(/^\d{15,22}$/),
  // Optional for backwards compatibility with assertions issued before the
  // multi-channel actor context was introduced.
  provider: z.literal("discord").optional(),
  username: z.string().min(1).max(255).optional(),
  guild_id: z.string().regex(/^\d{15,22}$/).optional(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
  jti: z.string().uuid(),
});

export type DiscordActor = z.infer<typeof actorPayloadSchema>;
export type ExternalActor = Omit<DiscordActor, "provider"> & { provider: "discord" };

export type VerifyActorOptions = {
  secret: string;
  maxTtlSeconds: number;
  allowedGuildIds: string[];
  now?: number;
};

export function verifyDiscordActor(assertion: string, options: VerifyActorOptions): ExternalActor {
  if (typeof assertion !== "string" || assertion.length > 4096) {
    throw new Error("Actor context Discord tidak valid.");
  }
  const parts = assertion.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Actor context Discord tidak valid.");
  }

  const [encodedPayload, signature] = parts;
  const expected = sign(encodedPayload, options.secret);
  const givenBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  if (givenBuffer.length !== expectedBuffer.length || !timingSafeEqual(givenBuffer, expectedBuffer)) {
    throw new Error("Tanda tangan actor context Discord tidak valid.");
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Payload actor context Discord tidak valid.");
  }

  const parsedPayload = actorPayloadSchema.safeParse(rawPayload);
  if (!parsedPayload.success || parsedPayload.data.exp <= parsedPayload.data.iat) {
    throw new Error("Payload actor context Discord tidak valid.");
  }
  const payload = { ...parsedPayload.data, provider: "discord" as const };
  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (payload.iat > now + 30 || payload.exp < now) {
    throw new Error("Actor context Discord belum berlaku atau sudah kedaluwarsa.");
  }
  if (payload.exp - payload.iat > options.maxTtlSeconds) {
    throw new Error("Masa berlaku actor context Discord terlalu panjang.");
  }
  if (
    options.allowedGuildIds.length > 0
    && (!payload.guild_id || !options.allowedGuildIds.includes(payload.guild_id))
  ) {
    throw new Error("Guild Discord tidak diizinkan menggunakan Traco MCP.");
  }

  return payload;
}

/** Helper untuk Discord gateway. Jangan pernah menjalankannya di browser/client. */
export function signDiscordActor(
  actor: Pick<DiscordActor, "sub"> & Partial<Pick<DiscordActor, "username" | "guild_id">>,
  secret: string,
  ttlSeconds = 120,
  now = Math.floor(Date.now() / 1000),
): string {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("Secret penandatangan actor context Discord terlalu pendek.");
  }
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 900) {
    throw new Error("TTL actor context Discord harus berupa bilangan bulat 1-900 detik.");
  }
  const payload: DiscordActor = {
    sub: actor.sub,
    provider: "discord",
    ...(actor.username ? { username: actor.username } : {}),
    ...(actor.guild_id ? { guild_id: actor.guild_id } : {}),
    iat: now,
    exp: now + ttlSeconds,
    jti: randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encoded}.${sign(encoded, secret)}`;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
