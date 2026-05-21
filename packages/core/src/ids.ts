import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/**
 * Short, easy-to-type id (`wi replay <id>`). It does not need to be secure or
 * globally unique — just unique enough within a single user's local history.
 */
export function shortId(length = 10): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const byte of bytes) {
    out += ALPHABET[byte % ALPHABET.length] ?? "";
  }
  return out;
}
