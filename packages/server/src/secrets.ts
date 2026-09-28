import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
function key(value: string) {
  const result = Buffer.from(value, "base64");
  if (result.length !== 32)
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY must contain 32 base64 encoded bytes",
    );
  return result;
}
export function encryptSecret(value: string, keyValue: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(keyValue), nonce);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "gcm1",
    nonce.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}
export function decryptSecret(value: string, keyValue: string) {
  const [version, nonce, tag, encrypted, ...extra] = value.split(":");
  if (version !== "gcm1" || !nonce || !tag || !encrypted || extra.length)
    throw new Error("INVALID_SECRET");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    key(keyValue),
    Buffer.from(nonce, "base64"),
  );
  cipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    cipher.update(Buffer.from(encrypted, "base64")),
    cipher.final(),
  ]).toString("utf8");
}
export function signProfile(value: unknown, secret: string) {
  if (secret.length < 32)
    throw new Error("AGENT_SHARED_SECRET must be at least 32 characters");
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret).update(payload).digest("base64url")
  );
}
