import assert from "node:assert/strict";
import test from "node:test";
import { signGoogleChatActor, verifyGoogleChatActor } from "../src/google-chat-actor.js";

const secret = "test-secret-that-is-at-least-thirty-two-characters";

test("signed Google Chat actor preserves the provider and Chat identity", () => {
  const assertion = signGoogleChatActor({
    sub: "users/123456789",
    username: "Ayu",
    space_name: "spaces/AAA",
  }, secret, 120, 1_800_000_000);

  const actor = verifyGoogleChatActor(assertion, {
    secret,
    maxTtlSeconds: 300,
    now: 1_800_000_030,
  });

  assert.equal(actor.provider, "google_chat");
  assert.equal(actor.sub, "users/123456789");
  assert.equal(actor.space_name, "spaces/AAA");
});

test("tampered Google Chat actor assertions are rejected", () => {
  const assertion = signGoogleChatActor({ sub: "users/123456789" }, secret, 60, 1_800_000_000);
  const [payload, signature] = assertion.split(".");
  assert.throws(() => verifyGoogleChatActor(`${payload}.${signature}x`, {
    secret,
    maxTtlSeconds: 300,
    now: 1_800_000_010,
  }), /tanda tangan/i);
});
