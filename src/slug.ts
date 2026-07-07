const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function randomSlug(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (const byte of bytes) {
    result += ALPHABET[byte % ALPHABET.length];
  }
  return result;
}

const SLUG_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}
