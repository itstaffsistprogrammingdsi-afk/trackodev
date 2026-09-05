import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod/v4";

const googleChatActorSchema = z.object({
  provider: z.literal("google_chat"),
  // Google Chat user resources are normally users/{numeric-id}; domain users
  // can also be represented by an email address, so keep this intentionally
  // broader than the Discord snowflake validation.
  sub: z.string().regex(/^[A-Za-z0-9._:/@-]{1,100}$/),
  username: z.string().min(1).max(255).optional(),
  space_name: z.string().regex(/^spaces\/[A-Za-z0-9._~-]{1,100}$/).optional(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
  jti: z.string().uuid(),
});

export type GoogleChatActor = z.infer<typeof googleChatActorSchema>;

export type VerifyGoogleChatActorOptions = {
  secret: string;
  maxTtlSeconds: number;
  now?: number;
};

export function signGoogleChatActor(
  actor: Pick<GoogleChatActor, "sub"> & Partial<Pick<GoogleChatActor, "username" | "space_name">>,
  secret: string,
  ttlSeconds = 120,
  now = Math.floor(Date.now() / 1000),
): string {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("Secret penandatangan actor context Google Chat terlalu pendek.");
  }
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 900) {
    throw new Error("TTL actor context Google Chat harus berupa bilangan bulat 1-900 detik.");
  }
  const payload: GoogleChatActor = {
    provider: "google_chat",
    sub: actor.sub,
    ...(actor.username ? { username: actor.username } : {}),
    ...(actor.space_name ? { space_name: actor.space_name } : {}),
    iat: now,
    exp: now + ttlSeconds,
    jti: randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifyGoogleChatActor(
  assertion: string,
  options: VerifyGoogleChatActorOptions,
): GoogleChatActor {
  if (typeof assertion !== "string" || assertion.length > 4096) {
    throw new Error("Actor context Google Chat tidak valid.");
  }
  const parts = assertion.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Actor context Google Chat tidak valid.");
  }
  const [encodedPayload, suppliedSignature] = parts;
  const expectedSignature = signature(encodedPayload, options.secret);
  const supplied = Buffer.from(suppliedSignature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error("Tanda tangan actor context Google Chat tidak valid.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Payload actor context Google Chat tidak valid.");
  }
  const parsed = googleChatActorSchema.safeParse(raw);
  if (!parsed.success || parsed.data.exp <= parsed.data.iat) {
    throw new Error("Payload actor context Google Chat tidak valid.");
  }
  const actor = parsed.data;
  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (actor.iat > now + 30 || actor.exp < now) {
    throw new Error("Actor context Google Chat belum berlaku atau sudah kedaluwarsa.");
  }
  if (actor.exp - actor.iat > options.maxTtlSeconds) {
    throw new Error("Masa berlaku actor context Google Chat terlalu panjang.");
  }
  return actor;
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
