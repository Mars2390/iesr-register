// Proper PBKDF2-HMAC-SHA256 PIN hashing (replaces the old XOR/base64 toy hash).
// Runs in the Node.js runtime only (uses node:crypto) — login route sets
// `export const runtime = "nodejs"`. Per-PIN random salt, constant-time compare.
import { pbkdf2 as _pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2 = promisify(_pbkdf2);
const ITERATIONS = 100_000;
const KEYLEN = 32;
const DIGEST = "sha256";

export async function hashPin(pin: string, saltHex?: string, iterations = ITERATIONS) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  const dk = await pbkdf2(pin.normalize("NFKC"), salt, iterations, KEYLEN, DIGEST);
  return { hash: dk.toString("hex"), salt: salt.toString("hex"), iterations };
}

export async function verifyPin(
  pin: string, hashHex: string, saltHex: string, iterations = ITERATIONS,
): Promise<boolean> {
  const dk = await pbkdf2(pin.normalize("NFKC"), Buffer.from(saltHex, "hex"), iterations, KEYLEN, DIGEST);
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === dk.length && timingSafeEqual(expected, dk);
}
