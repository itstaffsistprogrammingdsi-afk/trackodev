import assert from "node:assert/strict";
import test from "node:test";
import { signDiscordActor, verifyDiscordActor } from "../src/discord-actor.js";

const secret = "test-secret-that-is-at-least-thirty-two-characters";

test("signed Discord actor can be verified for an allowed guild", () => {
  const assertion = signDiscordActor({
    sub: "123456789012345678",
    username: "tester",
    guild_id: "987654321098765432",
  }, secret, 120, 1_800_000_000);

  const actor = verifyDiscordActor(assertion, {
    secret,
    maxTtlSeconds: 300,
    allowedGuildIds: ["987654321098765432"],
    now: 1_800_000_030,
  });

  assert.equal(actor.sub, "123456789012345678");
  assert.equal(actor.username, "tester");
});

test("tampered and expired Discord actor assertions are rejected", () => {
  const assertion = signDiscordActor({ sub: "123456789012345678" }, secret, 60, 1_800_000_000);
  const [payload, signature] = assertion.split(".");

  assert.throws(() => verifyDiscordActor(`${payload}.${signature}x`, {
    secret,
    maxTtlSeconds: 300,
    allowedGuildIds: [],
    now: 1_800_000_010,
  }), /tanda tangan/i);

  assert.throws(() => verifyDiscordActor(assertion, {
    secret,
    maxTtlSeconds: 300,
    allowedGuildIds: [],
    now: 1_800_000_061,
  }), /kedaluwarsa/i);
});
