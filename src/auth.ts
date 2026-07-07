import type { Context, Next } from "hono";
import type { Env } from "./types";
import { hashToken } from "./tokens";

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}

function checkBasicAuth(c: Context<{ Bindings: Env }>): boolean {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Basic ")) return false;

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  return (
    timingSafeEqual(username, c.env.ADMIN_USERNAME) &&
    timingSafeEqual(password, c.env.ADMIN_PASSWORD)
  );
}

async function checkBearerToken(
  c: Context<{ Bindings: Env }>
): Promise<boolean> {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) return false;

  const token = header.slice(7).trim();
  if (!token) return false;

  const hash = await hashToken(token);
  const stored = await c.env.LINKS.get(`token:${hash}`);
  return stored !== null;
}

function unauthorized(c: Context) {
  return c.text("Unauthorized", 401, {
    "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"',
  });
}

/** Requires the admin username/password (HTTP Basic Auth). */
export async function basicAuth(c: Context<{ Bindings: Env }>, next: Next) {
  if (!checkBasicAuth(c)) return unauthorized(c);
  await next();
}

/** Requires either the admin login or a valid API token (Bearer). */
export async function basicOrTokenAuth(
  c: Context<{ Bindings: Env }>,
  next: Next
) {
  if ((await checkBearerToken(c)) || checkBasicAuth(c)) {
    await next();
    return;
  }
  return unauthorized(c);
}
