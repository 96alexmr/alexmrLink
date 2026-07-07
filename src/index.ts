import { Hono } from "hono";
import { basicAuth, basicOrTokenAuth } from "./auth";
import { ADMIN_PAGE } from "./admin-page";
import { randomSlug, isValidSlug } from "./slug";
import { generateToken, hashToken } from "./tokens";
import type { Env, LinkMetadata, TokenMetadata } from "./types";

const app = new Hono<{ Bindings: Env }>();

const LINK_PREFIX = "link:";
const TOKEN_PREFIX = "token:";

app.get("/", (c) => c.text("link.alexmr.me"));

app.use("/admin", basicAuth);
app.get("/admin", (c) => c.html(ADMIN_PAGE));

app.get("/api/links", basicAuth, async (c) => {
  const list = await c.env.LINKS.list<LinkMetadata>({ prefix: LINK_PREFIX });
  const links = list.keys
    .map((key) => ({
      slug: key.name.slice(LINK_PREFIX.length),
      url: key.metadata?.value ?? "",
      createdAt: key.metadata?.createdAt ?? 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
  return c.json(links);
});

// Bearer token OR admin login: this is the endpoint automations (e.g. a
// Stream Deck button) hit, so it accepts a scoped API token in addition to
// the admin credentials.
app.post("/api/links", basicOrTokenAuth, async (c) => {
  const body = await c.req.json<{ url?: string; slug?: string }>().catch(() => null);
  if (!body || typeof body.url !== "string" || body.url.trim() === "") {
    return c.json({ error: "url is required" }, 400);
  }

  let url: URL;
  try {
    url = new URL(body.url.trim());
  } catch {
    return c.json({ error: "url is not a valid URL" }, 400);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return c.json({ error: "url must be http or https" }, 400);
  }

  let slug = body.slug?.trim();
  if (slug) {
    if (!isValidSlug(slug)) {
      return c.json(
        { error: "slug must be 1-64 chars of letters, numbers, - or _" },
        400
      );
    }
    const existing = await c.env.LINKS.get(LINK_PREFIX + slug);
    if (existing !== null) {
      return c.json({ error: "slug already in use" }, 409);
    }
  } else {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = randomSlug();
      const existing = await c.env.LINKS.get(LINK_PREFIX + candidate);
      if (existing === null) {
        slug = candidate;
        break;
      }
    }
    if (!slug) {
      return c.json({ error: "failed to generate a unique slug, try again" }, 500);
    }
  }

  const createdAt = Date.now();
  await c.env.LINKS.put(LINK_PREFIX + slug, url.toString(), {
    metadata: { value: url.toString(), createdAt } satisfies LinkMetadata,
  });

  return c.json({ slug, url: url.toString(), createdAt }, 201);
});

app.delete("/api/links/:slug", basicAuth, async (c) => {
  const slug = c.req.param("slug");
  const key = LINK_PREFIX + slug;
  const existing = await c.env.LINKS.get(key);
  if (existing === null) {
    return c.json({ error: "not found" }, 404);
  }
  await c.env.LINKS.delete(key);
  return c.json({ ok: true });
});

app.get("/api/tokens", basicAuth, async (c) => {
  const list = await c.env.LINKS.list<TokenMetadata>({ prefix: TOKEN_PREFIX });
  const tokens = list.keys
    .map((key) => ({
      id: key.name.slice(TOKEN_PREFIX.length),
      name: key.metadata?.name ?? "",
      createdAt: key.metadata?.createdAt ?? 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
  return c.json(tokens);
});

app.post("/api/tokens", basicAuth, async (c) => {
  const body = await c.req.json<{ name?: string }>().catch(() => null);
  const name = body?.name?.trim();
  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }

  const token = generateToken();
  const hash = await hashToken(token);
  const createdAt = Date.now();

  await c.env.LINKS.put(TOKEN_PREFIX + hash, name, {
    metadata: { name, createdAt } satisfies TokenMetadata,
  });

  // The raw token is only ever returned here, at creation time.
  return c.json({ id: hash, name, createdAt, token }, 201);
});

app.delete("/api/tokens/:id", basicAuth, async (c) => {
  const id = c.req.param("id");
  const key = TOKEN_PREFIX + id;
  const existing = await c.env.LINKS.get(key);
  if (existing === null) {
    return c.json({ error: "not found" }, 404);
  }
  await c.env.LINKS.delete(key);
  return c.json({ ok: true });
});

app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const url = await c.env.LINKS.get(LINK_PREFIX + slug);
  if (url === null) {
    return c.text("Not found", 404);
  }
  return c.redirect(url, 302);
});

export default app;
