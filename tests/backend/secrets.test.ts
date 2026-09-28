import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import {
  encryptSecret,
  decryptSecret,
  signProfile,
} from "../../packages/server/src/secrets";
test("model secrets use authenticated encryption with independent nonces", () => {
  const key = randomBytes(32).toString("base64");
  const a = encryptSecret("synthetic-test-key", key),
    b = encryptSecret("synthetic-test-key", key);
  assert.notEqual(a, b);
  assert.equal(decryptSecret(a, key), "synthetic-test-key");
  assert.throws(() => decryptSecret(a, randomBytes(32).toString("base64")));
  assert.throws(() => decryptSecret(a.replace("gcm1", "gcm2"), key));
  assert.ok(!a.includes("synthetic-test-key"));
});
test("profiles bind claims to the transport secret", () => {
  assert.notEqual(
    signProfile({ sub: "a" }, "a".repeat(32)),
    signProfile({ sub: "b" }, "a".repeat(32)),
  );
  assert.throws(() => signProfile({}, "short"));
});
